require('dotenv').config();

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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages, // ✅ REQUIRED
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

/* ───────── CACHE ───────── */

const sayCache = new Map();
const CACHE_TTL = 5 * 60_000;

function setCache(userId, data) {
  sayCache.set(userId, data);
  setTimeout(() => sayCache.delete(userId), CACHE_TTL);
}

/* ───────── READY ───────── */

client.once(Events.ClientReady, () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

/* ───────── INTERACTIONS ───────── */

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
      return interaction.update({ content: '❌ Cancelled.', components: [] });
    }

    if (interaction.customId === 'say_confirm') {
      if (!cached) {
        return interaction.update({
          content: '⌛ Message expired.',
          components: [],
        });
      }

      await interaction.deferUpdate();

      const channel = await client.channels.fetch(cached.channelId);

      if (!channel || !channel.isTextBased()) {
        return interaction.editReply({
          content: '❌ Cannot send in this channel.',
          components: [],
        });
      }

      await channel.send({
        content: cached.message,
        allowedMentions: {
          parse: ['users', 'roles', 'everyone'],
        },
      });

      await interaction.editReply({
        content: '✅ Sent.',
        components: [],
      });

      sayCache.delete(interaction.user.id);
    }
  } catch (err) {
    console.error('❌ Interaction error:', err);
  }
});

/* ───────── LOGIN ───────── */

if (!process.env.TOKEN) {
  console.error('❌ TOKEN missing');
  process.exit(1);
}

client.login(process.env.TOKEN);
