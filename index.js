require('dotenv').config();
const express = require('express'); 
const app = express();

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

/* ───────────── EXPRESS (LIGHTWEIGHT) ───────────── */
app.get('/', (req, res) => res.send('OK'));
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0'); // Succinct listen for Render

/* ───────────── DISCORD CLIENT ───────────── */
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel],
});

const sayCache = new Map();
client.once(Events.ClientReady, () => console.log(`🤖 ${client.user.tag}`));

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === 'say') {
      const message = interaction.options.getString('message', true);
      sayCache.set(interaction.user.id, { message, channelId: interaction.channelId });

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('say_confirm').setLabel('Confirm').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('say_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({ content: `⚠️ Send:\n> **${message}**`, components: [buttons], flags: MessageFlags.Ephemeral });
    }

    if (!interaction.isButton()) return;
    const cached = sayCache.get(interaction.user.id);

    if (interaction.customId === 'say_cancel') {
      sayCache.delete(interaction.user.id);
      return interaction.update({ content: '❌ Cancelled.', components: [] });
    }

    if (interaction.customId === 'say_confirm') {
      if (!cached) return interaction.update({ content: '⌛ Expired.', components: [] });

      await interaction.update({ content: '📤 Sending…', components: [] });

      try {
        // We use the interaction's own channel object first to avoid "Missing Access" fetch errors
        await interaction.channel.send({
          content: cached.message,
          allowedMentions: { parse: ['users', 'roles', 'everyone'] },
        });
      } catch (err) {
        // If the above fails, use the fallback followUp (Original Logic)
        await interaction.followUp({
          content: cached.message,
          allowedMentions: { parse: ['users', 'roles', 'everyone'] },
        });
      }

      sayCache.delete(interaction.user.id);
    }
  } catch (err) { /* Silent */ }
});

client.login(process.env.TOKEN);
