import express from 'express';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { createClient } from 'redis';
import playDl from 'play-dl';
import cors from 'cors';
import v1Router from '@/routes/api/v1';
import authRouter from '@/routes/auth';
import { handleSocketServer } from '@/utils/sockets';

// INITIALIZATION
const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false }) as WebSocketServer;
const botClient = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});
const redisClient = createClient({
	password: process.env.REDIS_PSWD,
	socket: {
		host: process.env.REDIS_HOST,
		port: Number(process.env.REDIS_PORT),
	},
});
app.use(
	cors({
		origin: process.env.APP_URL,
		methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
		allowedHeaders: ['Content-Type', 'Access-Control-Allow-Origin'],
		credentials: true,
	})
);

// ROUTES
app.use('/api/v1/', v1Router);
app.use('/auth', authRouter);

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
	.connect(process.env.MONGODB_URI!)
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

export { app, botClient, redisClient };
