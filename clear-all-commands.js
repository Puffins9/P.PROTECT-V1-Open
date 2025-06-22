// clear-all-commands.js

const { REST, Routes } = require('discord.js');
require('dotenv').config();

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error("Erreur : Assurez-vous que DISCORD_TOKEN, CLIENT_ID et GUILD_ID sont définis dans votre fichier .env");
    process.exit(1);
}

const rest = new REST().setToken(DISCORD_TOKEN);

async function clearCommands() {
    try {
        console.log('Début de la suppression de toutes les commandes...');

        // Promesse pour effacer les commandes de guilde (serveur de test)
        const clearGuild = rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: [] })
            .then(() => console.log('✅ Commandes de Guilde effacées avec succès.'));

        // Promesse pour effacer les commandes globales
        const clearGlobal = rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] })
            .then(() => console.log('✅ Commandes Globales effacées avec succès.'));

        // On exécute les deux en parallèle
        await Promise.all([clearGuild, clearGlobal]);

        console.log('Nettoyage complet terminé.');

    } catch (error) {
        console.error("Une erreur est survenue lors de la suppression des commandes:", error);
    }
}

clearCommands();