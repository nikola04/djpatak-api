import { AudioPlayerStatus, createAudioPlayer, createAudioResource, NoSubscriberBehavior, VoiceConnection } from "@discordjs/voice"
import playDl, { SoundCloudTrack } from 'play-dl'
import { getTrackByPosition, getTrackByQueueId } from "./queueTracks"
import { PlayerPrefrences, VolumeTransformer } from "types/player"
import { QueueTrack } from "types/queue"
import { VolumeI } from "types/player"
import { emitEvent } from "./sockets"

export enum PlayerState{
    QueueEnd,
    NoStream,
    NoTrack,
    Playing
}

class Volume implements VolumeI{
    private volume: number
    private resourceVolume: VolumeTransformer|null
    constructor(volume: number){
        this.volume = volume
        this.resourceVolume = null
    }
    setVolume(volume: number){
        if(this.resourceVolume)
            this.resourceVolume.setVolume(volume)
        this.volume = volume
    }
    getVolume(){
        return this.volume
    }
    setVolumeResource(volumeObj: VolumeTransformer|null){
        this.resourceVolume = volumeObj
    }
}

export const initializePlayerPreferences = (): PlayerPrefrences => ({
    repeat: "off", // default value
    volume: new Volume(1)
})

export const initializeDefaultPlayerEvents = (playerId: string) => ({ 
    onQueueEnd: () => emitEvent('queue-end', playerId),
    onNoTrackError: () => emitEvent('no-queue-track', playerId),
    onStreamError: () => null,
    onNextSong: (queueTrack: QueueTrack) => emitEvent('now-playing', playerId, queueTrack)
})

function initializePlayer(playerId: string, connection: VoiceConnection, events?: {
    onQueueEnd: () => void,
    onStreamError?: () => void,
    onNoTrackError?: () => void,
    onNextSong?: (track: QueueTrack) => void
}){
    const player = createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Pause }
    })
    player.on("stateChange", async (oldState, newState) => {
        if(oldState.status == AudioPlayerStatus.Playing && newState.status == AudioPlayerStatus.Idle){ // logic for changing tracks
            const playTrackResp = (connection.playerPreferences?.repeat === 'track') ?
                await playTrackByQueueId(connection, playerId, connection.trackId)
                : await playNextTrack(connection, playerId)
            if(playTrackResp.state == PlayerState.QueueEnd){
                //try
                const repeatResp = await playQueueFromStart(connection, playerId)
                if(repeatResp && repeatResp.state == PlayerState.Playing){
                    return events?.onNextSong ? events.onNextSong(repeatResp.track) : null
                }
                return events?.onQueueEnd ? events.onQueueEnd() : null
            }
            if(playTrackResp.state == PlayerState.NoStream)
                return events?.onStreamError ? events.onStreamError() : null
            if(playTrackResp.state == PlayerState.NoTrack)
                return events?.onNoTrackError ? events.onNoTrackError() : null
            if(playTrackResp.state == PlayerState.Playing){
                return events?.onNextSong ? events.onNextSong(playTrackResp.track) : null
            }
        }
    })
    connection.subscribe(player)
    connection.playerPreferences = initializePlayerPreferences()
    connection.player = player
    return player
}

async function playQueueFromStart(connection: VoiceConnection, playerId: string): Promise<{ state: PlayerState.Playing, track: QueueTrack }| { state: Exclude<PlayerState, PlayerState.Playing>, track: null }|false>{
    if(connection.playerPreferences?.repeat != 'queue') return false
    const firstTrack = await getTrackByPosition(playerId, 0)
    if(!firstTrack) return ({ state: PlayerState.QueueEnd, track: null })
    const playerState = await playQueueTrack(connection, firstTrack)
    if(playerState == PlayerState.Playing)
        return ({ state: playerState, track: firstTrack })
    return ({ state: playerState, track: null })
}

async function playTrack(connection: VoiceConnection, track: SoundCloudTrack): Promise<PlayerState.NoStream|PlayerState.Playing>{
    try{
        const stream = await playDl.stream_from_info(track).catch(err => {
            console.warn('> PlayDL Stream Error:', err)
            return null
        })
        if(!stream)
            return PlayerState.NoStream
        const resource = createAudioResource(stream.stream, { inputType: stream.type, inlineVolume: true })
        if(resource.volume && connection.playerPreferences){
            connection.playerPreferences.volume.setVolumeResource(resource.volume) // set vol change func
            resource.volume.setVolume(connection.playerPreferences.volume.getVolume()) // update vol
        }else connection.playerPreferences?.volume.setVolumeResource(null)
        connection.player?.play(resource)
        return PlayerState.Playing
    }catch(err){
        console.error('error playing track:', err)
        return PlayerState.NoStream
    }
}

async function playQueueTrack(connection: VoiceConnection, queueTrack: QueueTrack){
    const trackFetched = await playDl.soundcloud(`https://api.soundcloud.com/tracks/${queueTrack.track.id}`) as SoundCloudTrack
    connection.trackId = queueTrack.queueId
    if(trackFetched == null)
        return PlayerState.NoStream
    return await playTrack(connection, trackFetched)
}

async function playTrackByQueueId(connection: VoiceConnection, playerId: string, queueId?: string|null): Promise<{ state: PlayerState.Playing, track: QueueTrack }| { state: Exclude<PlayerState, PlayerState.Playing|PlayerState.QueueEnd>, track: null }>{
    if(!queueId) return ({ state: PlayerState.NoTrack, track: null })
    const { track } = await getTrackByQueueId(playerId, queueId)
    if(!track)
        return ({ state: PlayerState.NoTrack, track: null })
    const newState = await playQueueTrack(connection, track)
    if(newState == PlayerState.Playing)
        return ({ state: PlayerState.Playing, track })
    return ({ state: newState, track: null })
}

async function playNextTrack(connection: VoiceConnection, playerId: string): Promise<{ state: PlayerState.Playing, track: QueueTrack }| { state: Exclude<PlayerState, PlayerState.Playing>, track: null }>{
    const { track, next } = await getTrackByQueueId(playerId, connection.trackId)
    if(!next && !track){
        // track is removed from queue
        return ({ state: PlayerState.NoTrack, track: null })
    }
    if(!next){
        connection.trackId = null
        connection.player?.stop()
        return ({ state: PlayerState.QueueEnd, track: null })
    }
    const newState = await playQueueTrack(connection, next)
    if(newState == PlayerState.Playing) 
        return ({ state: PlayerState.Playing, track: next })
    return ({ state: newState, track: null })
}
async function playPrevTrack(connection: VoiceConnection, playerId: string): Promise<{ state: PlayerState.Playing, track: QueueTrack }| { state: Exclude<PlayerState, PlayerState.Playing>, track: null }>{
    // eslint-disable-next-line prefer-const
    let { prev, track } = await getTrackByQueueId(playerId, connection.trackId)
    prev ||= track // if prev doesnt exist(current is first song in queue) take current song
    if(!prev)
        return ({ state: PlayerState.NoTrack, track: null })
    const newState = await playQueueTrack(connection, prev)
    if(newState == PlayerState.Playing) 
        return ({ state: PlayerState.Playing, track: prev })
    return ({ state: newState, track: null })
}

export {
    playTrack,
    playNextTrack,
    playPrevTrack,
    playTrackByQueueId,
    initializePlayer
}