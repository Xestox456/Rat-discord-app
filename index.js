require('dotenv').config(); // MUST be first

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

console.log('🔑 TOKEN EXISTS?', !!process.env.TOKEN);

/* ───────────── WEB SERVER (Render-safe) ───────────── */

const app = express();

const PORT = process.env.PORT;
if (!PORT) {
  console.error('❌ PORT missing');
  process.exit(1);
}

app.get('/', (_, res) => res.send('Bot is alive 🐀'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Listening on ${PORT}`);
});

/* ───────────── DISCORD CLIENT ───────────── */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent, // REQUIRED on Render
  ],
  partials: [Partials.Channel],
});

/* ───────────── CACHE ───────────── */

const sayCache = new Map();
const CACHE_TTL = 60_000;

function setCache(userId, data) {
  sayCache.set(userId, data);
  setTimeout(() => sayCache.delete(userId), CACHE_TTL);
}

/* ───────────── READY ───────────── */

client.once(Events.ClientReady, () => {
  console.log('🟢 READY EVENT FIRED');
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

/* ───────────── INTERACTIONS ───────────── */

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // SLASH COMMAND
    if (interaction.isChatInputCommand() && interaction.commandName === 'say') {
      const message = interaction.options.getString('message', true);

      setCache(interaction.user.id, {
        message,
        channelId: interaction.channelId,
      });

      const row = new ActionRowBuilder().addComponents(
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
        components: [row],
        ephemeral: true,
      });
    }

    if (!interaction.isButton()) return;

    const cached = sayCache.get(interaction.user.id);

    // CANCEL
    if (interaction.customId === 'say_cancel') {
      sayCache.delete(interaction.user.id);
      return interaction.update({
        content: '❌ Cancelled.',
        components: [],
      });
    }

    // CONFIRM
    if (interaction.customId === 'say_confirm') {
      if (!cached) {
        return interaction.update({
          content: '⌛ Message expired.',
          components: [],
        });
      }

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
      } catch {}

      if (!sent) {
        await interaction.followUp({ content: cached.message });
      }

      sayCache.delete(interaction.user.id);
    }
  } catch (err) {
    console.error('❌ Interaction error:', err);

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

if (!process.env.TOKEN) {
  console.error('❌ TOKEN missing');
  process.exit(1);
}

console.log('🔐 Attempting Discord login…');

client
  .login(process.env.TOKEN)
  .then(() => console.log('🔓 Login promise resolved'))
  .catch(err => console.error('❌ Login failed:', err));
