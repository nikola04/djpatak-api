import { entersState, getVoiceConnection, joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice";
import { GuildBasedChannel } from "discord.js";

async function initVoiceConnection(channel: GuildBasedChannel){
    const connection = joinVoiceChannel({
        guildId: channel.guildId,
        channelId: channel.id,
        adapterCreator: channel.guild.voiceAdapterCreator
    })
    connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 3_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 3_000),
            ]);
            // Seems to be reconnecting to a new channel - ignore disconnect
        } catch (err) {
            connection.destroy();
        }
    });
    return connection
}

async function getOrInitVoiceConnection(channel: GuildBasedChannel){
    const oldConnection = getVoiceConnection(channel.guildId)
    if(oldConnection) return oldConnection
    return await initVoiceConnection(channel)
}

export {
    getOrInitVoiceConnection,
    initVoiceConnection
}