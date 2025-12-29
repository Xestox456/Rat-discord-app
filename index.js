console.log('TOKEN EXISTS?', !!process.env.TOKEN);
require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags, // ✅ added
} = require('discord.js');

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
        flags: MessageFlags.Ephemeral, // ✅ fixed
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
  }
});

/* ───────────── LOGIN ───────────── */

if (!process.env.TOKEN) {
  console.error('❌ TOKEN is missing');
  process.exit(1);
}

client.login(process.env.TOKEN)
  .then(() => console.log('✅ Discord login success'))
  .catch(err => console.error('❌ Discord login failed:', err));
