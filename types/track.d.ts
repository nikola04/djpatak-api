export type DbTrack = {
    providerId: string,
    providerTrackId: string,
    trackData: {
        title: string,
        duration: number,
        author: string
    }
}

export interface ILikedTrack extends DbTrack{
    _id: Schema.Types.ObjectId,
    likedUserId: Schema.Types.ObjectId,
    likedAt: Date
}