import { Router } from "express";
import { botClient } from "../../../../server";
import { getOrInitVoiceConnection } from "../../../utils/voiceConnection";
import playDl, { SoundCloudTrack } from 'play-dl'
import { Platform } from "../../../types/tracks";
import { AudioPlayerStatus, createAudioPlayer, createAudioResource, getVoiceConnection, NoSubscriberBehavior } from "@discordjs/voice";

// INIT
const allowedPlatforms = [Platform.SoundCloud]
const router = Router()

// ROUTES
router.post('/:playerId/track/:trackId', async (req, res) => { // Playing track
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
    const so_info = await playDl.soundcloud(trackId) as SoundCloudTrack // Proven to be track with validateId
    const stream = await playDl.stream_from_info(so_info).catch(err => {
        console.log('> PlayDL Stream Error:', err)
        return null
    })
    if(!stream)
        return res.status(404).json({ status: 'ERROR', error: 'Stream Not Found' })
    const resource = createAudioResource(stream.stream, { inputType: stream.type })
    const player = createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Pause }
    })
    player.on("stateChange", (oldState, newState) => {
        if(oldState.status == AudioPlayerStatus.Playing && newState.status == AudioPlayerStatus.Idle)
            connection.track = undefined;
    })
    player.play(resource)
    connection.player = player
    connection.track = so_info
    connection.subscribe(player)
    return res.json({ status: 'OK' })
})

router.get('/:playerId/track', async (req, res) => { // Getting current track
    const playerId = req.params.playerId
    const guild = await botClient.guilds.fetch(playerId)
    if(!guild) 
        return res.status(404).json({ status: 'ERROR', error: 'No Player Found' })
    const connection = getVoiceConnection(guild.id)
    if(!connection)
        return res.status(400).json({ status: 'ERROR', error: 'Player is not connected' })
    return res.json({ status: 'OK', player: {
        status: connection.player?.state.status,
        track: connection.track
    } })
})

async function validateId(id: string, platform: Platform): Promise<boolean>{
    if(platform == Platform.SoundCloud){
        return await playDl.so_validate(id) == 'track'
    }
    return false
}

export default router