console.log('TOKEN EXISTS?', !!process.env.TOKEN);
require('dotenv').config();
const express = require('express');
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

/* ───────────── WEB SERVER (for Render / pingers) ───────────── */

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (_, res) => res.send('Bot is alive 🐀'));
app.listen(PORT, () =>
  console.log(`🌐 Web server running on port ${PORT}`)
);

/* ───────────── DISCORD CLIENT ───────────── */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

/* ───────────── TEMP CACHE (with expiry) ───────────── */

const sayCache = new Map();
const CACHE_TTL = 60_000; // 1 minute

function setCache(userId, data) {
  sayCache.set(userId, data);
  setTimeout(() => sayCache.delete(userId), CACHE_TTL);
}

/* ───────────── READY ───────────── */

client.once(Events.ClientReady, () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

/* ───────────── INTERACTIONS ───────────── */

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    /* ───── SLASH COMMAND: /say ───── */
    if (interaction.isChatInputCommand() && interaction.commandName === 'say') {
      const message = interaction.options.getString('message', true);

      setCache(interaction.user.id, {
        message,
        channelId: interaction.channelId,
      });

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('say_confirm')
          .setLabel('Confirm')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('say_cancel')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({
        content: `⚠️ You are about to send:\n> **${message}**`,
        components: [buttons],
        ephemeral: true,
      });
    }

    /* ───── BUTTONS ───── */
    if (!interaction.isButton()) return;

    const cached = sayCache.get(interaction.user.id);

    /* CANCEL */
    if (interaction.customId === 'say_cancel') {
      sayCache.delete(interaction.user.id);

      return interaction.update({
        content: '❌ Cancelled.',
        components: [],
      });
    }

    /* CONFIRM */
    if (interaction.customId === 'say_confirm') {
      if (!cached) {
        return interaction.update({
          content: '⌛ Message expired.',
          components: [],
        });
      }

      // acknowledge ONCE
      await interaction.update({
        content: '📤 Sending…',
        components: [],
      });

      let sent = false;

      try {
        const channel = await client.channels.fetch(cached.channelId);
        if (channel?.isTextBased()) {
          await channel.send(cached.message);
          sent = true;
        }
      } catch {
        // ignore
      }

      if (!sent) {
        await interaction.followUp({
          content: cached.message,
        });
      }

      sayCache.delete(interaction.user.id);
    }
  } catch (err) {
    console.error('❌ Interaction error:', err);

    // SAFE follow-up only (no crashes)
    if (interaction.isRepliable()) {
      try {
        await interaction.followUp({
          content: '❌ Something went wrong.',
          ephemeral: true,
        });
      } catch {}
    }
  }
});

/* ───────────── LOGIN ───────────── */

client.login(process.env.TOKEN);
