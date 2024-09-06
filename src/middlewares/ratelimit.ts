import { redisClient } from '@/server';
import { v4 as uuid } from 'uuid';
import { NextFunction, Request, Response } from 'express';

export const ratelimit = ({ ratelimit, maxAttempts }: { ratelimit: number; maxAttempts: number }) => {
	const ratelimitId = uuid().slice(0, 7);
	const redisRatelimitKeyByUserId = (userId: string) => `rtlm#${ratelimitId}:usr#${userId}`;
	return async (req: Request, res: Response, next: NextFunction) => {
		if (!req.userId) return res.sendStatus(401);
		const userKey = redisRatelimitKeyByUserId(req.userId);
		try {
			const limit = await redisClient.incr(userKey);
			if (limit == 1) await redisClient.pExpire(userKey, ratelimit);
			else if (limit > maxAttempts) {
				const ttl = await redisClient.pTTL(userKey);
				if (ttl <= 0) return next();
				return res.status(429).json({ errror: 'Too many requests', retry_after: ttl });
			}
			next();
		} catch (err) {
			res.status(500).json({ error: 'API Ratelimit Error' });
		}
	};
};
