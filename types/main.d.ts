import '@discordjs/voice';
import 'express'
import { Request } from 'express';
import { AudioPlayer, VoiceConnection } from '@discordjs/voice';
import { SoundCloudTrack } from 'play-dl';

declare module '@discordjs/voice' {
  interface VoiceConnection {
    player?: AudioPlayer;
    trackId?: number
  }
}
declare module 'express' {
  interface Request {
    userId?: string
  }
}