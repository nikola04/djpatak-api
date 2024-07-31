import { Schema, model } from "mongoose";
import { IAccount } from "types/account";

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