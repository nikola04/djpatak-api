/* eslint-disable @typescript-eslint/no-explicit-any */
import { so_validate } from "play-dl";
import { QueueTrack, SoundCloudUser, Track } from "types/queue";
import { DbTrack } from "types/track";

export const isSoundCloudUser = (obj: any): obj is SoundCloudUser => {
    return typeof obj === 'object'
        && obj !== null
        && typeof obj.id === 'number'
        && typeof obj.username === 'string'
        && typeof obj.permalink === 'string'
        && typeof obj.thumbnail === 'string';
}

export const isTrack = (obj: any): obj is Track => {
    return typeof obj === 'object'
        && obj !== null
        && typeof obj.id === 'number'
        && typeof obj.title === 'string'
        && typeof obj.permalink === 'string'
        && typeof obj.thumbnail === 'string'
        && typeof obj.duration === 'number'
        && isSoundCloudUser(obj.user)
        && Array.isArray(obj.formats);
}

export const isQueueTrack = (obj: any): obj is QueueTrack => {
    return typeof obj === 'object'
        && obj !== null
        && typeof obj.queueId === 'string'
        && isTrack(obj.track);
}

export const isDbTrack = (obj: any): obj is DbTrack => {
    return typeof obj === 'object' 
        && obj !== null
        && typeof obj.providerId === 'string'
        && typeof obj.providerTrackId === 'string'
        && typeof obj.trackData === 'object'
        && obj.trackData !== null
        && typeof obj.trackData.title === 'string'
        && typeof obj.trackData.duration === 'number'
        && typeof obj.trackData.author === 'string'
}

export async function validateTrackId(id: string): Promise<boolean>{
    return await so_validate(id) == 'track'
}