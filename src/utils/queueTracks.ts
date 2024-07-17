import { SoundCloudTrack } from "play-dl"
import { redisClient } from "../../server"
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