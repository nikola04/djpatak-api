import { Router } from "express";
import { botClient } from "../../../../server";
import { getOrInitVoiceConnection } from "../../../utils/voiceConnection";
import playDl from 'play-dl'
import { Platform } from "../../../types/tracks";
import { createAudioPlayer, createAudioResource, NoSubscriberBehavior } from "@discordjs/voice";

// INIT
const allowedPlatforms = [Platform.SoundCloud]
const router = Router()

// ROUTES
router.post('/:playerId/track/:trackId', async (req, res) => {
    const playerId = req.params.playerId
    const trackId = req.params.trackId
    const channelId = "876223342246510593"
    const platform = (req.query.platform ?? Platform.SoundCloud) as Platform
    if(!allowedPlatforms.includes(platform)) // Check if platform is valid
        return res.status(400).json({ status: 'ERROR', error: 'Invalid Platform'})
    if(!(await validateId(trackId, platform)))
        return res.status(400).json({ status: 'ERROR', error: 'Invalid SoundCloud URL'})
    const guild = await botClient.guilds.fetch(playerId)
    if(!guild) 
        return res.status(404).json({ status: 'ERROR', error: 'No Player Found' })
    const channel = guild.channels.cache.find(channel => channel.id == channelId)
    if(!channel)
        return res.status(404).json({ status: 'ERROR', error: 'Channel ID Not Found' })
    const connection = await getOrInitVoiceConnection(channel)
    const stream = await playDl.stream(trackId).catch(err => {
        console.log('> PlayDL Stream Error:', err)
        return null
    })
    if(!stream)
        return res.status(404).json({ status: 'ERROR', error: 'Stream Not Found' })
    const resource = createAudioResource(stream.stream, {
        inputType: stream.type
    })
    const player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Play
        }
    })
    player.play(resource)
    connection.player = player
    connection.subscribe(player)
    return res.json({ status: 'OK' })
})

async function validateId(id: string, platform: Platform): Promise<boolean>{
    if(platform == Platform.SoundCloud){
        return await playDl.so_validate(id) == 'track'
    }
    return false
}

export default router