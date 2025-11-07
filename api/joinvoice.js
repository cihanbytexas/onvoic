import { Client, GatewayIntentBits } from "discord.js";
import { joinVoiceChannel } from "@discordjs/voice";

export default async function handler(req, res) {
  // Sadece POST isteğine izin ver
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests are allowed" });
  }

  const { bot_token, guild_id, channel_id } = req.body;

  if (!bot_token || !guild_id || !channel_id) {
    return res.status(400).json({ error: "Eksik parametre! bot_token, guild_id ve channel_id gerekli." });
  }

  try {
    console.log("🎧 Bot başlatılıyor...");

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
      ]
    });

    // Bot giriş yapınca sese bağlanma işlemi
    client.once("ready", async () => {
      try {
        const guild = await client.guilds.fetch(guild_id);
        const channel = await guild.channels.fetch(channel_id);

        if (!channel || channel.type !== 2) {
          console.error("❌ Belirtilen kanal bir ses kanalı değil!");
          await client.destroy();
          return res.status(400).json({ error: "Belirtilen kanal ses kanalı değil!" });
        }

        joinVoiceChannel({
          channelId: channel.id,
          guildId: guild.id,
          adapterCreator: guild.voiceAdapterCreator,
          selfDeaf: false
        });

        console.log(`✅ Bot sese bağlandı: ${channel.name}`);
        setTimeout(() => client.destroy(), 10000); // 10 saniye sonra bağlantıyı kapat
        return res.status(200).json({ success: true, message: `Bot '${channel.name}' ses kanalına bağlandı.` });
      } catch (error) {
        console.error("❌ Ses kanalına bağlanırken hata:", error);
        await client.destroy();
        return res.status(500).json({ error: "Ses kanalına bağlanılamadı.", details: error.message });
      }
    });

    // Token ile giriş
    await client.login(bot_token);
  } catch (err) {
    console.error("❌ Genel hata:", err);
    return res.status(500).json({ error: "Sunucu hatası", details: err.message });
  }
}
