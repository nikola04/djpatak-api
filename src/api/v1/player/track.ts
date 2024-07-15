import { Request, Response, Router } from "express";
import { botClient } from "../../../../server";
import { getOrInitVoiceConnection } from "../../../utils/voiceConnection";
import playDl, { SoundCloudTrack } from 'play-dl'
import { AudioPlayerStatus, getVoiceConnection } from "@discordjs/voice";
import { getTrackById, addTrack, getAllTracks, getTracksLen } from "../../../utils/queueTracks";
import { initializePlayer, PlayerState, playNextTrack, playPrevTrack, playTrack } from "../../../utils/player";
import { QueueTrack } from "@/classes/queueTrack";

// INIT
const router = Router()

// ROUTES
router.post('/:playerId/tracks/next', async (req: Request, res: Response) => { // Getting current track
    const playerId = req.params.playerId
    const guild = botClient.guilds.cache.get(playerId)
    const userDiscordId = req.userDiscordId
    if(!userDiscordId) return res.sendStatus(401)
    if(!guild) 
        return res.status(404).json({ status: 'error', error: 'No Player Found' })
    const member = guild.members.cache.get(userDiscordId)
    if(!member) return res.status(403).json({ status: 'error', error: 'User is not in Guild Voice'})
    const channel = member.voice.channel
    if(!channel)
        return res.status(403).json({ status: 'error', error: 'User Not in Voice Channel' })
    const connection = getVoiceConnection(guild.id)
    if(!connection || !connection.player)
        return res.status(400).json({ status: 'error', error: 'Player is not connected' })
    if(guild.members.me?.voice.channelId != channel.id)
        return res.status(403).json({ status: 'error', error: 'User is not in same Channel as Bot'})
    const [playerState, queueTrack] = await playNextTrack(connection, playerId)
    if(playerState == PlayerState.NoStream) 
        return res.json({ status: 'error', error: 'Stream Not Found', player: null })
    if(playerState == PlayerState.QueueEnd) 
        return res.json({ status: 'ok', player: {
            status: connection.player?.state.status,
            queueTrack: null
        } })
    if(playerState == PlayerState.Playing) 
        return res.json({ status: 'ok', player: {
            status: connection.player?.state.status,
            queueTrack
        } })
})

router.post('/:playerId/tracks/prev', async (req: Request, res: Response) => { // Getting current track
    const playerId = req.params.playerId
    const guild = botClient.guilds.cache.get(playerId)
    const userDiscordId = req.userDiscordId
    if(!userDiscordId) return res.sendStatus(401)
    if(!guild) 
        return res.status(404).json({ status: 'error', error: 'No Player Found' })
    const member = guild.members.cache.get(userDiscordId)
    if(!member) return res.status(403).json({ status: 'error', error: 'User is not in Guild Voice'})
    const channel = member.voice.channel
    if(!channel)
        return res.status(403).json({ status: 'error', error: 'User Not in Voice Channel' })
    const connection = getVoiceConnection(guild.id)
    if(!connection || !connection.player)
        return res.status(400).json({ status: 'error', error: 'Player is not connected' })
    if(guild.members.me?.voice.channelId != channel.id)
        return res.status(403).json({ status: 'error', error: 'User is not in same Channel as Bot'})
    const [playerState, queueTrack] = await playPrevTrack(connection, playerId)
    if(playerState == PlayerState.NoStream) 
        return res.json({ status: 'error', error: 'Stream Not Found', player: null })
    if(playerState == PlayerState.QueueEnd) 
        return res.json({ status: 'ok', player: {
            status: connection.player?.state.status,
            queueTrack: null
        } })
    if(playerState == PlayerState.Playing) 
        return res.json({ status: 'ok', player: {
            status: connection.player?.state.status,
            queueTrack
        } })
})

router.post('/:playerId/tracks/:trackId', async (req: Request, res: Response) => {
    const userDiscordId = req.userDiscordId
    const playerId = req.params.playerId
    const trackId = req.params.trackId
    if(!userDiscordId) return res.sendStatus(401)
    if(!(await validateId(trackId)))
        return res.status(400).json({ status: 'error', error: 'Invalid SoundCloud URL'})
    const guild = botClient.guilds.cache.get(playerId)
    if(!guild) 
        return res.status(404).json({ status: 'error', error: 'No Player Found' })
    const member = guild.members.cache.get(userDiscordId)
    if(!member) return res.status(403).json({ status: 'error', error: 'User is not in Guild Voice'})
    const channel = member.voice.channel
    if(!channel)
        return res.status(403).json({ status: 'error', error: 'User Not in Voice Channel' })
    const { connection, isNew } = await getOrInitVoiceConnection(channel)
    if(!isNew && guild.members.me?.voice.channelId != channel.id)
        return res.status(403).json({ status: 'error', error: 'User is not in same Channel as Bot'})
    const so_info = await playDl.soundcloud(trackId) as SoundCloudTrack // Proven to be track with validateId
    // 1. If player doesnt exists create one
    if(!connection.player){
        initializePlayer(playerId, connection, { onQueueEnd: () => { // should be emitted in live socket connection
            console.log('Queue has ended')
        }, onStreamError: () => {
            console.warn('No Stream')
        }, onNextSong: (queueTrack: QueueTrack) => {
            console.log('Playing next song:', queueTrack.track.title)
        } })
    }
    // 2. if player is not playing anything play added track
    if(connection.player?.state.status == AudioPlayerStatus.Idle){
        if(connection.trackId == null) connection.trackId = await getTracksLen(playerId)
        else connection.trackId++
        const playerState = await playTrack(connection, playerId, so_info)
        if(playerState == PlayerState.NoStream)
            return res.status(404).json({ status: 'error', error: 'Stream Not Found' })
    }
    // 3. Add track to queue
    await addTrack(playerId, so_info)
    return res.json({ status: 'ok' })
})

router.get('/:playerId/tracks/current', async (req: Request, res: Response) => { // Getting current track
    const playerId = req.params.playerId
    const guild = botClient.guilds.cache.get(playerId)
    const userDiscordId = req.userDiscordId
    if(!userDiscordId) return res.sendStatus(401)
    if(!guild) 
        return res.status(404).json({ status: 'error', error: 'No Player Found' })
    const member = guild.members.cache.get(userDiscordId)
    if(!member) return res.status(403).json({ status: 'error', error: 'User is not in Guild Voice'})
    const channel = member.voice.channel
    if(!channel)
        return res.status(403).json({ status: 'error', error: 'User Not in Voice Channel' })
    if(guild.members.me?.voice.channelId != channel.id)
        return res.status(403).json({ status: 'error', error: 'User is not in same Channel as Bot'})
    const connection = getVoiceConnection(guild.id)
    if(!connection)
        return res.status(400).json({ status: 'error', error: 'Player is not connected' })
    if(connection.trackId == null)
        return res.json({ status: 'ok', queueTrack: null, playerStatus: connection.player?.state.status })
    const queueTrack = await getTrackById(playerId, connection.trackId)
    return res.json({ status: 'ok', queueTrack, playerStatus: connection.player?.state.status })
})

router.get('/:playerId/tracks/', async (req: Request, res: Response) => { // Getting current track
    const playerId = req.params.playerId
    const guild = botClient.guilds.cache.get(playerId)
    const userDiscordId = req.userDiscordId
    if(!userDiscordId) return res.sendStatus(401)
    if(!guild) 
        return res.status(404).json({ status: 'error', error: 'No Player Found' })
    const member = guild.members.cache.get(userDiscordId)
    if(!member) return res.status(403).json({ status: 'error', error: 'User is not in Guild Voice'})
    const channel = member.voice.channel
    if(!channel)
        return res.status(403).json({ status: 'error', error: 'User Not in Voice Channel' })
    if(guild.members.me?.voice.channelId != channel.id)
        return res.status(403).json({ status: 'error', error: 'User is not in same Channel as Bot'})
    const connection = getVoiceConnection(guild.id)
    if(!connection)
        return res.status(400).json({ status: 'error', error: 'Player is not connected' })
    if(connection.trackId == null)
        return res.json({ status: 'ok', player: {
            status: connection.player?.state.status,
            track: null
    } })
    const queueTracks = await getAllTracks(playerId)
    return res.json({ status: 'ok', results: queueTracks })
})

async function validateId(id: string): Promise<boolean>{
    return await playDl.so_validate(id) == 'track'
}

export default router