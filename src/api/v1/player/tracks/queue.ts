import { NextFunction, Request, Response, Router } from "express";
import { botClient } from "../../../../../server";
import { getOrInitVoiceConnection } from "../../../../utils/voiceConnection";
import playDl, { SoundCloudTrack } from 'play-dl'
import { getVoiceConnection } from "@discordjs/voice";
import { getAllTracks, getTrackByQueueId } from "../../../../utils/queueTracks";
import { initializePlayer, PlayerState, playNextTrack, playPrevTrack, playTrack } from "../../../../utils/player";
import { QueueTrack } from "../../../../classes/queueTrack";
import { emitEvent } from "../../../../utils/sockets";

const router = Router({ mergeParams: true })

router.use(async (req: Request, res: Response, next: NextFunction) => {
    const playerId = req.params.playerId
    const userDiscordId = req.userDiscordId
    try{
        if(!userDiscordId) 
            return res.sendStatus(401)
        const guild = botClient.guilds.cache.get(playerId)
        if(!guild) 
            return res.status(404).json({ status: 'error', error: 'No Player Found' })
        const member = guild.members.cache.get(userDiscordId)
        if(!member) return res.status(403).json({ status: 'error', error: 'User is not in Guild Voice'})
        const channel = member.voice.channel
        if(!channel)
            return res.status(403).json({ status: 'error', error: 'User Not in Voice Channel' })
        return next()
    }catch(err){
        console.error(err)
        return res.status(500).json({ status: 'error', error: err })
    }
})

router.post('/next', async (req: Request, res: Response) => { // Getting current track
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
        const [playerState, queueTrack] = await playNextTrack(connection, playerId)
        if(playerState == PlayerState.NoStream) 
            return res.json({ status: 'error', error: 'Stream Not Found', playerStatus: null, queueTrack: null })
        if(playerState == PlayerState.QueueEnd){
            emitEvent('queue-end', playerId)
            return res.json({ status: 'ok', playerStatus: connection.player?.state.status, queueTrack: null })
        }
        emitEvent('now-playing', playerId, queueTrack)
        return res.json({ status: 'ok', playerStatus: connection.player?.state.status, queueTrack })
    }catch(err){
        console.error(err)
        return res.status(500).json({ status: 'error', error: err })
    }
})

router.post('/prev', async (req: Request, res: Response) => { // Getting current track
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
        const [playerState, queueTrack] = await playPrevTrack(connection, playerId)
        if(playerState == PlayerState.NoStream) 
            return res.json({ status: 'error', error: 'Stream Not Found', playerStatus: null, queueTrack: null })
        if(playerState == PlayerState.QueueEnd){
            emitEvent('queue-end', playerId)
            return res.json({ status: 'ok', playerStatus: connection.player?.state.status, queueTrack: null })
        }
        if(playerState == PlayerState.Playing) {
            emitEvent('now-playing', playerId, queueTrack)
            return res.json({ status: 'ok', playerStatus: connection.player?.state.status, queueTrack })
        }
        return res.json({ status: 'ok' })
    }catch(err){
        console.error(err)
        return res.status(500).json({ status: 'error', error: err })
    }
})

router.post('/:queueId', async (req: Request, res: Response) => {
    const userDiscordId = req.userDiscordId
    const playerId = req.params.playerId
    const queueTrackId = req.params.queueId
    try{
        const guild = botClient.guilds.cache.get(playerId)!
        const member = guild.members.cache.get(userDiscordId!)!
        const channel = member.voice.channel!
        const { connection, isNew } = await getOrInitVoiceConnection(channel)
        if(!isNew && guild.members.me?.voice.channelId != channel.id)
            return res.status(403).json({ status: 'error', error: 'User is not in same Channel as Bot'})
        const { track } = await getTrackByQueueId(playerId, queueTrackId)
        if(track == null)
            return res.status(404).json({ status: 'error', error: 'Track Not found in Queue'})
        const so_info = await playDl.soundcloud(track.track.permalink) as SoundCloudTrack
        if(!so_info)
            return res.status(404).json({ status: 'error', error: 'Queue Track doesnt exist any more'})
        if(!connection.player){
            initializePlayer(playerId, connection, { onQueueEnd: () => { // should be emitted in live socket connection
                console.log('Queue has ended')
                emitEvent('queue-end', playerId)
            }, onStreamError: () => {
                console.warn('No Stream')
            }, onNextSong: (queueTrack: QueueTrack) => {
                console.log('Playing song:', queueTrack.track.title)
                emitEvent('now-playing', playerId, queueTrack)
            } })
        }
        connection.trackId = queueTrackId
        const playerState = await playTrack(connection, so_info)
        if(playerState == PlayerState.NoStream)
            return res.status(404).json({ status: 'error', error: 'Stream Not Found' })
        if(playerState == PlayerState.Playing) emitEvent('now-playing', playerId, track)
        return res.json({ status: 'ok' })
    }catch(err){
        console.error(err)
        return res.status(500).json({ status: 'error', error: err })
    }
})

router.get('/current', async (req: Request, res: Response) => { // Getting current track
    const playerId = req.params.playerId
    const userDiscordId = req.userDiscordId
    try{
        const guild = botClient.guilds.cache.get(playerId)!
        const member = guild.members.cache.get(userDiscordId!)!
        const channel = member.voice.channel!
        if(guild.members.me?.voice.channelId != channel.id)
            return res.status(403).json({ status: 'error', error: 'User is not in same Channel as Bot'})
        const connection = getVoiceConnection(playerId)
        if(!connection)
            return res.status(400).json({ status: 'error', error: 'Player is not connected' })
        if(connection.trackId == null)
            return res.json({ status: 'ok', queueTrack: null, playerStatus: connection.player?.state.status })
        const { track } = await getTrackByQueueId(playerId, connection.trackId)
        return res.json({ status: 'ok', queueTrack: track, playerStatus: connection.player?.state.status })
    }catch(err){
        console.error(err)
        return res.status(500).json({ status: 'error', error: err })
    }
})

router.get('/', async (req: Request, res: Response) => { // Getting current track
    const playerId = req.params.playerId
    const userDiscordId = req.userDiscordId
    try{
        const guild = botClient.guilds.cache.get(playerId)!
        const member = guild.members.cache.get(userDiscordId!)!
        const channel = member.voice.channel!
        if(guild.members.me?.voice.channelId != channel.id)
            return res.status(403).json({ status: 'error', error: 'User is not in same Channel as Bot'})
        const connection = getVoiceConnection(playerId)
        if(!connection)
            return res.status(400).json({ status: 'error', error: 'Player is not connected' })
        const queueTracks = await getAllTracks(playerId)
        return res.json({ status: 'ok', results: queueTracks })
    }catch(err){
        console.error(err)
        return res.status(500).json({ status: 'error', error: err })
    }
})

export default router