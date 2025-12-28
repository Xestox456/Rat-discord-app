require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Events } = require('discord.js');

/* ---------- EXPRESS ---------- */
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is alive 🐀');
});

app.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

/* ---------- DISCORD ---------- */
if (!process.env.TOKEN) {
  console.error('❌ TOKEN missing');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (c) => {
  console.log(`🟢 READY as ${c.user.tag}`);
});

console.log('🔐 Attempting Discord login…');

client.login(process.env.TOKEN)
  .then(() => console.log('🔓 Login promise resolved'))
  .catch(err => console.error('❌ Login failed:', err));
