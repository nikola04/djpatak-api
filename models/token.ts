import { Schema, model } from "mongoose";

export interface IToken{
    _id: Schema.Types.ObjectId,
    userId: Schema.Types.ObjectId,
    refreshToken: string,
    expiresAt: number
}

const tokenSchema = new Schema<IToken>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    refreshToken: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Number,
        default: () => Date.now() + 15811200000 // 6 months
    }
});

const TokenModel = model('tokens', tokenSchema);

export default TokenModel