import '@discordjs/voice';
import { AudioPlayer, VoiceConnection } from '@discordjs/voice';

declare module '@discordjs/voice' {
  interface VoiceConnection {
    player?: AudioPlayer;
  }
}