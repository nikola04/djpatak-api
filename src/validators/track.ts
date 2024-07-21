import { QueueTrack, SoundCloudUser, Track } from "types/queue";

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