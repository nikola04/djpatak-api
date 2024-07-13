import { Schema, model } from "mongoose";

const accountSchema = new Schema({
    provider: {
        type: String,
        enum: ['discord']
    },
    providerAccountId: String,
    providerAccountScopes: String,
    tokenType: String,
    accessToken: String,
    refreshToken: String,
    expiresAt: Number,
    userId: Schema.ObjectId
});

const Account = model('accounts', accountSchema);

export default Account