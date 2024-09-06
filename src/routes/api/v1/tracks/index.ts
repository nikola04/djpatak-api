import { ratelimit } from '@/middlewares/ratelimit';
import SoundCloud from '@/utils/soundcloud';
import { Router } from 'express';

const router = Router();

router.use(
	ratelimit({
		ratelimit: 1000,
		maxAttempts: 2,
	})
);

router.get('/search/:query', async (req, res) => {
	const searchQuery = req.params.query;
	const urlQuery = req.query;
	const limit = !urlQuery.limit ? 10 : Number(urlQuery.limit);
	if (searchQuery.length < 2) return res.status(400).json({ status: 'error', error: 'Query must be more 2 characters or more', results: [] });
	if (!limit || isNaN(limit) || limit < 1 || limit > 20)
		return res.status(400).json({ status: 'error', error: 'Limit value must be between 1 and 20', results: [] });
	const soundcloudId = await SoundCloud.getSoundcloudId();
	if (!soundcloudId) return res.status(500).json({ status: 'error', error: 'SoundCloud ID Error', results: [] });
	const tracks = await SoundCloud.search(soundcloudId, searchQuery, { limit });
	return res.json({ status: 'ok', results: tracks ?? [] });
});

export default router;
