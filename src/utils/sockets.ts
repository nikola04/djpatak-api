import { Server } from 'http';
import { v4 as uuid } from 'uuid';
import { authenticateSocketHandshake } from '../middlewares/authenticate';
import { WebSocket, WebSocketServer } from 'ws';
import { Repeat } from 'types/player';
import { QueueTrack } from 'types/track';

const playerSocketsMap = new Map<string, string[]>();
const socketsMap = new Map<string, WebSocket>();

export function handleSocketServer(httpServer: Server, wss: WebSocketServer) {
	httpServer.on('upgrade', (req, socket, head) => {
		const auth = authenticateSocketHandshake(req);
		if (!auth) {
			socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
			socket.destroy();
			return;
		}
		// const { userId }  = auth
		wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
			const socketId = uuid();
			ws.socketId = socketId;
			socketsMap.set(socketId, ws);
			ws.on('message', (message) => {
				try {
					const { event, data } = JSON.parse(message.toString());
					if (event !== 'subscribe' || !data?.playerId) return unsubscribeSocket(socketId);
					const playerId = data.playerId;
					// TODO # check if user can listen this player
					subscribeSocket(playerId, socketId);
				} catch (err) {
					console.error(err);
				}
			});
			ws.on('close', () => deleteSocket(socketId));
			wss.emit('connection', ws, req);
		});
	});
}

export function getSubscribedSockets(playerId: string) {
	const socketIds = playerSocketsMap.get(playerId);
	return socketIds ?? null;
}

export function sendMessageToPlayerSockets(playerId: string, message: string) {
	const socketIds = getSubscribedSockets(playerId);
	if (!socketIds) return;
	socketIds.forEach((socketId) => {
		const socket = socketsMap.get(socketId);
		if (!socket) return;
		socket.send(message);
	});
}

export function subscribeSocket(playerId: string, socketId: string) {
	let playerSockets;
	if (!(playerSockets = playerSocketsMap.get(playerId))) playerSocketsMap.set(playerId, [socketId]);
	else if (!playerSockets.includes(socketId)) playerSocketsMap.set(playerId, [...playerSockets, socketId]);
	return socketId;
}
export function unsubscribeSocket(socketId: string) {
	playerSocketsMap.forEach((playerSockets, playerId) => {
		if (playerSockets.includes(socketId))
			playerSocketsMap.set(
				playerId,
				playerSockets.filter((socket) => socket != socketId)
			);
	});
}

export function deleteSocket(socketId: string) {
	for (const data of playerSocketsMap) {
		if (data[1].includes(socketId)) {
			if (data[1].length == 1) playerSocketsMap.delete(data[0]);
			else
				playerSocketsMap.set(
					data[0],
					data[1].filter((val) => val != socketId)
				);
			break;
		}
	}
	socketsMap.delete(socketId);
}

type EventType =
	| 'now-playing'
	| 'new-queue-songs'
	| 'remove-queue-song'
	| 'clear-queue'
	| 'no-queue-track'
	| 'queue-end'
	| 'pause'
	| 'resume'
	| 'repeat'
	| 'stop'
	| 'volume';
export function emitEvent(event: 'now-playing', playerId: string, track: QueueTrack): void;
export function emitEvent(event: 'new-queue-songs', playerId: string, tracks: QueueTrack[]): void;
export function emitEvent(event: 'remove-queue-song', playerId: string, queueId: string): void;
export function emitEvent(event: 'repeat', playerId: string, repeat: Repeat): void;
export function emitEvent(event: 'volume', playerId: string, volume: number): void;
export function emitEvent(
	event: Exclude<EventType, 'now-playing' | 'new-queue-songs' | 'repeat' | 'volume' | 'remove-queue-song'>,
	playerId: string
): void;
export function emitEvent(event: EventType, playerId: string, data?: QueueTrack | QueueTrack[] | Repeat | number | string): void {
	sendMessageToPlayerSockets(
		playerId,
		JSON.stringify({
			event,
			data,
		})
	);
}
