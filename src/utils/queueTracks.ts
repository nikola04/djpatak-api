import { SoundCloudTrack } from "play-dl"
import { redisClient } from "../server"
import { v4 as uuid } from 'uuid'
import { QueueTrack, Track } from "../classes/queueTrack"

const redisTracksId = (playerId: string) => `player:${playerId}#tracks`

const soundcloudTrackToTrack = (track: any) => {
    return new Track({
        id: track.id,
        title: track.name,
        permalink: track.permalink,
        duration: track.durationInMs,
        formats: track.formats,
        thumbnail: track.thumbnail,
        user: {
            id: track.user.id,
            username: track.user.name,
            permalink: track.user.url,
            thumbnail: track.user.thumbnail
        }
    })
}

async function addTrack(playerId: string, track: SoundCloudTrack): Promise<QueueTrack>;
async function addTrack(playerId: string, ...tracks: SoundCloudTrack[]): Promise<QueueTrack[]>;
async function addTrack(playerId: string, ...tracks: SoundCloudTrack[]): Promise<QueueTrack|QueueTrack[]>{
    const queueTracks: QueueTrack[] = tracks.map((track) => new QueueTrack({ queueId: uuid(), track: soundcloudTrackToTrack(track) }))
    const stringifiedTracks = queueTracks.map((track) => JSON.stringify(track))
    await redisClient.rPush(redisTracksId(playerId), stringifiedTracks)
    return queueTracks.length == 1 ? queueTracks[0] : queueTracks
}

async function getTracksLen(playerId: string) {
    return await redisClient.lLen(redisTracksId(playerId))
}

async function getTrackByPosition(playerId: string, position: number){
    const tracks = await redisClient.lRange(redisTracksId(playerId), position, position)
    if(tracks.length < 1) return null
    const queueTrack = new QueueTrack(JSON.parse(tracks[0]))
    return queueTrack
}
/**
 * @returns track for track with id equals to queueId, prev as previous track to 'track' and next as next track to 'track'
 * @returns last song in queue as prev if queueId is null or undefined
 * @returns null for every property if queueId is not found or Queue is empty
*/
async function getTrackByQueueId(playerId: string, queueId?: string|null): Promise<{ track: QueueTrack|null, prev: QueueTrack|null, next: QueueTrack|null }>{
    const tracks = await getAllTracks(playerId)
    if(queueId === null || queueId === undefined) return ({
        prev: tracks.length > 0 ? tracks[tracks.length - 1] : null,
        track: null,
        next: null
    })
    for(let i = 0; i < tracks.length; i++){
        if(tracks[i].queueId == queueId)
            return ({
                prev: i > 0 ? tracks[i-1] : null,
                track: tracks[i],
                next: i + 1 < tracks.length ? tracks[i+1] : null
            })
    }
    return ({ prev: null, track: null, next: null })
}

async function getAllTracks(playerId: string){
    const tracks = await redisClient.lRange(redisTracksId(playerId), 0, -1)
    const queueTracks = tracks.map((track) => new QueueTrack(JSON.parse(track)))
    return queueTracks
}

export {
    getTracksLen,
    addTrack,
    getTrackByQueueId,
    getTrackByPosition,
    getAllTracks
}