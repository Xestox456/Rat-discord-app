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

/* ───────────── 1. START WEB SERVER IMMEDIATELY ───────────── */
// We start this FIRST so Render sees the "Open Port" and keeps the app alive.
const PORT = process.env.PORT || 10000;
let botStatus = "❌ Bot is initializing...";

app.get('/', (req, res) => {
  // This lets you check status by visiting your Render URL
  res.send(`Render Check: Online <br> Bot Status: ${botStatus}`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Render Port satisfied: Listening on ${PORT}`);
});

/* ───────────── 2. DISCORD CLIENT CONFIG ───────────── */
console.log("🔄 Initializing Discord Client...");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    // GatewayIntentBits.MessageContent // Uncomment this if you need to read messages!
  ],
  partials: [Partials.Channel],
});

const sayCache = new Map();

client.once(Events.ClientReady, (c) => {
  botStatus = `✅ Logged in as ${c.user.tag}`;
  console.log(`🤖 SUCCESS: Logged in as ${c.user.tag}`);
});

client.on(Events.Error, (error) => {
    console.error("🔥 DISCORD CLIENT ERROR:", error);
});

/* ───────────── 3. INTERACTION LOGIC (Your Code) ───────────── */
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
       // Using flags properly for v14
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
        await interaction.deferUpdate(); // Prevent "Interaction Failed"
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
            await interaction.followUp({ content: 'Failed: ' + err.message, flags: MessageFlags.Ephemeral });
          }
          sayCache.delete(interaction.user.id);
        }
    }
  } catch (err) { console.error("Handler Error:", err); }
});

/* ───────────── 4. LOGIN WITH DEBUGGING ───────────── */
if (!process.env.TOKEN) {
  console.error('❌ CRITICAL: TOKEN is missing from Environment Variables!');
  botStatus = "❌ Error: Missing Token";
} else {
  console.log("🔑 Token detected (starts with: " + process.env.TOKEN.substring(0, 5) + "...)");
  console.log("🚀 Attempting login...");
  
  client.login(process.env.TOKEN)
    .catch(err => {
        console.error("❌ LOGIN FAILED. Details below:");
        console.error(err);
        botStatus = "❌ Login Failed: " + err.message;
    });
}
