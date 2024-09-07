import { TrackProvider } from '@/enums/providers';
import { Schema } from 'mongoose';

export interface TrackAuthor {
	username: string;
	permalink: string;
}

export interface DbTrack {
	providerId: TrackProvider;
	providerTrackId: string;
	data: {
		title: string;
		permalink: string;
		thumbnail?: string;
		durationInSec: number;
	};
	authors: TrackAuthor[];
}

export interface QueueTrack extends DbTrack {
	queueId: string;
}

export interface ILikedTrack extends DbTrack {
	_id: Schema.Types.ObjectId;
	likedUserId: Schema.Types.ObjectId;
	likedAt: Date;
}

export interface IPlaylistTrack extends DbTrack {
	_id: Schema.Types.ObjectId;
	playlistId: Schema.Types.ObjectId;
	addedAt: Date;
}
