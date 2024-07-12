import '@discordjs/voice';
import { AudioPlayer, VoiceConnection } from '@discordjs/voice';
import { SoundCloudTrack } from 'play-dl';

declare module '@discordjs/voice' {
  interface VoiceConnection {
    player?: AudioPlayer;
    trackId?: number
  }
}