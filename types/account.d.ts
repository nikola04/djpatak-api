export interface IAccount{
    _id: Schema.Types.ObjectId;
    provider: string,
    providerAccountId: string,
    providerAccountScopes: string,
    tokenType: string,
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
    userId: Schema.Types.ObjectId
}