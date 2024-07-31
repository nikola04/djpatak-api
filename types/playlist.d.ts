export interface IPlaylist{
    _id: Schema.Types.ObjectId,
    ownerUserId: Schema.Types.ObjectId,
    name: string,
    metadata: {
        totalSongs: number
        lastModified: Date
    }
}