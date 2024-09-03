import { Request, Response, Router } from "express";
import { botClient } from "@/server";
import { getOrInitVoiceConnection } from "@/utils/voiceConnection";
import { AudioPlayerStatus, getVoiceConnection } from "@discordjs/voice";
import {
  getAllTracks,
  getTrackByQueueId,
  removeTrackByQueueId,
} from "@/utils/queueTracks";
import {
  initializeDefaultPlayerEvents,
  initializePlayer,
  PlayerState,
  playNextTrack,
  playPrevTrack,
  playTrackByQueueId,
} from "@/utils/player";
import { emitEvent } from "@/utils/sockets";
import { isUserInGuildVoice } from "@/middlewares/user";

const router = Router({ mergeParams: true });

router.use(isUserInGuildVoice());

router.post("/next", async (req: Request, res: Response) => {
  // Getting current track
  const playerId = req.params.playerId;
  const userDiscordId = req.userDiscordId;
  try {
    const guild = botClient.guilds.cache.get(playerId)!;
    const member = guild.members.cache.get(userDiscordId!)!;
    const channel = member.voice.channel!;
    const connection = getVoiceConnection(playerId);
    if (!connection || !connection.player)
      return res
        .status(400)
        .json({ status: "error", error: "Player is not connected" });
    if (guild.members.me?.voice.channelId != channel.id)
      return res
        .status(403)
        .json({ status: "error", error: "You must be in same channel as Bot" });
    const { track, state } = await playNextTrack(connection, playerId);
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
    if (state == PlayerState.NoTrack)
      return res.json({
        status: "error",
        error: "Track Not Found, Current is removed from Queue",
        playerStatus:
          connection.player?.state.status === AudioPlayerStatus.Playing
            ? "playing"
            : "paused",
        queueTrack: null,
      });
    if (state == PlayerState.QueueEnd) emitEvent("queue-end", playerId);
    if (state == PlayerState.Playing) emitEvent("now-playing", playerId, track);
    // if(track)
    // track.isLiked = await LikedTrackModel.findOne({ likedUserId: req.userId, providerId: 'soundcloud', providerTrackId: track?.track.permalink }) !== null
    return res.json({
      status: "ok",
      playerStatus: state == PlayerState.Playing ? "playing" : "paused",
      queueTrack: track,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", error: err });
  }
});

router.post("/prev", async (req: Request, res: Response) => {
  const playerId = req.params.playerId;
  const userDiscordId = req.userDiscordId;
  try {
    const guild = botClient.guilds.cache.get(playerId)!;
    const member = guild.members.cache.get(userDiscordId!)!;
    const channel = member.voice.channel!;
    const connection = getVoiceConnection(playerId);
    if (!connection || !connection.player)
      return res
        .status(400)
        .json({ status: "error", error: "Player is not connected" });
    if (guild.members.me?.voice.channelId != channel.id)
      return res
        .status(403)
        .json({ status: "error", error: "You must be in same channel as Bot" });
    const { state, track } = await playPrevTrack(connection, playerId);
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
    if (state == PlayerState.NoTrack)
      return res.json({
        status: "error",
        error: "Track Not Found, Current is removed from Queue",
        playerStatus:
          connection.player?.state.status === AudioPlayerStatus.Playing
            ? "playing"
            : "paused",
        queueTrack: null,
      });
    if (state == PlayerState.QueueEnd) emitEvent("queue-end", playerId);
    if (state == PlayerState.Playing) emitEvent("now-playing", playerId, track);
    // if(track)
    // track.track.isLiked = await LikedTrackModel.findOne({ likedUserId: req.userId, providerId: 'soundcloud', providerTrackId: track?.track.permalink }) !== null
    return res.json({
      status: "ok",
      playerStatus: state == PlayerState.Playing ? "playing" : "paused",
      queueTrack: track,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", error: err });
  }
});

router.delete("/:queueId", async (req: Request, res: Response) => {
  const userDiscordId = req.userDiscordId;
  const playerId = req.params.playerId;
  const queueTrackId = req.params.queueId;
  try {
    const guild = botClient.guilds.cache.get(playerId)!;
    const member = guild.members.cache.get(userDiscordId!)!;
    const channel = member.voice.channel!;
    const connection = getVoiceConnection(playerId);
    if (!connection)
      return res
        .status(403)
        .json({ status: "error", error: "Bot is not in voice channel" });
    if (guild.members.me?.voice.channelId != channel.id)
      return res
        .status(403)
        .json({ status: "error", error: "You must be in same channel as Bot" });
    if (!(await removeTrackByQueueId(playerId, queueTrackId)))
      return res.json({ status: "error" });
    return res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", error: err });
  }
});

router.post("/:queueId", async (req: Request, res: Response) => {
  const userDiscordId = req.userDiscordId;
  const playerId = req.params.playerId;
  const queueTrackId = req.params.queueId;
  try {
    const guild = botClient.guilds.cache.get(playerId)!;
    const member = guild.members.cache.get(userDiscordId!)!;
    const channel = member.voice.channel!;
    const { connection, isNew } = await getOrInitVoiceConnection(channel);
    if (!isNew && guild.members.me?.voice.channelId != channel.id)
      return res
        .status(403)
        .json({ status: "error", error: "You must be in same channel as Bot" });
    if (!connection.player) {
      initializePlayer(
        playerId,
        connection,
        initializeDefaultPlayerEvents(playerId),
      );
    }
    connection.trackId = queueTrackId;
    const { state, track } = await playTrackByQueueId(
      connection,
      playerId,
      queueTrackId,
    );
    if (state == PlayerState.NoStream)
      return res.json({
        status: "error",
        error: "Error while getting stream",
        playerStatus:
          connection.player?.state.status === AudioPlayerStatus.Playing
            ? "playing"
            : "paused",
      });
    if (state == PlayerState.NoTrack)
      return res.json({
        status: "error",
        error: "No Track Found",
        playerStatus:
          connection.player?.state.status === AudioPlayerStatus.Playing
            ? "playing"
            : "paused",
      });
    if (state == PlayerState.Playing) emitEvent("now-playing", playerId, track);
    // if(track)
    // track.track.isLiked = await LikedTrackModel.findOne({ likedUserId: req.userId, providerId: 'soundcloud', providerTrackId: track?.track.permalink }) !== null
    return res.json({
      status: "ok",
      playerStatus: state == PlayerState.Playing ? "playing" : "paused",
      queueTrack: track,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", error: err });
  }
});

router.get("/current", async (req: Request, res: Response) => {
  // Getting current track
  const playerId = req.params.playerId;
  const userDiscordId = req.userDiscordId;
  try {
    const guild = botClient.guilds.cache.get(playerId)!;
    const member = guild.members.cache.get(userDiscordId!)!;
    const channel = member.voice.channel!;
    if (guild.members.me?.voice.channelId != channel.id)
      return res
        .status(403)
        .json({ status: "error", error: "You must be in same channel as Bot" });
    const connection = getVoiceConnection(playerId);
    if (!connection)
      return res
        .status(400)
        .json({ status: "error", error: "Player is not connected" });
    if (connection.trackId == null)
      return res.json({
        status: "ok",
        queueTrack: null,
        playerStatus: "paused",
      });
    const { track } = await getTrackByQueueId(playerId, connection.trackId);
    // if(track)
    // track.track.isLiked = await LikedTrackModel.findOne({ likedUserId: req.userId, providerId: 'soundcloud', providerTrackId: track?.track.permalink }) !== null
    const playerStatus =
      connection.player?.state.status == AudioPlayerStatus.Playing ||
      connection.player?.state.status == AudioPlayerStatus.Buffering
        ? "playing"
        : "paused";
    return res.json({
      status: "ok",
      queueTrack: track,
      playerStatus,
      playerPreferences: {
        repeat: connection.playerPreferences?.repeat,
        volume: connection.playerPreferences?.volume.getVolume(),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", error: err });
  }
});

router.get("/", async (req: Request, res: Response) => {
  // Getting current track
  const playerId = req.params.playerId;
  const userDiscordId = req.userDiscordId;
  try {
    const guild = botClient.guilds.cache.get(playerId)!;
    const member = guild.members.cache.get(userDiscordId!)!;
    const channel = member.voice.channel!;
    if (guild.members.me?.voice.channelId != channel.id)
      return res
        .status(403)
        .json({ status: "error", error: "You must be in same channel as Bot" });
    const connection = getVoiceConnection(playerId);
    if (!connection)
      return res
        .status(400)
        .json({ status: "error", error: "Player is not connected" });
    const queueTracks = await getAllTracks(playerId);
    return res.json({ status: "ok", results: queueTracks });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", error: err });
  }
});

export default router;
