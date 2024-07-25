import { Router, Request, Response } from "express"
import Account from "@/models/account.model"
import User from "@/models/user.model"
import generateAndSetToken from "@/utils/token"
const router = Router()

const discordScopes = ['identify', 'guilds', 'email']

type DiscordUserResult = { 
    id: string,
    username: string, 
    email: string, 
    avatar: string|null, 
    discriminator: string 
}
type OAuthData = {
    scope: string,
    token_type: string,
    access_token: string,
    refresh_token: string,
    expires_in: number
}

router.get('/', async (req: Request, res: Response) => {
    const { code } = req.query
    if(!code || typeof code !== 'string')
        return res.status(400).json({ status: 'error', error: 'Code Not Found'})
    const params = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret:  process.env.DISCORD_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.DISCORD_REDIRECT_URI!,
        scope: discordScopes.join(' '),
    })
    const oAuthData: OAuthData|null = await fetch("https://discord.com/api/v10/oauth2/token", {
        method: 'POST',
        headers: {
             'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
    }).then(res => res.json())
    .catch(() => null)
    if(!oAuthData || !oAuthData.access_token)
        return res.status(400).json({ status: 'error', error: 'Code Not Valid'})
    const userResult: DiscordUserResult|null = await fetch('https://discord.com/api/users/@me', {
        headers: { 'Authorization': `${oAuthData.token_type} ${oAuthData.access_token}` }
    }).then(res => res.json())
    .catch(() => null)
    if(!userResult || !userResult.id)
        return res.status(500).json({ status: 'error', error: 'Error while getting Discord User' })
    // Create Account if doesnt exists
    const account = await Account.findOne({ providerAccountId: userResult.id, provider: 'discord' }) ?? await newDiscordAccountUser(userResult, oAuthData)
    await Promise.all([Account.findByIdAndUpdate(account._id, { // update tokens and user data
        tokenType: oAuthData.token_type,
        accessToken: oAuthData.access_token,
        refreshToken: oAuthData.refresh_token,
        expiresAt: Date.now() + oAuthData.expires_in
    }), User.findByIdAndUpdate(account.userId, {
        name: userResult.username,
        email: userResult.email,
        image: discordAvatarURL(userResult)
    })])
    await generateAndSetToken(res, String(account.userId!))
    return res.redirect(301, process.env.APP_URL!)
})

function discordAvatarURL(userResult: DiscordUserResult){
    if (userResult.avatar == null) {
        const defaultAvatarNumber = parseInt(userResult.discriminator) % 5
        return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`
    }
    const format = userResult.avatar.startsWith("a_") ? "gif" : "png"
    return `https://cdn.discordapp.com/avatars/${userResult.id}/${userResult.avatar}.${format}`
}

async function newDiscordAccountUser(userResult: DiscordUserResult, oAuthData: OAuthData){
    const user = await User.create({
        name: userResult.username,
        email: userResult.email,
        image: discordAvatarURL(userResult)
    })
    return await Account.create({
        provider: 'discord',
        providerAccountId: userResult.id,
        providerAccountScopes: oAuthData.scope,
        tokenType: oAuthData.token_type,
        accessToken: oAuthData.access_token,
        refreshToken: oAuthData.refresh_token,
        expiresAt: Date.now() + oAuthData.expires_in,
        userId: user._id
    })
}

export default router