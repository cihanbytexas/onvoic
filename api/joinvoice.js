import { Client, GatewayIntentBits } from "discord.js";
import { joinVoiceChannel, getVoiceConnection } from "@discordjs/voice";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "POST required" });

  const { bot_token, guild_id, channel_id } = req.body;
  if (!bot_token || !guild_id || !channel_id)
    return res.status(400).json({ error: "Missing parameters" });

  try {
    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    });

    client.once("ready", async () => {
      console.log(`✅ Logged in as ${client.user.tag}`);

      try {
        const guild = await client.guilds.fetch(guild_id);
        const channel = await guild.channels.fetch(channel_id);

        if (!channel || channel.type !== 2)
          return res.status(400).json({ error: "Invalid voice channel" });

        // 🔊 İlk bağlantı
        let connection = joinVoiceChannel({
          channelId: channel.id,
          guildId: guild.id,
          adapterCreator: guild.voiceAdapterCreator,
        });

        console.log(`🎧 Joined ${channel.name}`);

        // 🔁 20 saniyede bir bağlantıyı yenile (kalıcılık için)
        setInterval(() => {
          const conn = getVoiceConnection(guild.id);
          if (conn) {
            try {
              conn.rejoin();
              console.log("🔁 Voice connection refreshed");
            } catch (err) {
              console.error("⚠️ Rejoin failed:", err);
            }
          } else {
            console.log("⚠️ Connection lost, trying to rejoin...");
            try {
              connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
              });
              console.log("🔄 Rejoined successfully");
            } catch (err) {
              console.error("❌ Rejoin error:", err);
            }
          }
        }, 20_000);

        // 🔌 Bağlantı koparsa yeniden bağlan
        connection.on("stateChange", (oldState, newState) => {
          if (newState.status === "disconnected") {
            console.log("❌ Disconnected! Attempting to reconnect...");
            setTimeout(() => {
              try {
                connection = joinVoiceChannel({
                  channelId: channel.id,
                  guildId: guild.id,
                  adapterCreator: guild.voiceAdapterCreator,
                });
                console.log("🔄 Reconnected after disconnect");
              } catch (err) {
                console.error("❌ Reconnect failed:", err);
              }
            }, 5000);
          }
        });

        return res.status(200).json({
          success: true,
          message: "Bot joined and will auto-refresh voice connection.",
        });
      } catch (err) {
        console.error("❌ Voice join error:", err);
        return res.status(500).json({ error: err.message });
      }
    });

    await client.login(bot_token);
  } catch (err) {
    console.error("❌ Fatal error:", err);
    return res.status(500).json({ error: err.message });
  }
}
