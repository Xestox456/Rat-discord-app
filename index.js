require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

/* ───────────── DISCORD CLIENT ───────────── */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

/* ───────────── TEMP CACHE ───────────── */

const sayCache = new Map();
const CACHE_TTL = 60_000;

function setCache(userId, data) {
  sayCache.set(userId, data);
  setTimeout(() => sayCache.delete(userId), CACHE_TTL);
}

/* ───────────── READY ───────────── */

client.once(Events.ClientReady, () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

/* ───────────── INTERACTIONS (FIXED) ───────────── */

client.on(Events.InteractionCreate, async interaction => {
  try {
    /* ───── SLASH COMMAND: /say ───── */
    if (interaction.isChatInputCommand() && interaction.commandName === 'say') {
      // 🔥 ACK IMMEDIATELY (NO TIMEOUTS)
      await interaction.deferReply({ flags: 64 });

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

      return interaction.editReply({
        content: `⚠️ You are about to send:\n> **${message}**`,
        components: [buttons],
      });
    }

    /* ───── BUTTONS ───── */
    if (!interaction.isButton()) return;

    await interaction.deferUpdate(); // 🔥 ACK BUTTON

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
        console.error('Send failed:', err);
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

/* ───────────── LOGIN ───────────── */

if (!process.env.TOKEN) {
  console.error('❌ TOKEN missing');
  process.exit(1);
}

client.login(process.env.TOKEN);
