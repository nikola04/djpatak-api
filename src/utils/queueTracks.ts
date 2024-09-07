import { SoundCloudTrack } from 'play-dl';
import { redisClient } from '@/server';
import { v4 as uuid } from 'uuid';
import { isDbTrack, isQueueTrack } from '@/validators/track';
import queueConfig from '@/configs/queue.config.json';
import { DbTrack, QueueTrack } from 'types/track';
import { TrackProvider } from '@/enums/providers';

const redisQueueKeyByPlayerId = (playerId: string) => `player:${playerId}#queue`;

const dbTrackToQueueTrack = (track: DbTrack): QueueTrack => ({
	queueId: uuid(),
	...track,
});
export const scTrackToDbTrack = (track: SoundCloudTrack): DbTrack => ({
	providerId: TrackProvider.soundcloud,
	providerTrackId: track.permalink,
	data: {
		title: track.name,
		permalink: track.permalink,
		thumbnail: track.thumbnail,
		durationInSec: track.durationInSec,
	},
	authors: [
		{
			username: track.user.name,
			permalink: track.user.url,
		},
	],
});
const scTrackToQueueTrack = (track: SoundCloudTrack): QueueTrack => ({
	queueId: uuid(),
	...scTrackToDbTrack(track),
});
const convertToQueueTrack = (track: DbTrack | SoundCloudTrack) => {
	if (isDbTrack(track)) return dbTrackToQueueTrack(track);
	return scTrackToQueueTrack(track);
};

async function addTracks(playerId: string, ...tracks: SoundCloudTrack[] | DbTrack[]): Promise<QueueTrack[]> {
	const queueTracks = tracks.map(convertToQueueTrack);
	const stringifiedTracks = queueTracks.map((track) => JSON.stringify(track));
	await redisClient.rPush(redisQueueKeyByPlayerId(playerId), stringifiedTracks);
	return queueTracks;
}

async function getTracksLen(playerId: string) {
	return await redisClient.lLen(redisQueueKeyByPlayerId(playerId));
}

async function isQueueFull(playerId: string) {
	return (await getTracksLen(playerId)) >= queueConfig.maxQueueSize;
}

async function removeTrackByQueueId(playerId: string, queueId: string): Promise<boolean> {
	const tracks = await redisClient.lRange(redisQueueKeyByPlayerId(playerId), 0, -1);
	let trackString = null;
	for (let i = 0; i < tracks.length; i++) {
		if (JSON.parse(tracks[i]).queueId != queueId) continue;
		trackString = tracks[i];
		break;
	}
	if (!trackString) return false;
	await redisClient.lRem(redisQueueKeyByPlayerId(playerId), 1, trackString);
	return true;
}

/**
 * @returns track for track with id equals to queueId, prev as previous track to 'track' and next as next track to 'track'
 * @returns last song in queue as prev if queueId is null or undefined
 * @returns null for every property if queueId is not found or Queue is empty
 */
async function getTrackByQueueId(
	playerId: string,
	queueId?: string | null
): Promise<{
	track: QueueTrack | null;
	prev: QueueTrack | null;
	next: QueueTrack | null;
}> {
	const tracks = await getAllTracks(playerId);
	if (queueId === null || queueId === undefined)
		return {
			prev: tracks.length > 0 ? tracks[tracks.length - 1] : null,
			track: null,
			next: null,
		};
	for (let i = 0; i < tracks.length; i++) {
		const track = tracks[i];
		if (track.queueId == queueId)
			return {
				prev: i > 0 ? tracks[i - 1] : null,
				track,
				next: i + 1 < tracks.length ? tracks[i + 1] : null,
			};
	}
	return { prev: null, track: null, next: null };
}

async function getTrackByPosition(playerId: string, position: number) {
	const tracks = await redisClient.lRange(redisQueueKeyByPlayerId(playerId), position, position);
	if (tracks.length < 1) return null;
	const queueTrack = JSON.parse(tracks[0]);
	if (!isQueueTrack(queueTrack)) return null;
	return queueTrack;
}

async function getAllTracks(playerId: string) {
	const tracks = await redisClient.lRange(redisQueueKeyByPlayerId(playerId), 0, -1);
	const queueTracks: QueueTrack[] = [];
	tracks.forEach((track) => {
		const parsed = JSON.parse(track);
		if (isQueueTrack(parsed)) queueTracks.push(parsed);
	});
	return queueTracks;
}

async function deleteQueue(playerId: string) {
	await redisClient.del(redisQueueKeyByPlayerId(playerId));
}

export { getTracksLen, addTracks, isQueueFull, deleteQueue, getTrackByQueueId, removeTrackByQueueId, getTrackByPosition, getAllTracks };
