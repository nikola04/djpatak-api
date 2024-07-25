export interface SoundCloudUser {
    id: string
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formats: any[]
}

export interface QueueTrack {
    queueId: string
    track: Track
}