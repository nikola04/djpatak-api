import PlaylistModel from "@/models/playlist.model";
import PlaylistTrackModel from "@/models/playlistTracks.model";
import { botClient } from "@/server";
import {
  PlayerState,
  playQueueTrack,
  initializePlayer,
  initializeDefaultPlayerEvents,
} from "@/utils/player";
import { addTracks, deleteQueue } from "@/utils/queueTracks";
import { emitEvent } from "@/utils/sockets";
import { getOrInitVoiceConnection } from "@/utils/voiceConnection";
import { AudioPlayerStatus } from "@discordjs/voice";
import { Request, Response, Router } from "express";

// INIT
const router = Router({ mergeParams: true });

// ROUTES
router.post("/:playlistId", async (req: Request, res: Response) => {
  const userDiscordId = req.userDiscordId!;
  const playerId = req.params.playerId;
  const playlistId = req.params.playlistId;
  try {
    const playlist = await PlaylistModel.findById(playlistId).lean();
    if (!playlist)
      return res
        .status(404)
        .json({ status: "error", error: "Playlist is not found" });
    if (playlist.ownerUserId != req.userId)
      return res
        .status(403)
        .json({ status: "error", error: "You are not a playlist owner" });
    const guild = botClient.guilds.cache.get(playerId);
    if (!guild)
      return res
        .status(404)
        .json({ status: "error", error: "No Player Found" });
    const member = guild.members.cache.get(userDiscordId);
    if (!member)
      return res
        .status(403)
        .json({ status: "error", error: "You are not in Guild's Voice" });
    const channel = member.voice.channel;
    if (!channel)
      return res
        .status(403)
        .json({ status: "error", error: "You are not in Voice Channel" });
    const { connection, isNew } = await getOrInitVoiceConnection(channel);
    if (!isNew && guild.members.me?.voice.channelId != channel.id)
      return res
        .status(403)
        .json({ status: "error", error: "You must be in same channel as Bot" });
    const tracks = await PlaylistTrackModel.find({ playlistId }).lean();
    if (!tracks || tracks.length == 0)
      return res.status(404).json({
        status: "error",
        error: "Playlist is empty. No tracks to play",
      });
    if (!connection.player)
      initializePlayer(
        playerId,
        connection,
        initializeDefaultPlayerEvents(playerId),
      );
    await deleteQueue(playerId);
    emitEvent("clear-queue", playerId);
    const queueTracks = await addTracks(playerId, ...tracks);
    emitEvent("new-queue-songs", playerId, queueTracks);
    const state = await playQueueTrack(connection, queueTracks[0]);
    if (state == PlayerState.NoStream)
      return res.json({
        status: "error",
        error: "Stream Not Found",
        playerStatus:
          connection.player?.state.status === AudioPlayerStatus.Playing
            ? "playing"
            : "paused",
        queueTrack: null,
      });
    emitEvent("now-playing", playerId, queueTracks[0]);
    // if(track)
    // track.isLiked = await LikedTrackModel.findOne({ likedUserId: req.userId, providerId: 'soundcloud', providerTrackId: track?.track.permalink }) !== null
    return res.json({
      status: "ok",
      playerStatus: state == PlayerState.Playing ? "playing" : "paused",
      queueTrack: queueTracks[0],
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ status: "error", error: err });
  }
});

export default router;
