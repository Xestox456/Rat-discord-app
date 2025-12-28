require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Events } = require('discord.js');

/* ---------- EXPRESS ---------- */
const app = require('express')();

const PORT = process.env.PORT;
if (!PORT) {
  console.error('❌ PORT not provided by Render');
  process.exit(1);
}

app.get('/', (_, res) => res.send('ok'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Listening on ${PORT}`);
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
