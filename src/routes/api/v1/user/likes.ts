import { TrackProvider } from '@/enums/providers';
import { ratelimit } from '@/middlewares/ratelimit';
import LikedTrackModel from '@/models/likedTracks.model';
import { isValidProvider, validateTrackId } from '@/validators/track';
import bodyParser from 'body-parser';
import { Router, Request, Response } from 'express';
import { soundcloud, SoundCloudTrack } from 'play-dl';
// INIT
const router = Router();
router.use(
	ratelimit({
		ratelimit: 1000,
		maxAttempts: 2,
	})
);
router.use(bodyParser.json());

router.get('/', async (req: Request, res: Response) => {
	if (!req.userId) return res.sendStatus(401);
	try {
		const tracks = await LikedTrackModel.find({
			likedUserId: req.userId,
		}).lean();
		return res.json({ status: 'ok', tracks });
	} catch (error) {
		return res.status(500).json({ status: 'error', error });
	}
});

router.delete('/:trackId', async (req: Request, res: Response) => {
	const trackId = req.params.trackId;
	const providerId = req.body.providerId;
	if (!req.userId) return res.sendStatus(401);
	try {
		await LikedTrackModel.deleteOne({
			likedUserId: req.userId,
			providerId,
			providerTrackId: trackId,
		});
		return res.json({ status: 'ok' });
	} catch (error) {
		return res.status(500).json({ status: 'error', error });
	}
});

router.get('/:trackId', async (req: Request, res: Response) => {
	const trackId = req.params.trackId;
	const providerId = req.body.providerId;
	if (!req.userId) return res.sendStatus(401);
	try {
		const track = await LikedTrackModel.findOne({
			likedUserId: req.userId,
			providerId,
			providerTrackId: trackId,
		});
		return res.json({ status: 'ok', track });
	} catch (error) {
		return res.status(500).json({ status: 'error', error });
	}
});

router.post('/:trackId', async (req: Request, res: Response) => {
	const trackId = req.params.trackId;
	const providerId = req.body.providerId;
	if (!req.userId) return res.sendStatus(401);
	try {
		if (!isValidProvider(providerId)) return res.status(400).json({ status: 'error', error: 'Provider is not valid' });
		let track: SoundCloudTrack | null = null;
		if (providerId === TrackProvider.soundcloud) {
			if (!(await validateTrackId(trackId))) return res.status(400).json({ status: 'error', error: 'Track ID is not valid' });
			track = (await soundcloud(trackId)) as SoundCloudTrack;
		} else return res.status(400).json({ status: 'error', error: 'Provider is not supported' });
		if (!track) return res.status(404).json({ status: 'error', error: 'Track not found' });
		await LikedTrackModel.updateOne(
			{
				likedUserId: req.userId,
				providerId: providerId,
				providerTrackId: trackId,
			},
			{
				likedUserId: req.userId,
				providerId: providerId,
				providerTrackId: trackId,
				data: {
					title: track.name,
					permalink: track.permalink,
					thumbnail: track.thumbnail,
					durationInSec: track.durationInSec,
				},
				authors: [{ username: track.user.name, permalink: track.user.url }],
			},
			{ new: true, upsert: true }
		);
		return res.json({ status: 'ok' });
	} catch (error) {
		return res.status(500).json({ status: 'error', error });
	}
});

export default router;
