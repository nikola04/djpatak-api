import { Request, Response, Router } from "express";
import bodyParser from "body-parser";
import Playlist from "@/models/playlist.model";
import { IPlaylist } from "types/playlist";
import { isValidPlaylistName } from "@/validators/playlist";
import { isValidObjectId } from "mongoose";

// INIT
const router = Router();
router.use(bodyParser.json());

// ROUTES
router.post("/", async (req: Request, res: Response) => {
    const { name } = req.body;
    if (!req.userId) return res.sendStatus(401);
    if (!isValidPlaylistName(name))
        return res.status(400).json({ error: "Playlist Name must be between 2 and 24 alphabet characters only" });
    try {
        const exist = await Playlist.findOne({ ownerUserId: req.userId, name: name.trim() });
        if (exist != null)
            return res.status(409).json({ error: "You have already created playlist with that name" });
        const createdPlaylist: IPlaylist = await Playlist.create({
            ownerUserId: req.userId,
            name
        });
        return res.json({ playlist: createdPlaylist });
    } catch (error) {
        return res.status(500).json({ error });
    }
})

router.get("/", async (req: Request, res: Response) => {
    if (!req.userId) return res.sendStatus(401);
    try {
        const playlists = await Playlist.find({ ownerUserId: req.userId }).lean()
        return res.json({ playlists });
    } catch (error) {
        return res.status(500).json({ error });
    }
})

router.get("/:playlistId", async (req: Request, res: Response) => {
    const { playlistId } = req.params
    if (!req.userId) return res.sendStatus(401);
    if(!isValidObjectId(playlistId))
        return res.status(400).json({ error: "Playlist ID is Not Valid" });
    try {
        const playlist = await Playlist.findOne({ _id: playlistId, ownerUserId: req.userId }).lean()
        return res.json({ playlist });
    } catch (error) {
        return res.status(500).json({ error });
    }
})

router.patch("/:playlistId", async (req: Request, res: Response) => {
    const { playlistId } = req.params
    const { name: newName } = req.body
    if (!req.userId) return res.sendStatus(401);
    if(!isValidObjectId(playlistId))
        return res.status(400).json({ error: "Playlist ID is Not Valid" });
    if(!isValidPlaylistName(newName))
        return res.status(400).json({ error: "Playlist Name must be between 2 and 24 alphabet characters only" });
    try {
        const playlist = await Playlist.findOneAndUpdate({ _id: playlistId, ownerUserId: req.userId }, { $set: { name: newName.trim(), "metadata.lastModified": Date.now() }}, { new: true }).lean()
        if(playlist == null)
            return res.status(404).json({ error: "Playlist is Not Found" })
        return res.json({ playlist });
    } catch (error) {
        return res.status(500).json({ error });
    }
})

export default router;
