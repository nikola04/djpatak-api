import { model, Schema } from "mongoose";
import { IPlaylistTrack } from "types/track";

const playlistTrackSchema = new Schema<IPlaylistTrack>({
    playlistId: {
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
    addedAt: {
        type: Date,
        default: Date.now
    }
})

const LikedTrackModel = model('playlistTracks', playlistTrackSchema)
export default LikedTrackModel