// src/commands/utils/speedtest.js

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('speedtest')
        .setDescription('Mesure et affiche la latence du bot et de l\'API Discord.'),

    async execute(interaction) {
        // On met la réponse en attente, le temps de calculer les latences
        await interaction.deferReply({ ephemeral: true });

        // On mesure la latence de l'API (le "ping" direct avec les serveurs Discord)
        const apiLatency = Math.round(interaction.client.ws.ping);

        // On mesure la latence du bot (le temps de réponse complet de l'interaction)
        // C'est le temps entre le moment où l'utilisateur a envoyé la commande et le moment où le bot la traite.
        const botLatency = Date.now() - interaction.createdTimestamp;

        const embed = new EmbedBuilder()
            .setColor('#3498DB') // Bleu
            .setTitle('⚡ Speedtest de P.PROTECT')
            .setDescription('Voici les temps de réponse actuels :')
            .addFields(
                { name: 'Latence du Bot 🤖', value: `**${botLatency}** ms`, inline: true },
                { name: 'Latence de l\'API 🌐', value: `**${apiLatency}** ms`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'P.PROTECT by Puffins' });
        
        // On modifie la réponse d'attente avec l'embed final
        await interaction.editReply({ embeds: [embed] });
    },
};