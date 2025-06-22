// deploy-commands.js

const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

const commands = [];
const foldersPath = path.join(__dirname, 'src', 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        }
    }
}


const rest = new REST().setToken(DISCORD_TOKEN);

(async () => {
    try {
        let route;
        if (GUILD_ID) {
            console.log(`Déploiement de ${commands.length} commandes sur le serveur de test...`);
            route = Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID);
        } else {
            console.log(`Déploiement de ${commands.length} commandes en global...`);
            route = Routes.applicationCommands(CLIENT_ID);
        }

        const data = await rest.put(route, { body: commands });
        console.log(`✅ ${data.length} commandes ont été (re)chargées avec succès.`);

    } catch (error) {
        console.error(error);
    }
})();
