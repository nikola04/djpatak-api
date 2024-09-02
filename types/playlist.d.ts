export interface IPlaylist{
    _id: Schema.Types.ObjectId,
    ownerUserId: Schema.Types.ObjectId,
    name: string,
    description?: string,
    metadata: {
        totalSongs: number
        lastModified: Date
    }
}