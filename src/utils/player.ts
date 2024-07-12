import { AudioPlayerStatus, createAudioPlayer, createAudioResource, NoSubscriberBehavior, VoiceConnection } from "@discordjs/voice"
import playDl, { SoundCloudTrack } from 'play-dl'
import { getTrackById, getTracksLen } from "./queueTracks"

export enum PlayerState{
    QueueEnd,
    NoStream,
    Playing
}

function initializePlayer(playerId: string, connection: VoiceConnection, events?: {
    onQueueEnd: () => void,
    onStreamError?: () => void,
    onNextSong?: (track: SoundCloudTrack) => void
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
    return player
}

async function playTrack(connection: VoiceConnection, playerId: string, track: SoundCloudTrack){
    const stream = await playDl.stream_from_info(track).catch(err => {
        console.warn('> PlayDL Stream Error:', err)
        return null
    })
    if(!stream)
        return PlayerState.NoStream
    if(connection.trackId == null) connection.trackId = await getTracksLen(playerId)
    const resource = createAudioResource(stream.stream, { inputType: stream.type })
    connection.player?.play(resource)
    return PlayerState.Playing
}

async function playNextTrack(connection: VoiceConnection, playerId: string): Promise<[PlayerState, SoundCloudTrack|null]>{
    if(connection.trackId == null) connection.trackId = 0
    if(connection.trackId + 1 == await getTracksLen(playerId)) {
        connection.player?.stop()
        return [PlayerState.QueueEnd, null]
    }
    const trackId = ++connection.trackId
    const queueTrack = await getTrackById(playerId, trackId)
    if(queueTrack == null)
        return [PlayerState.QueueEnd, null]
    const trackFetched = await playDl.soundcloud(`https://api.soundcloud.com/tracks/${queueTrack.track.id}`) as SoundCloudTrack
    if(trackFetched == null) 
        return [PlayerState.NoStream, null]
    return [await playTrack(connection, playerId, trackFetched), trackFetched]
}

async function playPrevTrack(connection: VoiceConnection, playerId: string): Promise<[PlayerState, SoundCloudTrack|null]>{
    if(connection.trackId == null) connection.trackId = 0
    if(connection.trackId > 0) connection.trackId--;
    const trackId = connection.trackId
    const queueTrack = await getTrackById(playerId, trackId)
    if(queueTrack == null)
        return [PlayerState.QueueEnd, null]
    const trackFetched = await playDl.soundcloud(`https://api.soundcloud.com/tracks/${queueTrack.track.id}`) as SoundCloudTrack
    if(trackFetched == null) 
        return [PlayerState.NoStream, null]
    return [await playTrack(connection, playerId, trackFetched), trackFetched]
}

export {
    playTrack,
    playNextTrack,
    playPrevTrack,
    initializePlayer
}