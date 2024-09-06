import { Request, Response, Router } from 'express';
import { isUserInGuildVoice } from '@/middlewares/user';
import { botClient } from '@/server';
import { AudioPlayerStatus, getVoiceConnection } from '@discordjs/voice';
import { emitEvent } from '@/utils/sockets';
import { initializePlayerPreferences } from '@/utils/player';
import { isRepeat } from '@/validators/playerPreferences';

// INIT
const router = Router({ mergeParams: true });
router.use(isUserInGuildVoice());

// ROUTES
router.post('/pause', async (req: Request, res: Response) => {
	const playerId = req.params.playerId;
	const userDiscordId = req.userDiscordId;
	try {
		const guild = botClient.guilds.cache.get(playerId)!;
		const member = guild.members.cache.get(userDiscordId!)!;
		const channel = member.voice.channel!;
		const connection = getVoiceConnection(playerId);
		if (!connection || !connection.player) return res.status(400).json({ status: 'error', error: 'Player is not connected' });
		if (guild.members.me?.voice.channelId != channel.id)
			return res.status(403).json({ status: 'error', error: 'You must be in same channel as Bot to pause' });
		if (connection.player.state.status != AudioPlayerStatus.Playing) return res.json({ status: 'error', error: 'Player is not playing anything' });
		connection.player.pause();
		emitEvent('pause', playerId);
		return res.json({ status: 'ok' });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ status: 'error', error: err });
	}
});

router.post('/resume', async (req: Request, res: Response) => {
	const playerId = req.params.playerId;
	const userDiscordId = req.userDiscordId;
	try {
		const guild = botClient.guilds.cache.get(playerId)!;
		const member = guild.members.cache.get(userDiscordId!)!;
		const channel = member.voice.channel!;
		const connection = getVoiceConnection(playerId);
		if (!connection || !connection.player) return res.status(400).json({ status: 'error', error: 'Player is not connected' });
		if (guild.members.me?.voice.channelId != channel.id)
			return res.status(403).json({ status: 'error', error: 'You must be in same channel as Bot to resume' });
		if (connection.player.state.status != AudioPlayerStatus.Paused) return res.json({ status: 'error', error: 'Player is not paused' });
		connection.player.unpause();
		emitEvent('resume', playerId);
		return res.json({ status: 'ok' });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ status: 'error', error: err });
	}
});

router.post('/stop', async (req: Request, res: Response) => {
	const playerId = req.params.playerId;
	const userDiscordId = req.userDiscordId;
	try {
		const guild = botClient.guilds.cache.get(playerId)!;
		const member = guild.members.cache.get(userDiscordId!)!;
		const channel = member.voice.channel!;
		const connection = getVoiceConnection(playerId);
		if (!connection || !connection.player) return res.status(400).json({ status: 'error', error: 'Player is not connected' });
		if (guild.members.me?.voice.channelId != channel.id)
			return res.status(403).json({ status: 'error', error: 'You must be in same channel as Bot to stop' });
		if (connection.player.state.status != AudioPlayerStatus.Paused) return res.json({ status: 'error', error: 'Player is not paused' });
		connection.player.stop();
		connection.trackId = null;
		emitEvent('stop', playerId);
		return res.json({ status: 'ok' });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ status: 'error', error: err });
	}
});

router.post('/repeat', async (req: Request, res: Response) => {
	const { set: newRepeat } = req.query;
	const playerId = req.params.playerId;
	const userDiscordId = req.userDiscordId;
	if (!isRepeat(newRepeat)) return res.status(400).json({ status: 'error', error: 'Query param set must be "queue", "track" or "off"' });
	try {
		const guild = botClient.guilds.cache.get(playerId)!;
		const member = guild.members.cache.get(userDiscordId!)!;
		const channel = member.voice.channel!;
		const connection = getVoiceConnection(playerId);
		if (!connection || !connection.player) return res.status(400).json({ status: 'error', error: 'Player is not connected' });
		if (guild.members.me?.voice.channelId != channel.id)
			return res.status(403).json({ status: 'error', error: 'You must be in same channel as Bot to set repeat' });
		if (!connection.playerPreferences) connection.playerPreferences = initializePlayerPreferences();
		if (connection.playerPreferences.repeat != newRepeat) emitEvent('repeat', playerId, newRepeat);
		connection.playerPreferences.repeat = newRepeat;
		return res.json({ status: 'ok' });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ status: 'error', error: err });
	}
});

router.post('/volume', async (req: Request, res: Response) => {
	const { set: newVolume } = req.query;
	const playerId = req.params.playerId;
	const userDiscordId = req.userDiscordId;
	if (isNaN(Number(newVolume)) || Number(newVolume) < 0 || Number(newVolume) > 1)
		return res.status(400).json({ status: 'error', error: 'Query param set must be between 0 and 1' });
	try {
		const volume = Number(newVolume);
		const guild = botClient.guilds.cache.get(playerId)!;
		const member = guild.members.cache.get(userDiscordId!)!;
		const channel = member.voice.channel!;
		const connection = getVoiceConnection(playerId);
		if (!connection || !connection.player) return res.status(400).json({ status: 'error', error: 'Player is not connected' });
		if (guild.members.me?.voice.channelId != channel.id)
			return res.status(403).json({ status: 'error', error: 'You must be in same channel as Bot to set volume' });
		if (!connection.playerPreferences) connection.playerPreferences = initializePlayerPreferences();
		if (connection.playerPreferences.volume.getVolume() == volume) return res.json({ status: 'ok' });
		emitEvent('volume', playerId, volume);
		connection.playerPreferences.volume.setVolume(volume);
		return res.json({ status: 'ok' });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ status: 'error', error: err });
	}
});

export default router;
