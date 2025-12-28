/***********************
 * ENV + HARD DIAGNOSTICS
 ***********************/
require('dotenv').config();

console.log('ENV KEYS:', Object.keys(process.env));
console.log('TOKEN EXISTS?', !!process.env.TOKEN);
console.log('TOKEN LENGTH:', process.env.TOKEN?.length);

process.on('unhandledRejection', err => {
  console.error('🔥 UNHANDLED REJECTION:', err);
});

process.on('uncaughtException', err => {
  console.error('🔥 UNCAUGHT EXCEPTION:', err);
});

/***********************
 * WEB SERVER (Render)
 ***********************/
const express = require('express');
const app = express();

const PORT = process.env.PORT || 10000;

app.get('/', (_, res) => res.send('Bot is alive 🐀'));
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Web server listening on ${PORT}`);
});

/***********************
 * DISCORD CLIENT
 ***********************/
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

/***********************
 * CACHE
 ***********************/
const sayCache = new Map();
const CACHE_TTL = 60_000;

function setCache(userId, data) {
  sayCache.set(userId, data);
  setTimeout(() => sayCache.delete(userId), CACHE_TTL);
}

/***********************
 * READY
 ***********************/
client.once(Events.ClientReady, () => {
  console.log('🟢 READY EVENT FIRED');
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

/***********************
 * INTERACTIONS (FIXED)
 ***********************/
client.on(Events.InteractionCreate, async interaction => {
  try {
    /* ---------- SLASH COMMAND ---------- */
    if (interaction.isChatInputCommand() && interaction.commandName === 'say') {
      // ✅ ACK IMMEDIATELY
      await interaction.deferReply({ flags: 64 });

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

      return interaction.editReply({
        content: `⚠️ You are about to send:\n> **${message}**`,
        components: [row],
      });
    }

    /* ---------- BUTTONS ---------- */
    if (!interaction.isButton()) return;

    // ✅ ACK BUTTON IMMEDIATELY
    await interaction.deferUpdate();

    const cached = sayCache.get(interaction.user.id);

    if (interaction.customId === 'say_cancel') {
      sayCache.delete(interaction.user.id);
      return interaction.editReply({
        content: '❌ Cancelled.',
        components: [],
      });
    }

    if (interaction.customId === 'say_confirm') {
      if (!cached) {
        return interaction.editReply({
          content: '⌛ Message expired.',
          components: [],
        });
      }

      let sent = false;

      try {
        const channel = await client.channels.fetch(cached.channelId);
        if (channel?.isTextBased()) {
          await channel.send(cached.message);
          sent = true;
        }
      } catch (err) {
        console.error('❌ Send failed:', err);
      }

      sayCache.delete(interaction.user.id);

      return interaction.editReply({
        content: sent ? '✅ Sent!' : '❌ Failed to send.',
        components: [],
      });
    }
  } catch (err) {
    console.error('❌ Interaction error:', err);
  }
});

/***********************
 * LOGIN
 ***********************/
console.log('🚀 About to login...');
client.login(process.env.TOKEN);

setInterval(() => {
  console.log('🫀 still alive');
}, 30_000);
if (!process.env.TOKEN) {
  console.error('❌ TOKEN missing — aborting');
  process.exit(1);
}

console.log('🔐 Calling client.login()');
client.login(process.env.TOKEN);
