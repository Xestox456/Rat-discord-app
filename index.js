process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);

const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

console.log("BOOTING BOT...");

const app = express();
app.get("/", (req, res) => res.send("OK"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("SERVER LISTENING ON", PORT);
});

console.log("TOKEN EXISTS:", !!process.env.TOKEN);
console.log("TOKEN LENGTH:", process.env.TOKEN?.length);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on("debug", console.log);

client.once("ready", () => {
  console.log("✅ LOGGED IN AS", client.user.tag);
});

console.log("ATTEMPTING LOGIN...");
client.login(process.env.TOKEN);
