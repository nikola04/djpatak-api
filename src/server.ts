import mongoose from 'mongoose';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { createClient } from 'redis';
import playDl from 'play-dl';
import { handleSocketServer } from '@/utils/sockets';
import app from './app';

// INITIALIZATION
const httpServer = createServer(app);
const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false }) as WebSocketServer;
const botClient = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});
const redisClient = createClient({
	socket: {
		host: process.env.REDIS_HOST || 'redis',
		port: Number(process.env.REDIS_PORT || 6379),
	},
});


// EVENTS
handleSocketServer(httpServer, wss);

console.log('> Starting ...');

botClient
	.once(Events.ClientReady, (readyClient) => console.log('✅', `Bot Ready! Logged in as ${readyClient.user.tag}!`))
	.login(process.env.DISCORD_CLIENT_TOKEN)
	.catch((err) => {
		console.error('❌', 'Bot Connection Error:', err);
	});

mongoose
	.connect(process.env.MONGODB_URI ?? `mongodb://mongo/`)
	.then(() => console.log('✅', 'MongoDB Connected!'))
	.catch((err) => {
		console.error('❌', 'MongoDB Not Connected: ', err);
	});

redisClient
	.connect()
	.then(() => {
		console.log('✅', 'Redis Connected!');
		redisClient
			.flushDb()
			.then(() => console.log('✅', 'Redis Cleared!'))
			.catch((err) => console.error('❌', 'Redis Error while cleaning:', err));
	})
	.catch((err) => {
		console.error('❌', 'Redis Not Connected: ', err);
	});
httpServer.listen(process.env.PORT, () => console.log('✅', `Listening on http://localhost:${process.env.PORT}/`));
playDl.getFreeClientID().then((clientID: string) => {
	playDl.setToken({
		soundcloud: {
			client_id: clientID,
		},
	});
});

export { botClient, redisClient };
