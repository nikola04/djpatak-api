import { isUserInGuildVoice } from "@/middlewares/user";
import PlaylistModel from "@/models/playlist.model";
import PlaylistTrackModel from "@/models/playlistTracks.model";
import { botClient } from "@/server";
import {
  initializeDefaultPlayerEvents,
  initializePlayer,
  PlayerState,
  playQueueTrack,
} from "@/utils/player";
import { addDbTrack } from "@/utils/queueTracks";
import { emitEvent } from "@/utils/sockets";
import { getOrInitVoiceConnection } from "@/utils/voiceConnection";
import { AudioPlayerStatus, getVoiceConnection } from "@discordjs/voice";
import { Request, Response, Router } from "express";
import { QueueTrack } from "types/queue";

// INIT
const router = Router({ mergeParams: true });

// ROUTES
router.post("/:playlistId", async (req: Request, res: Response) => {
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
    const userDiscordId = req.userDiscordId;
    const forcePlay = req.query.force;
    const playerId = req.params.playerId;
    if (!userDiscordId) return res.sendStatus(401);
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
    if (!connection.player)
      initializePlayer(
        playerId,
        connection,
        initializeDefaultPlayerEvents(playerId),
      );
    // 2. Clear queue and add tracks
    const tracks = await PlaylistTrackModel.find({ playlistId }).lean();
    if (!tracks || tracks.length == 0)
      return res
        .status(404)
        .json({
          status: "error",
          error: "Playlist is empty. No tracks to play",
        });
    const queueTracks = (await addDbTrack(playerId, ...tracks)) as QueueTrack[];
    emitEvent("new-queue-song", playerId, queueTracks[0]);
    // 3. if player is not playing anything play added track
    if (
      connection.player?.state.status == AudioPlayerStatus.Idle ||
      forcePlay === "1"
    ) {
      connection.trackId = queueTracks[0].queueId;
      const playerState = await playQueueTrack(connection, queueTracks[0]);
      if (playerState == PlayerState.NoStream)
        return res
          .status(404)
          .json({
            status: "error",
            playerStatus: "paused",
            error: "Stream Not Found",
          });
      if (playerState == PlayerState.Playing)
        emitEvent("now-playing", playerId, queueTracks[0]);
      // if(forcePlay === '1')
      // Emit: {USER} skipped and played {SONG}
    }
    const playerStatus =
      connection.player?.state.status == AudioPlayerStatus.Playing ||
      connection.player?.state.status == AudioPlayerStatus.Buffering
        ? "playing"
        : "paused";
    return res.json({ status: "ok", playerStatus });
  } catch (err) {
    return res.status(500).json({ status: "error", error: err });
  }
});

export default router;
