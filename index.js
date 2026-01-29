require('dotenv').config();
const express = require('express'); // Added for Render
const app = express();              // Added for Render

const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');

/* ───────────── EXPRESS SERVER (For Render) ───────────── */

// Render requires a web server to stay alive. 
// This creates a simple page that says "Online".
app.get('/', (req, res) => {
  res.send('Bot is Online!');
});

const PORT = process.env.PORT || 10000; // Render uses port 10000 by default
app.listen(PORT, () => {
  console.log(`🌐 Web server is listening on port ${PORT}`);
});

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
const CACHE_TTL = 5 * 60_000; 

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
        flags: MessageFlags.Ephemeral,
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

        if (
          channel &&
          channel.isTextBased?.() &&
          typeof channel.send === 'function'
        ) {
          await channel.send({
            content: cached.message,
            allowedMentions: {
              parse: ['users', 'roles', 'everyone'],
            },
          });
          sent = true;
        }
      } catch (err) {
          console.error('Channel fetch/send failed:', err.message);
      }

      if (!sent) {
        await interaction.followUp({
          content: `Fallback: ${cached.message}`,
          allowedMentions: {
            parse: ['users', 'roles', 'everyone'],
          },
          flags: MessageFlags.Ephemeral // Changed to ephemeral so fallbacks aren't public
        });
      }

      sayCache.delete(interaction.user.id);
    }
  } catch (err) {
    console.error('❌ Interaction error:', err?.message ?? err);
  }
});

/* ───────────── LOGIN ───────────── */

if (!process.env.TOKEN) {
  console.error('❌ TOKEN is missing');
  process.exit(1);
}

// Fixed login logic to ensure it doesn't crash the container on Render
client.login(process.env.TOKEN)
  .then(() => console.log('✅ Discord login success'))
  .catch(err => {
    console.error('❌ Discord login failed:', err);
    process.exit(1); // Force exit so Render can attempt a clean restart
  });
