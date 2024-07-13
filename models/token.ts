import { Schema, model } from "mongoose";

const tokenSchema = new Schema({
    userId: {
        type: Schema.ObjectId,
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

const Token = model('tokens', tokenSchema);

export default Token