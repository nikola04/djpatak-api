import '@discordjs/voice';
import 'express'
import 'ws'
import WebSocket, { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { Request } from 'express';
import { AudioPlayer, VoiceConnection } from '@discordjs/voice';
import { SoundCloudTrack } from 'play-dl';

declare module '@discordjs/voice' {
    interface VoiceConnection {
        player?: AudioPlayer;
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