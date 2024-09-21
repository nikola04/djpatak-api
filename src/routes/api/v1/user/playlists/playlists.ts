import { Request, Response, Router } from 'express';
import bodyParser from 'body-parser';
import Playlist from '@/models/playlist.model';
import PlaylistTrackModel from '@/models/playlistTracks.model';
import { IPlaylist } from 'types/playlist';
import { isValidPlaylistDescription, isValidPlaylistName } from '@/validators/playlist';
import { isValidObjectId } from 'mongoose';
import { ratelimit } from '@/middlewares/ratelimit';
import tracksRouter from './tracks';

// INIT
const router = Router();
router.use(
	ratelimit({
		ratelimit: 1000,
		maxAttempts: 2,
	})
);
router.use(bodyParser.json());

router.use('/:playlistId/tracks', tracksRouter);

// ROUTES
router.post('/', async (req: Request, res: Response) => {
	const { name, description } = req.body;
	if (!req.userId) return res.sendStatus(401);
	if (!isValidPlaylistName(name))
		return res.status(400).json({error: 'Playlist Name must be between at 2 and 24 alphabet characters and emojis only'});
	if (!isValidPlaylistDescription(description))
		return res.status(400).json({
			error: 'If provided, Playlist Description can have maximum of 100 characters',
		});
	const trimmedName = name.trim();
	try {
		const exist = await Playlist.findOne({
			ownerUserId: req.userId,
			name: trimmedName,
		});
		if (exist != null) return res.status(409).json({ error: 'You have already created playlist with that name' });
		const createdPlaylist: IPlaylist = await Playlist.create({
			ownerUserId: req.userId,
			name: trimmedName,
			description,
		});
		return res.json({ playlist: createdPlaylist });
	} catch (error) {
		return res.status(500).json({ error });
	}
});

router.get('/', async (req: Request, res: Response) => {
	if (!req.userId) return res.sendStatus(401);
	try {
		const playlists = await Playlist.find({ ownerUserId: req.userId }).lean();
		return res.json({ playlists });
	} catch (error) {
		return res.status(500).json({ error });
	}
});

router.get('/:playlistId', async (req: Request, res: Response) => {
	const { playlistId } = req.params;
	if (!req.userId) return res.sendStatus(401);
	if (!isValidObjectId(playlistId)) return res.status(400).json({ error: 'Playlist ID is Not Valid' });
	try {
		const playlist: IPlaylist | null = await Playlist.findOne({
			_id: playlistId,
		}).lean();
		if (!playlist)
			return res.status(404).json({
				status: 'error',
				error: 'Playlist is not found',
				playlist: null,
			});
		if (playlist.ownerUserId != req.userId)
			return res.status(403).json({
				status: 'error',
				error: 'You are not a playlist owner',
				playlist: null,
			});
		return res.json({ playlist });
	} catch (error) {
		return res.status(500).json({ error });
	}
});

router.patch('/:playlistId', async (req: Request, res: Response) => {
	const { playlistId } = req.params;
	const { name: newName, description: newDescription } = req.body;
	if (!req.userId) return res.sendStatus(401);
	if (!isValidObjectId(playlistId)) return res.status(400).json({ error: 'Playlist ID is Not Valid' });
	if (!isValidPlaylistName(newName))
		return res.status(400).json({
			error: 'Playlist Name must be between at 2 and 24 alphabet characters and emojis only',
		});
	if (!isValidPlaylistDescription(newDescription))
		return res.status(400).json({
			error: 'If provided, Playlist Description can have maximum of 100 characters',
		});
	try {
		const playlist = await Playlist.findOneAndUpdate(
			{ _id: playlistId, ownerUserId: req.userId },
			{
				$set: {
					name: newName.trim(),
					description: newDescription.trim(),
					'metadata.lastModified': Date.now(),
				},
			},
			{ new: true }
		).lean();
		if (playlist == null) return res.status(404).json({ error: 'Playlist is Not Found' });
		return res.json({ playlist });
	} catch (error) {
		return res.status(500).json({ error });
	}
});

router.delete('/:playlistId', async (req: Request, res: Response) => {
	const { playlistId } = req.params;
	if (!req.userId) return res.sendStatus(401);
	if (!isValidObjectId(playlistId)) return res.status(400).json({ error: 'Playlist ID is Not Valid' });
	try {
		const playlist: IPlaylist | null = await Playlist.findOne({
			_id: playlistId,
		}).lean();
		if (!playlist)
			return res.status(404).json({
				status: 'error',
				error: 'Playlist is not found',
				playlist: null,
			});
		if (playlist.ownerUserId != req.userId)
			return res.status(403).json({
				status: 'error',
				error: 'You are not a playlist owner',
				playlist: null,
			});
		await Promise.all([Playlist.deleteOne({ _id: playlistId }), PlaylistTrackModel.deleteMany({ playlistId })]);
		return res.json({ status: 'ok' });
	} catch (error) {
		return res.status(500).json({ error });
	}
});

export default router;
