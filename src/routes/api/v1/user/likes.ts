import { ratelimit } from "@/middlewares/ratelimit";
import LikedTrackModel from "@/models/likedTracks.model";
import bodyParser from "body-parser";
import { Router, Request, Response } from "express";
import { so_validate, soundcloud, SoundCloudTrack } from "play-dl";
import { ILikedTrack } from "types/track";

// INIT
const router = Router();
router.use(ratelimit({
    ratelimit: 1000,
    maxAttempts: 2
}))
router.use(bodyParser.json());

router.get('/', async (req: Request, res: Response) => {
    if(!req.userId) return res.sendStatus(401);
    try {
        const rawTracks = await LikedTrackModel.find({ likedUserId: req.userId }).lean()
        return res.json({ status: 'ok', tracks: rawTracks.map((track: ILikedTrack) => ({ providerId: track.providerId, providerTrackId: track.providerTrackId, trackData: track.trackData })) })
    } catch (error) {
        return res.status(500).json({ status: 'error', error });
    }
})

router.delete('/:trackId', async (req: Request, res: Response) => {
    const trackId = req.params.trackId
    const providerId = req.body.providerId
    if(!req.userId) return res.sendStatus(401);
    try {
        await LikedTrackModel.deleteOne({ likedUserId: req.userId, providerId, providerTrackId: trackId })
        return res.json({ status: 'ok' })
    } catch (error) {
        return res.status(500).json({ status: 'error', error });
    }
})

router.get('/:trackId', async (req: Request, res: Response) => {
    const trackId = req.params.trackId
    const providerId = req.body.providerId
    if(!req.userId) return res.sendStatus(401);
    try {
        const track = await LikedTrackModel.findOne({ likedUserId: req.userId, providerId, providerTrackId: trackId })
        return res.json({ status: 'ok', track })
    } catch (error) {
        return res.status(500).json({ status: 'error', error });
    }
})

router.post('/:trackId', async (req: Request, res: Response) => {
    const trackId = req.params.trackId
    const providerId = req.body.providerId
    if(!req.userId) return res.sendStatus(401);
    try{
        let track: SoundCloudTrack|null = null
        if(providerId === 'soundcloud'){
            if(!await validateTrackId(trackId)) return res.status(400).json({ status: 'error', error: 'track id is not valid' })
            track = await soundcloud(trackId) as SoundCloudTrack
        }else
            return res.status(400).json({ status: 'error', error: 'provider is not valid' })
        if(!track) 
            return res.status(404).json({ status: 'error', error: 'track not found' })
        await LikedTrackModel.updateOne({
            likedUserId: req.userId,
            providerId: providerId,
            providerTrackId: trackId
        }, {
            likedUserId: req.userId,
            providerId: providerId,
            providerTrackId: trackId,
            trackData: {
                title: track.name,
                thumbnail: track.thumbnail,
                duration: track.durationInSec,
                author: track.user.name
            }
        }, { new: true, upsert: true })
        return res.json({ status: 'ok' })
    }catch(error){
        return res.status(500).json({ status: 'error', error });
    }
})

async function validateTrackId(id: string): Promise<boolean>{
    return await so_validate(id) == 'track'
}

export default router