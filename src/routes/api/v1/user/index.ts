import { Request, Response, Router } from "express";
import User from "@/models/user.model";
import { IUser } from 'types/user'
import { getDiscordAccount, PartialDiscordGuild } from "@/utils/discord";
import { botClient } from "@/server";
import playlistsRouter from './playlists'
import { ratelimit } from "@/middlewares/ratelimit";

// INIT
const router = Router()

// ROUTES

router.use('/me/playlists', playlistsRouter)

router.get('/me', ratelimit({
    ratelimit: 1000,
    maxAttempts: 2
}), async (req: Request, res: Response) => {
    if(!req.userId) return res.sendStatus(401)
    const user: IUser|null = await User.findById(req.userId)
    if(!user) return res.status(404).json({ status: 'error', error: 'User Not Found' })
    return res.json({ status: 'ok', data: {
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image
    } })
})

router.get('/guilds', ratelimit({
    ratelimit: 1000,
    maxAttempts: 2
}), async (req: Request, res: Response) => {
    const userId = req.userId
    if(!userId) return res.sendStatus(401)
    const account = await getDiscordAccount(userId)
    if(!account) return res.status(405).json({ status:"error", error: "User has no Discord Account Connected"})
    const userResponse = await fetch(`https://discord.com/api/v10/users/@me/guilds`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${account.accessToken}`
        }
    }).then(res => res.json())
    .catch(() => null)
    const botGuilds = botClient.guilds.cache
    if(!Array.isArray(userResponse)) {
        if(userResponse.retry_after)
            return res.status(429).json({ status: 'error', retry_after: userResponse.retry_after * 1000 })
        return res.status(500).json({ status: "error", error: "Error while getting User Guilds" })
    }
    const userGuilds = userResponse as PartialDiscordGuild[]
    if(botGuilds.size == 0) return res.json([]);
    const userGuildsWithBot = userGuilds.filter((userGuild: PartialDiscordGuild) => botGuilds.has(userGuild.id))
    return res.json({ status: 'ok' , results: userGuildsWithBot})
})

export default router