import { Request, Response, Router } from "express";
import { botClient } from "../../../../../server";
import { getOrInitVoiceConnection } from "../../../../utils/voiceConnection";
import playDl, { SoundCloudTrack } from 'play-dl'
import { getVoiceConnection } from "@discordjs/voice";
import { getTrackByPosition, getAllTracks, getTrackByQueueId } from "../../../../utils/queueTracks";
import { initializePlayer, PlayerState, playNextTrack, playPrevTrack, playTrack } from "../../../../utils/player";
import { QueueTrack } from "../../../../classes/queueTrack";
import { emitEvent } from "../../../../utils/sockets";

const router = Router({ mergeParams: true })

router.post('/next', async (req: Request, res: Response) => { // Getting current track
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
        if(playerState == PlayerState.Playing) {
            emitEvent('now-playing', playerId, queueTrack)
            return res.json({ status: 'ok', player: {
                status: connection.player?.state.status,
                queueTrack
            } })
        }
        return res.json({ status: 'ok' })
    }catch(err){
        console.error(err)
        return res.status(500).json({ status: 'error', error: err })
    }
})

router.post('/prev', async (req: Request, res: Response) => { // Getting current track
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
        if(playerState == PlayerState.Playing) {
            emitEvent('now-playing', playerId, queueTrack)
            return res.json({ status: 'ok', player: {
                status: connection.player?.state.status,
                queueTrack
            } })
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
        if(!userDiscordId) return res.sendStatus(401)
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
        const [track, queuePos] = await getTrackByQueueId(playerId, queueTrackId)
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
        connection.trackId = queuePos
        const playerState = await playTrack(connection, playerId, so_info)
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
    const guild = botClient.guilds.cache.get(playerId)
    const userDiscordId = req.userDiscordId
    try{
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
        const queueTrack = await getTrackByPosition(playerId, connection.trackId)
        return res.json({ status: 'ok', queueTrack, playerStatus: connection.player?.state.status })
    }catch(err){
        console.error(err)
        return res.status(500).json({ status: 'error', error: err })
    }
})

router.get('/', async (req: Request, res: Response) => { // Getting current track
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
    }catch(err){
        console.error(err)
        return res.status(500).json({ status: 'error', error: err })
    }
})

export default router