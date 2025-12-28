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
    GatewayIntentBits.MessageContent, // safe even if unused
  ],
  partials: [Partials.Channel],
});

/***********************
 * GATEWAY VISIBILITY
 ***********************/
client.on('debug', msg => {
  if (msg.includes('IDENTIFY') || msg.includes('READY')) {
    console.log('🛰️ DEBUG:', msg);
  }
});

client.on('shardError', err => {
  console.error('💥 SHARD ERROR:', err);
});

client.on('shardDisconnect', (_, shardId) => {
  console.warn(`⚠️ Shard ${shardId} disconnected`);
});

client.on('shardReconnecting', shardId => {
  console.warn(`🔄 Shard ${shardId} reconnecting`);
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
 * INTERACTIONS
 ***********************/
client.on(Events.InteractionCreate, async interaction => {
  try {
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

    if (interaction.customId === 'say_cancel') {
      sayCache.delete(interaction.user.id);
      return interaction.update({
        content: '❌ Cancelled.',
        components: [],
      });
    }

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
  }
});

/***********************
 * LOGIN (NO PROMISE CHAIN)
 ***********************/
if (!process.env.TOKEN) {
  console.error('❌ TOKEN missing — aborting');
  process.exit(1);
}

console.log('🔐 Calling client.login()');
client.login(process.env.TOKEN);
