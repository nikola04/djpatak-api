import { Request, Response, Router } from "express";
import { botClient } from "../../../../../../server";
import { getOrInitVoiceConnection } from "../../../../../utils/voiceConnection";
import playDl, { SoundCloudTrack } from 'play-dl'
import { AudioPlayerStatus, getVoiceConnection } from "@discordjs/voice";
import { getTrackByPosition, addTrack, getAllTracks, getTracksLen, getTrackByQueueId } from "../../../../../utils/queueTracks";
import { initializePlayer, PlayerState, playNextTrack, playPrevTrack, playTrack } from "../../../../../utils/player";
import { QueueTrack } from "../../../../../classes/queueTrack";
import { emitEvent } from "../../../../../utils/sockets";
import queueRouter from '../queue'

// INIT
const router = Router({ mergeParams: true })

router.post('/:trackPermalink', async (req: Request, res: Response) => {
    const userDiscordId = req.userDiscordId
    const forcePlay = req.query.force
    const playerId = req.params.playerId
    const trackPermalink = req.params.trackPermalink
    try{
        if(!userDiscordId) return res.sendStatus(401)
        if(!(await validateId(trackPermalink)))
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
        const so_info = await playDl.soundcloud(trackPermalink) as SoundCloudTrack // Proven to be track with validateId
        // 1. If player doesnt exists create one
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
        // 2. Add track to queue
        const queueTrack = await addTrack(playerId, so_info)
        emitEvent('new-queue-song', playerId, queueTrack)
        // 3. if player is not playing anything play added track
        if(connection.player?.state.status == AudioPlayerStatus.Idle || forcePlay === '1'){
            if(connection.trackId == null) connection.trackId = await getTracksLen(playerId)
            else connection.trackId++
            const playerState = await playTrack(connection, playerId, so_info)
            if(playerState == PlayerState.NoStream)
                return res.status(404).json({ status: 'error', error: 'Stream Not Found' })
            if(playerState == PlayerState.Playing) emitEvent('now-playing', playerId, queueTrack)
            if(forcePlay === '1'){
                // Emit: {USER} skipped and played {SONG}
            }
        }
        return res.json({ status: 'ok' })
    }catch(err){
        console.error(err)
        return res.status(500).json({ status: 'error', error: err })
    }
})

export default router

async function validateId(id: string): Promise<boolean>{
    return await playDl.so_validate(id) == 'track'
}