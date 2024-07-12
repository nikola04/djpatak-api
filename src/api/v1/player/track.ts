import { Router } from "express";
import { botClient } from "../../../../server";
import { getOrInitVoiceConnection } from "../../../utils/voiceConnection";
import playDl, { SoundCloudTrack } from 'play-dl'
import { AudioPlayerStatus, getVoiceConnection } from "@discordjs/voice";
import { getTrackById, addTrack, getAllTracks } from "../../../utils/queueTracks";
import { initializePlayer, PlayerState, playNextTrack, playPrevTrack, playTrack } from "../../../utils/player";

// INIT
const router = Router()

// ROUTES
router.post('/:playerId/tracks/next', async (req, res) => { // Getting current track
    const playerId = req.params.playerId
    const guild = await botClient.guilds.fetch(playerId)
    if(!guild) 
        return res.status(404).json({ status: 'ERROR', error: 'No Player Found' })
    const connection = getVoiceConnection(guild.id)
    if(!connection || !connection.player)
        return res.status(400).json({ status: 'ERROR', error: 'Player is not connected' })
    const [playerState, track] = await playNextTrack(connection, playerId)
    if(playerState == PlayerState.NoStream) 
        return res.json({ status: 'ERROR', error: 'Stream Not Found', player: null })
    if(playerState == PlayerState.QueueEnd) 
        return res.json({ status: 'OK', player: {
            status: connection.player?.state.status,
            track: null
        } })
    if(playerState == PlayerState.Playing) 
        return res.json({ status: 'OK', player: {
            status: connection.player?.state.status,
            track
        } })
})

router.post('/:playerId/tracks/prev', async (req, res) => { // Getting current track
    const playerId = req.params.playerId
    const guild = await botClient.guilds.fetch(playerId)
    if(!guild) 
        return res.status(404).json({ status: 'ERROR', error: 'No Player Found' })
    const connection = getVoiceConnection(guild.id)
    if(!connection || !connection.player)
        return res.status(400).json({ status: 'ERROR', error: 'Player is not connected' })
    const [playerState, track] = await playPrevTrack(connection, playerId)
    if(playerState == PlayerState.NoStream) 
        return res.json({ status: 'ERROR', error: 'Stream Not Found', player: null })
    if(playerState == PlayerState.QueueEnd) 
        return res.json({ status: 'OK', player: {
            status: connection.player?.state.status,
            track: null
        } })
    if(playerState == PlayerState.Playing) 
        return res.json({ status: 'OK', player: {
            status: connection.player?.state.status,
            track
        } })
})

router.post('/:playerId/tracks/:trackId', async (req, res) => {
    const playerId = req.params.playerId
    const trackId = req.params.trackId
    const channelId = "876223342246510593"
    if(!(await validateId(trackId)))
        return res.status(400).json({ status: 'ERROR', error: 'Invalid SoundCloud URL'})
    const guild = await botClient.guilds.fetch(playerId)
    if(!guild) 
        return res.status(404).json({ status: 'ERROR', error: 'No Player Found' })
    const channel = guild.channels.cache.find(channel => channel.id == channelId)
    if(!channel)
        return res.status(404).json({ status: 'ERROR', error: 'Channel ID Not Found' })
    const connection = await getOrInitVoiceConnection(channel)
    const so_info = await playDl.soundcloud(trackId) as SoundCloudTrack // Proven to be track with validateId
    // 1. If player doesnt exists create one
    if(!connection.player){
        initializePlayer(playerId, connection, { onQueueEnd: () => {
            console.log('Queue has ended')
        }, onStreamError: () => {
            console.warn('No Stream')
        }, onNextSong: (track: SoundCloudTrack) => {
            console.log('Playing next song:', track.name)
        } })
    }
    // 2. if player is not playing anything play added track
    if(connection.player?.state.status == AudioPlayerStatus.Idle){
        const playerState = await playTrack(connection, playerId, so_info)
        if(playerState == PlayerState.NoStream)
            return res.status(404).json({ status: 'ERROR', error: 'Stream Not Found' })
    }
    // 3. Add track to queue
        addTrack(playerId, so_info)
    return res.json({ status: 'OK' })
})

router.get('/:playerId/tracks/current', async (req, res) => { // Getting current track
    const playerId = req.params.playerId
    const guild = await botClient.guilds.fetch(playerId)
    if(!guild) 
        return res.status(404).json({ status: 'ERROR', error: 'No Player Found' })
    const connection = getVoiceConnection(guild.id)
    if(!connection)
        return res.status(400).json({ status: 'ERROR', error: 'Player is not connected' })
    if(connection.trackId == null)
        return res.json({ status: 'OK', queueTrack: null, playerStatus: connection.player?.state.status })
    const queueTrack = await getTrackById(playerId, connection.trackId)
    return res.json({ status: 'OK', queueTrack, playerStatus: connection.player?.state.status })
})

router.get('/:playerId/tracks/', async (req, res) => { // Getting current track
    const playerId = req.params.playerId
    const guild = await botClient.guilds.fetch(playerId)
    if(!guild) 
        return res.status(404).json({ status: 'ERROR', error: 'No Player Found' })
    const connection = getVoiceConnection(guild.id)
    if(!connection)
        return res.status(400).json({ status: 'ERROR', error: 'Player is not connected' })
    if(connection.trackId == null)
        return res.json({ status: 'OK', player: {
            status: connection.player?.state.status,
            track: null
    } })
    const queueTracks = await getAllTracks(playerId)
    return res.json({ status: 'OK', results: queueTracks })
})

async function validateId(id: string): Promise<boolean>{
    return await playDl.so_validate(id) == 'track'
}

export default router