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

/* ───────────── DISCORD CLIENT ───────────── */
const client = new Client({
  // Note: If you need to read message content, ensure GatewayIntentBits.MessageContent is here too
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel],
});

const sayCache = new Map();

/* ───────────── 1. MOVE SERVER START HERE ───────────── */
// Only start the web server once the bot is confirmed online
client.once(Events.ClientReady, (c) => {
  console.log(`🤖 Logged in as ${c.user.tag}`);
  
  // Start Express here
  const PORT = process.env.PORT || 10000;
  app.get('/', (req, res) => res.send('Bot is Online!'));
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌍 Web server is listening on port ${PORT}`);
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  // Use flags: MessageFlags.Ephemeral
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  try {
    /* ──────────────────────────────────────────────────
       YOUR INTERACTION LOGIC GOES HERE (UNCHANGED)
       (Kept your logic exactly as provided)
    ────────────────────────────────────────────────── */
    if (interaction.isChatInputCommand()) {
       await interaction.deferReply({ flags: MessageFlags.Ephemeral }); 
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'say') {
      const message = interaction.options.getString('message', true);
      sayCache.set(interaction.user.id, { message, channelId: interaction.channelId });

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('say_confirm').setLabel('Confirm').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('say_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
      );

      return interaction.editReply({ content: `⚠️ Send:\n> **${message}**`, components: [buttons] });
    }

    if (interaction.isButton()) {
        // Defer update for buttons to prevent "Interaction Failed" errors if logic is slow
        await interaction.deferUpdate(); 
        
        const cached = sayCache.get(interaction.user.id);
        
        if (interaction.customId === 'say_cancel') {
          sayCache.delete(interaction.user.id);
          return interaction.editReply({ content: '❌ Cancelled.', components: [] });
        }
    
        if (interaction.customId === 'say_confirm') {
          if (!cached) return interaction.editReply({ content: '⌛ Expired.', components: [] });
    
          await interaction.editReply({ content: '📤 Sending…', components: [] });
    
          try {
            await interaction.channel.send({
              content: cached.message,
              allowedMentions: { parse: ['users', 'roles', 'everyone'] },
            });
          } catch (err) {
            console.error("Failed to send message:", err); // Log this error!
            await interaction.followUp({
              content: 'Failed to send message: ' + err.message,
              flags: MessageFlags.Ephemeral
            });
          }
    
          sayCache.delete(interaction.user.id);
        }
    }
  } catch (err) { 
      console.error("Interaction Error:", err); // NEVER leave this silent during debugging
  }
});

if (!process.env.TOKEN) {
  console.error('❌ TOKEN is missing in Environment Variables');
  process.exit(1);
}

/* ───────────── 2. ADD ERROR CATCHER HERE ───────────── */
client.login(process.env.TOKEN).catch(err => {
    console.error("❌ FAILED TO LOGIN:");
    console.error(err);
    // Exit so Render knows the app crashed and tries to restart it
    process.exit(1);
});
