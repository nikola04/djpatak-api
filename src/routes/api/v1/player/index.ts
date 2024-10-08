import { Request, Response, Router } from 'express';
import trackRoute from './tracks';
import controllsRoute from './controlls';
import Account from '@/models/account.model';
import { ratelimit } from '@/middlewares/ratelimit';

// INIT
const router = Router();

// ROUTES
router.use(
	ratelimit({
		ratelimit: 1000,
		maxAttempts: 4,
	})
);

router.use(async (req: Request, res: Response, next) => {
	if (!req.userId) return res.sendStatus(401);
	// get discord id
	const account = await Account.findOne({ userId: req.userId }).lean();
	if (!account) return res.sendStatus(401);
	req.userDiscordId = account.providerAccountId;
	next();
});
router.use('/:playerId/tracks/', trackRoute);
router.use('/:playerId', controllsRoute);

export default router;
