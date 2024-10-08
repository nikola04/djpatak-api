import { AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, NoSubscriberBehavior, VoiceConnection } from '@discordjs/voice';
import playDl, { SoundCloudTrack } from 'play-dl';
import { getTrackByPosition, getTrackByQueueId } from './queueTracks';
import { PlayerPrefrences, VolumeTransformer } from 'types/player';
import { VolumeI } from 'types/player';
import { emitEvent } from './sockets';
import { QueueTrack } from 'types/track';
import { TrackProvider } from '@/enums/providers';

export enum PlayerState {
	QueueEnd,
	NoStream,
	NoTrack,
	Playing,
}

class Volume implements VolumeI {
	private volume: number;
	private resourceVolume: VolumeTransformer | null;
	constructor(volume: number) {
		this.volume = volume;
		this.resourceVolume = null;
	}
	setVolume(volume: number) {
		if (this.resourceVolume) this.resourceVolume.setVolume(volume);
		this.volume = volume;
	}
	getVolume() {
		return this.volume;
	}
	setVolumeResource(volumeObj: VolumeTransformer | null) {
		this.resourceVolume = volumeObj;
	}
}

export const initializePlayerPreferences = (): PlayerPrefrences => ({
	repeat: 'off', // default value
	volume: new Volume(1),
});

export const initializeDefaultPlayerEvents = (playerId: string) => ({
	onQueueEnd: () => emitEvent('queue-end', playerId),
	onNoTrackError: () => emitEvent('no-queue-track', playerId),
	onStreamError: () => null,
	onNextSong: (queueTrack: QueueTrack) => emitEvent('now-playing', playerId, queueTrack),
});

function initializePlayer(
	playerId: string,
	connection: VoiceConnection,
	events?: {
		onQueueEnd: () => void;
		onStreamError?: () => void;
		onNoTrackError?: () => void;
		onNextSong?: (track: QueueTrack) => void;
	}
) {
	const player = createAudioPlayer({
		behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
	});
	let timeout: null | NodeJS.Timeout = null;
	player.on('stateChange', async (oldState, newState) => {
		if (newState.status == AudioPlayerStatus.Idle) {
			if (!timeout)
				timeout = setTimeout(() => {
					connection.disconnect();
				}, 300_000); // 5 minutes
		} else if (newState.status == AudioPlayerStatus.Playing) {
			if (timeout) {
				clearTimeout(timeout);
				timeout = null;
			}
		}
		if (oldState.status == AudioPlayerStatus.Playing && newState.status == AudioPlayerStatus.Idle) {
			// logic for changing tracks
			const playTrackResp =
				connection.playerPreferences?.repeat === 'track'
					? await playTrackByQueueId(connection, playerId, connection.trackId)
					: await playNextTrack(connection, playerId);
			if (playTrackResp.state == PlayerState.QueueEnd) {
				//try
				const repeatResp = await playQueueFromStart(connection, playerId);
				if (repeatResp && repeatResp.state == PlayerState.Playing) {
					return events?.onNextSong ? events.onNextSong(repeatResp.track) : null;
				}
				return events?.onQueueEnd ? events.onQueueEnd() : null;
			}
			if (playTrackResp.state == PlayerState.NoStream) return events?.onStreamError ? events.onStreamError() : null;
			if (playTrackResp.state == PlayerState.NoTrack) return events?.onNoTrackError ? events.onNoTrackError() : null;
			if (playTrackResp.state == PlayerState.Playing) {
				return events?.onNextSong ? events.onNextSong(playTrackResp.track) : null;
			}
		}
	});
	connection.subscribe(player);
	connection.playerId = playerId;
	connection.playerPreferences = initializePlayerPreferences();
	connection.player = player;
	return player;
}

async function playQueueFromStart(
	connection: VoiceConnection,
	playerId: string
): Promise<{ state: PlayerState.Playing; track: QueueTrack } | { state: Exclude<PlayerState, PlayerState.Playing>; track: null } | false> {
	if (connection.playerPreferences?.repeat != 'queue') return false;
	const firstTrack = await getTrackByPosition(playerId, 0);
	if (!firstTrack) return { state: PlayerState.QueueEnd, track: null };
	const playerState = await playQueueTrack(connection, firstTrack);
	if (playerState == PlayerState.Playing) return { state: playerState, track: firstTrack };
	return { state: playerState, track: null };
}

async function playTrack(connection: VoiceConnection, track: SoundCloudTrack): Promise<PlayerState.NoStream | PlayerState.Playing> {
	try {
		let resource: AudioResource | null = null;
		if (track instanceof SoundCloudTrack) resource = await getScTrackResource(track);
		if (!resource) return PlayerState.NoStream;

		if (resource.volume && connection.playerPreferences) {
			connection.playerPreferences.volume.setVolumeResource(resource.volume); // set vol change func
			resource.volume.setVolume(connection.playerPreferences.volume.getVolume()); // update vol
		} else connection.playerPreferences?.volume.setVolumeResource(null);
		connection.player?.play(resource);
		return PlayerState.Playing;
	} catch (err) {
		console.error('Error playing Track:', err);
		return PlayerState.NoStream;
	}
}

async function getScTrackResource(track: SoundCloudTrack): Promise<AudioResource | null> {
	try {
		const stream = await playDl.stream_from_info(track).catch((err) => {
			console.warn('> PlayDL Soundcloud Stream Error:', err);
			return null;
		});
		if (!stream) return null;
		const resource = createAudioResource(stream.stream, {
			inputType: stream.type,
			inlineVolume: true,
		});
		return resource;
	} catch (_) {
		return null;
	}
}

export async function playQueueTrack(connection: VoiceConnection, queueTrack: QueueTrack) {
	let trackFetched = null;
	if (queueTrack.providerId === TrackProvider.soundcloud) trackFetched = (await playDl.soundcloud(queueTrack.providerTrackId)) as SoundCloudTrack;
	connection.trackId = queueTrack.queueId;
	if (trackFetched == null) return PlayerState.NoStream;
	return await playTrack(connection, trackFetched);
}

async function playTrackByQueueId(
	connection: VoiceConnection,
	playerId: string,
	queueId?: string | null
): Promise<
	| { state: PlayerState.Playing; track: QueueTrack }
	| {
			state: Exclude<PlayerState, PlayerState.Playing | PlayerState.QueueEnd>;
			track: null;
	  }
> {
	if (!queueId) return { state: PlayerState.NoTrack, track: null };
	const { track } = await getTrackByQueueId(playerId, queueId);
	if (!track) return { state: PlayerState.NoTrack, track: null };
	const newState = await playQueueTrack(connection, track);
	if (newState == PlayerState.Playing) return { state: PlayerState.Playing, track };
	return { state: newState, track: null };
}

async function playNextTrack(
	connection: VoiceConnection,
	playerId: string
): Promise<{ state: PlayerState.Playing; track: QueueTrack } | { state: Exclude<PlayerState, PlayerState.Playing>; track: null }> {
	const { track, next } = await getTrackByQueueId(playerId, connection.trackId);
	if (!next && !track) {
		// track is removed from queue
		return { state: PlayerState.NoTrack, track: null };
	}
	if (!next) {
		connection.trackId = null;
		connection.player?.stop();
		return { state: PlayerState.QueueEnd, track: null };
	}
	const newState = await playQueueTrack(connection, next);
	if (newState == PlayerState.Playing) return { state: PlayerState.Playing, track: next };
	return { state: newState, track: null };
}
async function playPrevTrack(
	connection: VoiceConnection,
	playerId: string
): Promise<{ state: PlayerState.Playing; track: QueueTrack } | { state: Exclude<PlayerState, PlayerState.Playing>; track: null }> {
	// eslint-disable-next-line prefer-const
	let { prev, track } = await getTrackByQueueId(playerId, connection.trackId);
	prev ||= track; // if prev doesnt exist(current is first song in queue) take current song
	if (!prev) return { state: PlayerState.NoTrack, track: null };
	const newState = await playQueueTrack(connection, prev);
	if (newState == PlayerState.Playing) return { state: PlayerState.Playing, track: prev };
	return { state: newState, track: null };
}

export { playTrack, playNextTrack, playPrevTrack, playTrackByQueueId, initializePlayer };
