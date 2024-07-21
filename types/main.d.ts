import '@discordjs/voice';
import 'express'
import 'ws'
import { IncomingMessage } from 'http';
import { AudioPlayer } from '@discordjs/voice';
import { PlayerPrefrences } from './player';

declare module '@discordjs/voice' {
    interface VoiceConnection {
        player?: AudioPlayer;
        playerPreferences: PlayerPrefrences;
        trackId?: string|null;
    }
}
declare module 'express' {
    interface Request {
        userDiscordId?: string;
        userId?: string;
    }
}

declare module 'ws' {
    interface WebSocket {
        socketId?: string;
    }
    
    interface WebSocketServer {
        emit(event: 'connection', ws: WebSocket, request: IncomingMessage): boolean;
    }
}