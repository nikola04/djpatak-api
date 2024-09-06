import { Router } from 'express';
import queueRouter from './queue';
import soundCloudRouter from './providers/soundcloud';
import playlistsRouter from './playlists';

// INIT
const router = Router({ mergeParams: true });

// ROUTES

router.use('/queue', queueRouter);
router.use('/soundcloud', soundCloudRouter);
router.use('/playlists', playlistsRouter);

export default router;
