export type SoundcloudTrack = {
    id: number;
    title: string;
    permalink_url: string;
    artwork_url?: string,
    duration: number;
    formats: any[];
    type: 'track' | 'playlist',
    user: {
        id: number,
        username: string,
        permalink_url: string
    },
    user_id: number
}