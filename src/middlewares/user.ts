import { Request, Response, NextFunction } from 'express';
import { botClient } from '../server';

export const isUserInGuildVoice = () => {
	return (req: Request, res: Response, next: NextFunction) => {
		const playerId = req.params.playerId;
		const userDiscordId = req.userDiscordId;
		try {
			if (!userDiscordId) return res.sendStatus(401);
			const guild = botClient.guilds.cache.get(playerId);
			if (!guild) return res.status(404).json({ status: 'error', error: 'No Player Found' });
			const member = guild.members.cache.get(userDiscordId);
			if (!member) return res.status(403).json({ status: 'error', error: 'User is not in Guild Voice' });
			const channel = member.voice.channel;
			if (!channel) return res.status(403).json({ status: 'error', error: 'User Not in Voice Channel' });
			return next();
		} catch (err) {
			console.error(err);
			return res.status(500).json({ status: 'error', error: err });
		}
	};
};
