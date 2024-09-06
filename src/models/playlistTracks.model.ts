import { model, Schema } from 'mongoose';
import { IPlaylistTrack } from 'types/track';

const playlistTrackSchema = new Schema<IPlaylistTrack>({
	playlistId: {
		type: Schema.Types.ObjectId,
		required: true,
	},
	providerId: {
		type: String,
		enum: ['soundcloud'],
		required: true,
	},
	providerTrackId: {
		type: String,
		required: true,
	},
	data: {
		title: {
			type: String,
			required: true,
		},
		permalink: {
			type: String,
			required: true,
		},
		thumbnail: {
			type: String,
			required: true,
		},
		durationInSec: {
			type: Number,
			required: true,
		},
	},
	authors: [
		{
			username: { type: String, required: true },
			permalink: { type: String, required: true },
		},
	],
	addedAt: {
		type: Date,
		default: Date.now,
	},
});

const PlaylistTrackModel = model('playlistTracks', playlistTrackSchema);
export default PlaylistTrackModel;
