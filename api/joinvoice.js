import { Client, GatewayIntentBits } from "discord.js";
import { joinVoiceChannel, getVoiceConnection } from "@discordjs/voice";
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "POST required" });

  const { bot_token, guild_id, channel_id, self_url } = req.body;

  if (!bot_token || !guild_id || !channel_id || !self_url)
    return res.status(400).json({ error: "Missing parameters" });

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

      let connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
      });

      console.log(`🎧 Joined ${channel.name}`);

      // 🔁 20 saniyede bir bağlantıyı yenile
      setInterval(() => {
        const conn = getVoiceConnection(guild.id);
        if (conn) {
          conn.rejoin();
          console.log("🔁 Refreshed connection");
        } else {
          console.log("⚠️ Connection lost. Rejoining...");
          connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
          });
        }
      }, 20_000);

      // 🔄 Keep Alive: Vercel’in süre aşımını engelle
      setInterval(async () => {
        try {
          await fetch(self_url);
          console.log("💓 Keep-alive ping sent!");
        } catch (err) {
          console.error("Keep-alive failed:", err);
        }
      }, 25_000);

      // ❗ Bağlantı koparsa otomatik yeniden bağlan
      connection.on("disconnect", () => {
        console.log("❌ Disconnected! Trying to rejoin...");
        setTimeout(() => {
          connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
          });
          console.log("🔄 Reconnected!");
        }, 5000);
      });

      return res.status(200).json({
        success: true,
        message: "Bot joined and will stay active in voice channel.",
      });
    } catch (err) {
      console.error("❌ Error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  client.login(bot_token);
}
