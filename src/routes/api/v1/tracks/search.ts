import { TrackProvider } from '@/enums/providers';
import { ratelimit } from '@/middlewares/ratelimit';
import UserSearchModel from '@/models/userSearches.model';
import { scTrackToDbTrack } from '@/utils/queueTracks';
import { Request, Response, Router } from 'express';
import { search } from 'play-dl';
import { IUserSearch } from 'types/user';

const router = Router();

router.get(
	'/history',
	ratelimit({
		ratelimit: 1000,
		maxAttempts: 1,
	}),
	async (req: Request, res: Response) => {
		const userId = req.userId;
		try {
			const results: IUserSearch[] = await UserSearchModel.find({ userId }).limit(500).lean();
			return res.json({ status: 'ok', results });
		} catch (err) {
			console.error('api/v1/tracks/search/history', err);
			return res.status(500).json({ error: 'Internal server error' });
		}
	}
);

router.get(
	'/:query',
	ratelimit({
		ratelimit: 1000,
		maxAttempts: 2,
	}),
	async (req: Request, res: Response) => {
		const userId = req.userId;
		const searchQuery = req.params.query;
		const urlQuery = req.query;
		const limit = !urlQuery.limit ? 10 : Number(urlQuery.limit);
		const save = urlQuery.save !== 'false';
		if (searchQuery.length < 2) return res.status(400).json({ status: 'error', error: 'Query must be more 2 characters or more', results: [] });
		if (!limit || isNaN(limit) || limit < 1 || limit > 20)
			return res.status(400).json({ status: 'error', error: 'Limit value must be between 1 and 20', results: [] });
		try {
			const tracks = await search(searchQuery, { source: { soundcloud: 'tracks' }, limit });
			if (save)
				await UserSearchModel.updateOne(
					{ userId, search: searchQuery },
					{ userId, searchProviders: [TrackProvider.soundcloud], search: searchQuery, searchedAt: Date.now() },
					{ upsert: true }
				).lean();
			const formatedTracks = tracks.map(scTrackToDbTrack);
			return res.json({ status: 'ok', results: formatedTracks });
		} catch (err) {
			console.error('api/v1/tracks/search/:query', err);
			return res.status(500).json({ error: 'Internal server error' });
		}
	}
);

export default router;
