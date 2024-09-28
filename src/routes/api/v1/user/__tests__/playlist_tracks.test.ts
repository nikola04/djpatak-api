import app from '@/app';
import { TrackProvider } from '@/enums/providers';
import PlaylistModel from '@/models/playlist.model';
import PlaylistTrackModel from '@/models/playlistTracks.model';
import { isValidProvider, validateTrackId } from '@/validators/track';
import { Request, Response, NextFunction } from 'express';
import { soundcloud, SoundCloudTrack } from 'play-dl';
import request from 'supertest';

jest.mock('@/server', () => ({
	botClient: null,
	redisClient: null,
}));
jest.mock('@/middlewares/ratelimit', () => ({
	ratelimit: jest.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
}));
jest.mock('@/middlewares/authenticate', () => ({
	authenticate: jest.fn(() => (req: Request, _res: Response, next: NextFunction) => {
		req.userId = 'valid_user_id';
		next();
	}),
}));
jest.mock('play-dl')
jest.mock('@/validators/track')
jest.mock('@/models/playlist.model');
jest.mock('@/models/playlistTracks.model');

const validObjectId = '551137c2f9e1fac808a5f572';
const mockPlaylist = {
	ownerUserId: 'valid_user_id',
	name: 'foo',
	description: 'bar',
};
const mockPlaylistTrack = {
	playlistId: validObjectId,
	providerId: 'valid_provider',
	providerTrackId: 'valid_track_id',
	data: {},
	authors: [],
};

const expectStatusAndError = (response: request.Response, status: number, error: string) => {
	expect(response.status).toBe(status);
	expect(response.body.error).toBe(error);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _spyOnFindWithLean = (model: any, method: 'find' | 'findOne' | 'findOneAndUpdate' | 'findById', value: unknown, rejected: boolean = false) => {
	const type = !rejected ? 'mockResolvedValue' : 'mockRejectedValue';
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	jest.spyOn(model, method).mockReturnValue({ lean: jest.fn()[type](value) } as any);
};
const spyOnFindWithLean = (method: 'find' | 'findOne' | 'findOneAndUpdate' | 'findById', value: unknown, rejected: boolean = false) =>
	_spyOnFindWithLean(PlaylistModel, method, value, rejected);
const spyOnFindTracksWithLean = (method: 'find' | 'findOne' | 'findOneAndUpdate' | 'findById', value: unknown, rejected: boolean = false) =>
	_spyOnFindWithLean(PlaylistTrackModel, method, value, rejected);

describe('GET /users/me/playlists/:id/tracks', () => {
	const mockRequest = async (playlistId: string) => request(app).get(`/api/v1/users/me/playlists/${playlistId}/tracks`);

	it('should return 400 when id is not valid', async () => {
		const response = await mockRequest('invalid_object_id');
		expectStatusAndError(response, 400, 'Playlist ID is Not Valid');
	});
	it('should return 404 when playlist is not found', async () => {
		spyOnFindWithLean('findById', null);
		const response = await mockRequest(validObjectId);
		expectStatusAndError(response, 404, "That Playlist doesn't exist");
	});
	it('should return 403 when not playlist owner', async () => {
		spyOnFindWithLean('findById', { ...mockPlaylist, ownerUserId: 'other_user_id' });
		const response = await mockRequest(validObjectId);
		expectStatusAndError(response, 403, "You don't own that Playlist");
	});
	it('should return 500 when database error', async () => {
		spyOnFindWithLean('findById', new Error('Database Error'), true);
		const response = await mockRequest(validObjectId);
		expectStatusAndError(response, 500, 'Internal Server Error');
	});
	it('should return 200 with playlist and track when success', async () => {
		spyOnFindWithLean('findById', { ...mockPlaylist });
		spyOnFindTracksWithLean('find', [mockPlaylistTrack]);
		const response = await mockRequest(validObjectId);
		expect(response.status).toBe(200);
		expect(response.body.playlist).toMatchObject(mockPlaylist);
		expect(response.body.tracks).toMatchObject([mockPlaylistTrack]);
	});
});

describe('POST /users/me/playlist/:id/tracks', () => {
	const validProviderId = TrackProvider.soundcloud;
	const validTrackId = 'valid_track_id';
	const mockRequest = async (playlistId: string = validObjectId, providerId: string = validProviderId, trackId: string = validTrackId) => 
		request(app).post(`/api/v1/users/me/playlists/${playlistId}/tracks`).send({
			providerId,
			trackId
		});
	beforeAll(() => {
		jest.mocked(isValidProvider).mockImplementation((trackId: string) => trackId === validProviderId)
		jest.mocked(validateTrackId).mockImplementation((trackId: string) => Promise.resolve(trackId === validTrackId))
		jest.mocked(soundcloud).mockImplementation((trackId: string) => {
			if(trackId !== validTrackId) throw new Error('Invalid Track ID')
			return Promise.resolve({
				name: 'foo',
				permalink: 'bar',
				thumbnail: 'baz',
				durationInSec: 10,
				user: {
					name: 'user_name',
					url: 'user_url',
				}
			} as SoundCloudTrack)
		})
	})
	it('should return 400 when playlist id is not valid', async () => {
		const response = await mockRequest('invalid_object_id');
		expectStatusAndError(response, 400, 'Playlist ID is not valid');
	})
	it('should return 400 when provider id is not valid', async () => {
		const response = await mockRequest(validObjectId, 'invalid_provider_id');
		expectStatusAndError(response, 400, 'Provider ID is not valid');
	})
	it('should return 400 when track id is not valid', async () => {
		const response = await mockRequest(validObjectId, validProviderId, 'invalid_track_id');
		expectStatusAndError(response, 400, 'Track ID is not valid');
	})
	// TODO: Fix this test and add more cases
	// it('should return 404 when playlist is not found', async () => {
	// 	spyOnFindWithLean('findById', null);
	// 	const response = await mockRequest();
	// 	expectStatusAndError(response, 400, "That Playlist doesn't exist");
	// })
});
