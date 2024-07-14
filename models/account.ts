import { Schema, model } from "mongoose";

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

const accountSchema = new Schema<IAccount>({
    provider: {
        type: String,
        enum: ['discord'],
        required: true
    },
    providerAccountId: {
        type: String,
        required: true
    },
    providerAccountScopes: {
        type: String,
        required: true
    },
    tokenType: {
        type: String,
        required: true
    },
    accessToken: {
        type: String,
        required: true
    },
    refreshToken: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Number,
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

const AccountModel = model('accounts', accountSchema);

export default AccountModel