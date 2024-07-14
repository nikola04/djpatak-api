import Account, { IAccount } from "../../models/account";

export type PartialDiscordGuild = {
    id: string,
    name: string,
    icon: string,
    owner: boolean,
    permissions: string,
    features: string[],
    approximate_member_count: number,
    approximate_presence_count: number
}

async function getDiscordAccount(userId: string) {
    const account = await Account.findOne({ userId, provider: 'discord' }).lean()
    if(!account) return null
    if(account.expiresAt + 25_000 < Date.now()) // if it didnt expire or dont expire in next 25 seconds 
        return account
    return await refreshDiscordTokens(account)
}

async function refreshDiscordTokens(account: IAccount): Promise<IAccount|null>{
    const params = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret:  process.env.DISCORD_CLIENT_SECRET!,
        refresh_token: account.refreshToken,
        grant_type: 'refresh_token'
    })
    const oAuthData = await fetch("https://discord.com/api/v10/oauth2/token", {
        method: 'POST',
        headers: {
             'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
    }).then(res => res.json())
    .catch(err => null)
    if(!oAuthData || !oAuthData.access_token) return null
    return await Account.findOneAndUpdate({ _id: account._id }, { $set: {
        providerAccountScopes: oAuthData.scope,
        tokenType: oAuthData.token_type,
        accessToken: oAuthData.access_token,
        refreshToken: oAuthData.refresh_token,
        expiresAt: Date.now() + oAuthData.expires_in
    }}, { new: true })
}

export {
    getDiscordAccount
}