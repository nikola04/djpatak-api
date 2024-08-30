import { model, Schema } from "mongoose";
import { ILikedTrack } from "types/track";

const likedTrackSchema = new Schema<ILikedTrack>({
    likedUserId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    providerId: {
        type: String,
        enum: ['soundcloud'],
        required: true
    },
    providerTrackId: {
        type: String,
        required: true
    },
    trackData: {
        title: {
            type: String,
            required: true
        },
        thumbnail: {
            type: String,
            required: true
        },
        duration: {
            type: Number,
            required: true
        },
        author: {
            type: String,
            required: true
        }
    },
    likedAt: {
        type: Date,
        default: Date.now
    }
})

const LikedTrackModel = model('likedTracks', likedTrackSchema)
export default LikedTrackModel