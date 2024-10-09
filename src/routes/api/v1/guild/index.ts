import { Request, Response, Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import cookieParser from 'cookie-parser';
import { ratelimit } from '@/middlewares/ratelimit';
import { botClient } from '@/server';

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
router.get('/:guildId/roles', async (req: Request, res: Response) => {
	const guildId = req.params.guildId;
    const guild = botClient.guilds.cache.get(guildId)
    if(!guild){
        return res.status(404).json({ error: 'Guild not found or bot not in guild' });
    }
    let roles = guild.roles.cache;
    if(!roles.size){
        try {
            roles = await guild.roles.fetch()
        } catch (_err) {
            return res.status(500).json({ error: 'Failed to fetch roles from the Discord API' });
        }
    }
    const formatedRoles = guild.roles.cache.map((role) => ({
        id: role.id,
        name: role.name,
        unicodeEmoji: role.unicodeEmoji,
        color: role.color,
        permissions: role.permissions,
        rawPosition: role.rawPosition
    }))
	return res.json({ roles: formatedRoles })
})


export default router;
