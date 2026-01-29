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

/* ───────────── EXPRESS FOR RENDER ───────────── */
app.get('/', (req, res) => res.send('Bot is Online!'));
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Listening on ${PORT}`));

/* ───────────── DISCORD CLIENT ───────────── */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

const sayCache = new Map();
const CACHE_TTL = 5 * 60_000; 

function setCache(userId, data) {
  sayCache.set(userId, data);
  setTimeout(() => sayCache.delete(userId), CACHE_TTL);
}

client.once(Events.ClientReady, () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === 'say') {
      const message = interaction.options.getString('message', true);
      setCache(interaction.user.id, { message, channelId: interaction.channelId });

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('say_confirm').setLabel('Confirm').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('say_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({
        content: `⚠️ You are about to send:\n> **${message}**`,
        components: [buttons],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!interaction.isButton()) return;
    
    // ✅ FIX: Defer the interaction immediately to prevent the 3-second timeout
    await interaction.deferUpdate(); 

    const cached = sayCache.get(interaction.user.id);

    if (interaction.customId === 'say_cancel') {
      sayCache.delete(interaction.user.id);
      // Now use editReply instead of update after deferring
      return interaction.editReply({ content: '❌ Cancelled.', components: [] }); 
    }

    if (interaction.customId === 'say_confirm') {
      if (!cached) {
         // Now use editReply instead of update after deferring
        return interaction.editReply({ content: '⌛ Message expired.', components: [] });
      }

      // We already deferred, so we don't need the 'Sending...' update message,
      // the "Bot is thinking..." message handles it.

      let sent = false;
      try {
        const channel = await client.channels.fetch(cached.channelId);
        if (channel && channel.isTextBased?.() && typeof channel.send === 'function') {
          await channel.send({
            content: cached.message,
            allowedMentions: { parse: ['users', 'roles', 'everyone'] },
          });
          sent = true;
        }
      } catch (err) {
        console.error('Send error:', err.message);
      }

      if (!sent) {
        // Use followUp after the initial deferUpdate
        await interaction.followUp({
          content: cached.message,
          allowedMentions: { parse: ['users', 'roles', 'everyone'] },
        });
      }

      sayCache.delete(interaction.user.id);
      // Remove the original "Bot is thinking..." message now that a public message is sent
      await interaction.deleteReply();
    }
  } catch (err) {
    console.error('❌ Interaction error:', err?.message ?? err);
  }
});

if (!process.env.TOKEN) {
  console.error('❌ TOKEN is missing');
  process.exit(1);
}

client.login(process.env.TOKEN)
  .then(() => console.log('✅ Discord login success'))
  .catch(err => console.error('❌ Discord login failed:', err));
