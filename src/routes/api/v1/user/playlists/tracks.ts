import { ratelimit } from "@/middlewares/ratelimit";
import { validateTrackId } from "@/validators/track";
import bodyParser from "body-parser";
import { Request, Response, Router } from "express";
import { soundcloud, SoundCloudTrack } from "play-dl";
import PlaylistTrackModel from '@/models/playlistTracks.model'
import PlaylistModel from "@/models/playlist.model";
import { IPlaylist } from "types/playlist";

// INIT
const router = Router({ mergeParams: true });
router.use(ratelimit({
    ratelimit: 1000,
    maxAttempts: 1
}))
router.use(bodyParser.json());

router.post('/', async (req: Request, res: Response) => {
    const playlistId = req.params.playlistId
    const trackId = req.body.providerTrackId
    const providerId = req.body.providerId
    if(!req.userId) return res.sendStatus(401);
    try{
        let providerTrack: SoundCloudTrack|null = null
        if(providerId === 'soundcloud'){
            if(!await validateTrackId(trackId)) 
                return res.status(400).json({ status: 'error', error: 'Track ID is not valid' })
            providerTrack = await soundcloud(trackId) as SoundCloudTrack
        }else
            return res.status(400).json({ status: 'error', error: 'Provider is not valid' })
        if(!providerTrack) 
            return res.status(404).json({ status: 'error', error: 'Track not found' })
        const playlist: IPlaylist|null = await PlaylistModel.findById(playlistId).lean()
        if(!playlist)
            return res.status(404).json({ status: 'error', error: "That Playlist doesn't exist"})
        if(playlist.ownerUserId != req.userId)
            return res.status(403).json({ status: 'error', error: "You don't own that Playlist" })
        const trackData = {
            title: providerTrack.name,
            thumbnail: providerTrack.thumbnail,
            duration: providerTrack.durationInSec,
            author: providerTrack.user.name
        }
        await Promise.all([
            PlaylistModel.updateOne({ _id: playlistId }, { $set: { "metadata.lastModified": Date.now() }, $inc: { "metadata.totalSongs": 1 } }),
            PlaylistTrackModel.updateOne({
                playlistId,
                providerId,
                providerTrackId: trackId
            }, {
                playlistId,
                providerId,
                providerTrackId: trackId,
                trackData
            }, { new: true, upsert: true }).lean()
        ])
        return res.json({ status: 'ok', playlist, trackData })
    }catch(error){
        return res.status(500).json({ status: 'error', error });
    }
})

router.get('/', async (req: Request, res: Response) => {
    const playlistId = req.params.playlistId
    if (!req.userId) return res.sendStatus(401);
    try {
        const playlist: IPlaylist|null = await PlaylistModel.findById(playlistId).lean()
        if(!playlist)
            return res.status(404).json({ status: 'error', error: "That Playlist doesn't exist"})
        if(playlist.ownerUserId != req.userId)
            return res.status(403).json({ status: 'error', error: "You don't own that Playlist" })
        const tracks = await PlaylistTrackModel.find({ playlistId }).lean()
        res.json({ status: 'ok', playlist, tracks })
    } catch (error) {
        return res.status(500).json({ status: 'error', error });
    }
})

export default router