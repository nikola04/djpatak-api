import { SoundCloudTrack } from "play-dl"
import { redisClient } from "../../server"
import { v4 as uuid } from 'uuid'
import { QueueTrack, scTrackToTrack } from "../classes/queueTrack"

const redisTracksId = (playerId: string) => `player:${playerId}#tracks`

/**
 * Add track to redis queue
 * @returns Number of tracks in queue
 */
async function addTrack(playerId: string, ...tracks: SoundCloudTrack[]){
    const stringifiedTracks = tracks.map((track) => JSON.stringify({ queueId: uuid(), track: {
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
    }}))
    return await redisClient.rPush(redisTracksId(playerId), stringifiedTracks)
}

async function getTracksLen(playerId: string) {
    return await redisClient.lLen(redisTracksId(playerId))
}

async function getTrackById(playerId: string, trackId: number){
    const tracks = await redisClient.lRange(redisTracksId(playerId), trackId, trackId)
    if(tracks.length < 1) return null
    const queueTrack = new QueueTrack(JSON.parse(tracks[0]))
    return queueTrack
}

async function getAllTracks(playerId: string){
    const tracks = await redisClient.lRange(redisTracksId(playerId), 0, -1)
    const queueTracks = tracks.map((track) => new QueueTrack(JSON.parse(track)))
    return queueTracks
}

export {
    getTracksLen,
    addTrack,
    getTrackById,
    getAllTracks
}