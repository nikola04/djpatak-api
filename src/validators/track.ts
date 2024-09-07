/* eslint-disable @typescript-eslint/no-explicit-any */
import { TrackProvider } from '@/enums/providers';
import { so_validate } from 'play-dl';
import { DbTrack, QueueTrack, TrackAuthor } from 'types/track';

export const isValidProvider = (str: any): str is TrackProvider => {
	return typeof str === 'string' && Object.values(TrackProvider).includes(str as TrackProvider);
};

export const isQueueTrack = (obj: any): obj is QueueTrack => {
	return typeof obj === 'object' && obj !== null && typeof obj.queueId === 'string' && isDbTrack(obj);
};

export const isDbTrack = (obj: any): obj is DbTrack => {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		typeof obj.providerId === 'string' &&
		typeof obj.providerTrackId === 'string' &&
		typeof obj.data === 'object' &&
		obj.data !== null &&
		typeof obj.data.title === 'string' &&
		typeof obj.data.permalink === 'string' &&
		typeof obj.data.durationInSec === 'number' &&
		obj.authors !== null &&
		Array.isArray(obj.authors) &&
		obj.authors.every(isTrackAuthor)
	);
};

export const isTrackAuthor = (obj: any): obj is TrackAuthor => {
	return typeof obj === 'object' && obj !== null && typeof obj.username === 'string' && typeof obj.permalink === 'string';
};

export async function validateTrackId(id: string): Promise<boolean> {
	return (await so_validate(id)) == 'track';
}
