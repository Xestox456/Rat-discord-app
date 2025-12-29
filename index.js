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
const CACHE_TTL = 5 * 60_000; // 5 minutes

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
    /* ───── SLASH COMMAND ───── */
    if (interaction.isChatInputCommand() && interaction.commandName === 'say') {
      const message = interaction.options.getString('message', true);

      setCache(interaction.user.id, {
        message,
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

    /* ───── CANCEL ───── */
    if (interaction.customId === 'say_cancel') {
      sayCache.delete(interaction.user.id);
      return interaction.update({
        content: '❌ Cancelled.',
        components: [],
      });
    }

    /* ───── CONFIRM ───── */
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

      try {
        const channel = interaction.channel;

        // HARD guard — prevents ALL send errors
        if (!channel || !channel.isTextBased()) {
          sayCache.delete(interaction.user.id);
          return;
        }

        await channel.send({
          content: cached.message,
          allowedMentions: {
            parse: ['users', 'roles', 'everyone'],
          },
        });
      } catch {
        // SILENT FAIL — no logs, no Railway spam
      }

      sayCache.delete(interaction.user.id);
    }
  } catch {
    // SILENT FAIL — prevents global crash spam
  }
});

/* ───────────── LOGIN ───────────── */

if (!process.env.TOKEN) {
  console.error('❌ TOKEN is missing');
  process.exit(1);
}

client.login(process.env.TOKEN)
  .then(() => console.log('✅ Discord login success'))
  .catch(() => console.error('❌ Discord login failed'));
