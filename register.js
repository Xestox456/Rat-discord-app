const { REST, Routes } = require('discord.js');
require('dotenv').config();

if (!process.env.TOKEN || !process.env.CLIENT_ID) {
  console.error('❌ Missing TOKEN or CLIENT_ID in .env');
  process.exit(1);
}

const commands = [
  {
    name: 'say',
    description: 'Make Rat say something',
    type: 1, // CHAT_INPUT
    integration_types: [0, 1], // 0 = guild install, 1 = user install
    contexts: [0, 1, 2], // 0 = guild, 1 = DM, 2 = group DM
    options: [
      {
        name: 'message',
        description: 'What should Rat say?',
        type: 3, // STRING
        required: true,
      },
    ],
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('🔄 Registering commands with DM + GC support...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Commands registered correctly!');
  } catch (err) {
    console.error('❌ Registration failed:', err);
  }
})();