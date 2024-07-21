export interface SoundCloudUser {
    id: number
    username: string
    permalink: string
    thumbnail: string
}

export interface Track{
    id: number
    title: string
    permalink: string
    thumbnail: string
    duration: number
    user: SoundCloudUser
    formats: any[]
}

export interface QueueTrack {
    queueId: string
    track: Track
}