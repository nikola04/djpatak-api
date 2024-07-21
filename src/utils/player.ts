import { AudioPlayerStatus, createAudioPlayer, createAudioResource, NoSubscriberBehavior, VoiceConnection } from "@discordjs/voice"
import playDl, { SoundCloudTrack } from 'play-dl'
import { getTrackByQueueId } from "./queueTracks"
import { QueueTrack } from "@/classes/queueTrack"
import { PlayerPrefrences } from "types/player"

export enum PlayerState{
    QueueEnd,
    NoStream,
    Playing
}

export const initializePlayerPreferences = (): PlayerPrefrences => ({
    repeat: "off", // default value
})

function initializePlayer(playerId: string, connection: VoiceConnection, events?: {
    onQueueEnd: () => void,
    onStreamError?: () => void,
    onNextSong?: (track: QueueTrack) => void
}){
    const player = createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Pause }
    })
    player.on("stateChange", async (oldState, newState) => {
        if(oldState.status == AudioPlayerStatus.Playing && newState.status == AudioPlayerStatus.Idle){ // logic for changing tracks
            const [playerState, track] = await playNextTrack(connection, playerId)
            if(playerState == PlayerState.QueueEnd)
                return events?.onQueueEnd ? events.onQueueEnd() : null
            if(playerState == PlayerState.NoStream)
                return events?.onStreamError ? events.onStreamError() : null
            if(playerState == PlayerState.Playing)
                return events?.onNextSong ? events.onNextSong(track!) : null // only playTrack is returning Playing or NoStream so track will always be !null
        }
    })
    connection.subscribe(player)
    connection.player = player
    connection.playerPreferences = initializePlayerPreferences()
    return player
}

async function playTrack(connection: VoiceConnection, track: SoundCloudTrack){
    const stream = await playDl.stream_from_info(track).catch(err => {
        console.warn('> PlayDL Stream Error:', err)
        return null
    })
    if(!stream)
        return PlayerState.NoStream
    const resource = createAudioResource(stream.stream, { inputType: stream.type })
    connection.player?.play(resource)
    return PlayerState.Playing
}

async function playNextTrack(connection: VoiceConnection, playerId: string): Promise<[PlayerState.Playing, QueueTrack]|[PlayerState.QueueEnd, null]|[PlayerState.NoStream, QueueTrack|null]>;
async function playNextTrack(connection: VoiceConnection, playerId: string): Promise<[PlayerState, QueueTrack|null]>{
    const { track, next } = await getTrackByQueueId(playerId, connection.trackId)
    if(!next && !track){
        // track is removed from queue
    }
    if(!next){
        connection.trackId = null
        connection.player?.stop()
        return [PlayerState.QueueEnd, null]
    }
    const trackFetched = await playDl.soundcloud(`https://api.soundcloud.com/tracks/${next.track.id}`) as SoundCloudTrack
    connection.trackId = next.queueId
    if(trackFetched == null)
        return [PlayerState.NoStream, null]
    return [await playTrack(connection, trackFetched), next]
}

async function playPrevTrack(connection: VoiceConnection, playerId: string): Promise<[PlayerState.Playing, QueueTrack]|[PlayerState.QueueEnd, null]|[PlayerState.NoStream, QueueTrack|null]>;
async function playPrevTrack(connection: VoiceConnection, playerId: string): Promise<[PlayerState, QueueTrack|null]>{
    let { prev, track } = await getTrackByQueueId(playerId, connection.trackId)
    if(connection.trackId && track == null && prev == null){
        return [PlayerState.NoStream, null]
        // track doesnt exist in queue any more
    }
    if(!track && !prev){
        return [PlayerState.NoStream, null]
        // queue is clear cant find prev
    }
    if(!prev)
        prev = track
    const trackFetched = await playDl.soundcloud(`https://api.soundcloud.com/tracks/${prev?.track.id}`) as SoundCloudTrack
    connection.trackId = prev?.queueId
    if(trackFetched == null) 
        return [PlayerState.NoStream, null]
    return [await playTrack(connection, trackFetched), prev]
}

export {
    playTrack,
    playNextTrack,
    playPrevTrack,
    initializePlayer
}