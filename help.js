// src/commands/admin/help.js (Version Dynamique)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Affiche la liste de toutes les commandes disponibles et leurs descriptions.'),

    async execute(interaction) {
        const helpEmbed = new EmbedBuilder()
            .setColor('#3498DB') // Bleu
            .setAuthor({ name: `Menu d'aide de ${interaction.client.user.username}`, iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle('Voici la liste de toutes mes fonctionnalités')
            .setDescription('Je suis un bot de protection 100% Français conçu pour assurer la sécurité et la sérénité de votre serveur.')
            .setTimestamp()
            .setFooter({ text: `P.PROTECT by Puffins` });
        
        // Chemin vers le dossier des commandes
        const commandsPath = path.join(__dirname, '..'); // On remonte d'un niveau pour accéder au dossier 'commands'
        const commandFolders = fs.readdirSync(commandsPath);

        // On parcourt chaque dossier de catégorie
        for (const folder of commandFolders) {
            const folderPath = path.join(commandsPath, folder);
            const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
            
            if (commandFiles.length === 0) continue;

            const commandList = [];
            // On parcourt chaque fichier de commande dans la catégorie
            for (const file of commandFiles) {
                const command = require(path.join(folderPath, file));
                if (command.data) {
                    commandList.push(`\`/${command.data.name}\` : ${command.data.description}`);
                }
            }

            if (commandList.length > 0) {
                // On met la première lettre de la catégorie en majuscule pour un look plus pro
                const categoryName = folder.charAt(0).toUpperCase() + folder.slice(1);
                helpEmbed.addFields({ name: `🔹 ${categoryName}`, value: commandList.join('\n') });
            }
        }

        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    },
};