import { Request, Response, Router } from "express";
import { isUserInGuildVoice } from "@/middlewares/user";
import { botClient } from "@/server";
import { AudioPlayerStatus, getVoiceConnection } from "@discordjs/voice";
import { emitEvent } from "@/utils/sockets";
import { initializePlayerPreferences } from "@/utils/player";
import { isRepeat } from "@/validators/playerPreferences";

// INIT
const router = Router({ mergeParams: true })

router.use(isUserInGuildVoice())

// ROUTES
router.post('/pause', async (req: Request, res: Response) => {
    const playerId = req.params.playerId
    const userDiscordId = req.userDiscordId
    try{
        const guild = botClient.guilds.cache.get(playerId)!
        const member = guild.members.cache.get(userDiscordId!)!
        const channel = member.voice.channel!
        const connection = getVoiceConnection(playerId)
        if(!connection || !connection.player)
            return res.status(400).json({ status: 'error', error: 'Player is not connected' })
        if(guild.members.me?.voice.channelId != channel.id)
            return res.status(403).json({ status: 'error', error: 'User is not in same Channel as Bot'})
        if(connection.player.state.status != AudioPlayerStatus.Playing) return res.json({ status: 'error', error: 'Player is not playing anything' })
        connection.player.pause()
        emitEvent('pause', playerId)
        return res.json({ status: 'ok' })
    }catch(err){
        console.error(err)
        return res.status(500).json({ status: 'error', error: err })
    }
})

router.post('/resume', async (req: Request, res: Response) => {
    const playerId = req.params.playerId
    const userDiscordId = req.userDiscordId
    try{
        const guild = botClient.guilds.cache.get(playerId)!
        const member = guild.members.cache.get(userDiscordId!)!
        const channel = member.voice.channel!
        const connection = getVoiceConnection(playerId)
        if(!connection || !connection.player)
            return res.status(400).json({ status: 'error', error: 'Player is not connected' })
        if(guild.members.me?.voice.channelId != channel.id)
            return res.status(403).json({ status: 'error', error: 'User is not in same Channel as Bot'})
        if(connection.player.state.status != AudioPlayerStatus.Paused) return res.json({ status: 'error', error: 'Player is not paused' })
        connection.player.unpause()
        emitEvent('resume', playerId)
        return res.json({ status: 'ok' })
    }catch(err){
        console.error(err)
        return res.status(500).json({ status: 'error', error: err })
    }
})

router.post('/repeat', async (req: Request, res: Response) => {
    const { set: newRepeat } = req.query
    const playerId = req.params.playerId
    const userDiscordId = req.userDiscordId
    if(!isRepeat(newRepeat))
        return res.status(400).json({ status: 'error', error: 'Query param set must be "queue", "track" or "off"' })
    try{
        const guild = botClient.guilds.cache.get(playerId)!
        const member = guild.members.cache.get(userDiscordId!)!
        const channel = member.voice.channel!
        const connection = getVoiceConnection(playerId)
        if(!connection || !connection.player)
            return res.status(400).json({ status: 'error', error: 'Player is not connected' })
        if(guild.members.me?.voice.channelId != channel.id)
            return res.status(403).json({ status: 'error', error: 'User is not in same Channel as Bot'})
        if(!connection.playerPreferences)
            connection.playerPreferences = initializePlayerPreferences()
        if(connection.playerPreferences.repeat != newRepeat)
            emitEvent('repeat', playerId, newRepeat)
        connection.playerPreferences.repeat = newRepeat
        return res.json({ status: 'ok' })
    }catch(err){
        console.error(err)
        return res.status(500).json({ status: 'error', error: err })
    }
})

export default router