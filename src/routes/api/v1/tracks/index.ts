import { TrackProvider } from '@/enums/providers';
import { ratelimit } from '@/middlewares/ratelimit';
import UserSearchModel from '@/models/userSearches.model';
import { scTrackToDbTrack } from '@/utils/queueTracks';
import { Request, Response, Router } from 'express';
import { search } from 'play-dl';

const router = Router();

router.use(
	ratelimit({
		ratelimit: 1000,
		maxAttempts: 2,
	})
);

router.get('/search/:query', async (req: Request, res: Response) => {
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
		if (save) await UserSearchModel.create({ userId, searchProviderId: TrackProvider.soundcloud, search: String(searchQuery) });
		const formatedTracks = tracks.map(scTrackToDbTrack);
		return res.json({ status: 'ok', results: formatedTracks });
	} catch (err) {
		console.error('api/v1/tracks/search/:query', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
