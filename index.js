require('dotenv').config();
const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is alive 🐀');
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionType,
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

// simple in-memory cache
const sayCache = new Map();

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    /* ───────────── SLASH COMMAND ───────────── */
    if (
      interaction.type === InteractionType.ApplicationCommand &&
      interaction.commandName === 'say'
    ) {
      const message = interaction.options.getString('message', true);

      sayCache.set(interaction.user.id, {
        message,
        channelId: interaction.channelId,
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_say')
          .setLabel('Confirm')
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.reply({
        content: `You are about to send:\n> **${message}**`,
        components: [row],
        flags: 64, // ephemeral
      });
      return;
    }

    /* ───────────── BUTTON ───────────── */
    if (interaction.isButton() && interaction.customId === 'confirm_say') {
      const cached = sayCache.get(interaction.user.id);
      if (!cached) {
        await interaction.reply({
          content: '❌ Message expired.',
          flags: 64,
        });
        return;
      }

      // 1️⃣ acknowledge button immediately (NO FAILS)
      await interaction.update({
        content: 'Sending…',
        components: [],
        flags: 64,
      });

      let sent = false;

      // 2️⃣ try channel send (servers / some GCs)
      try {
        const channel = await client.channels.fetch(cached.channelId);
        if (channel && channel.isTextBased?.()) {
          await channel.send({ content: cached.message });
          sent = true;
        }
      } catch {
        // ignore and fallback
      }

      // 3️⃣ fallback for DM / GC app context
      if (!sent) {
        await interaction.followUp({
          content: cached.message,
          ephemeral: false,
        });
      }

      sayCache.delete(interaction.user.id);
    }
  } catch (err) {
    console.error('Interaction error:', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Interaction failed.',
        flags: 64,
      }).catch(() => {});
    }
  }
});

client.login(process.env.TOKEN);
