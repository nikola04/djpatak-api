import { Router } from 'express';
import guildRoute from './guild';
import tracksRoute from './tracks';
import playerRoute from './player';
import usersRoute from './user';
import { authenticate } from '@/middlewares/authenticate';
import cookieParser from 'cookie-parser';
import { ratelimit } from '@/middlewares/ratelimit';

// INIT
const router = Router();

router.use(cookieParser());
router.use(authenticate());
router.use(
	ratelimit({
		ratelimit: 180_000, // 3 minutes
		maxAttempts: 1100,
	})
);

// ROUTES
router.use('/guild', guildRoute);
router.use('/tracks', tracksRoute);
router.use('/player', playerRoute);
router.use('/users', usersRoute);

export default router;
