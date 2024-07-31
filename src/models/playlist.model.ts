import { model, Schema } from "mongoose";
import { IPlaylist } from "types/playlist";

const playlistSchema = new Schema<IPlaylist>({
    ownerUserId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    metadata: {
        totalSongs: { type: Number, default: 0 },
        lastModified: { type: Date, default: Date.now }
    }
})

const PlaylistModel = model('playlists', playlistSchema)
export default PlaylistModel