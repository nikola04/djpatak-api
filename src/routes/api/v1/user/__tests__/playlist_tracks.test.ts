import app from '@/app';
import PlaylistModel from '@/models/playlist.model';
import PlaylistTrackModel from '@/models/playlistTracks.model';
import { Request, Response, NextFunction } from 'express';
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

describe('POST /users/me/playlist/:id/tracks', () => {});
