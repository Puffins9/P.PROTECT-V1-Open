// src/commands/protection/urgence.js

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('urgence')
        .setDescription('Envoie une alerte d\'urgence au fondateur du bot en cas d\'attaque majeure.'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#E74C3C') // Rouge
            .setTitle('🔴 Procédure d\'Urgence')
            .setDescription(
                '**Attention !** Cette fonction ne doit être utilisée qu\'en cas d\'incident de sécurité majeur sur votre serveur (raid, nuke, etc.).\n\n' +
                'Elle enverra une alerte directe au fondateur de P.PROTECT, Puffins. Toute utilisation abusive pourra entraîner une interdiction d\'utiliser le bot.\n\n' +
                'Veuillez sélectionner la nature de l\'urgence ci-dessous.'
            );

        const selectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('urgence_raisons_menu')
                    .setPlaceholder('Sélectionnez la nature de l\'urgence...')
                    .addOptions([
                        {
                            label: 'Raid massif en cours',
                            description: 'Des centaines de comptes rejoignent et spamment.',
                            value: 'urgence_raid',
                            emoji: '🔥'
                        },
                        {
                            label: 'Tentative de "Nuke"',
                            description: 'Suppressions massives de salons ou de rôles.',
                            value: 'urgence_nuke',
                            emoji: '💥'
                        },
                        {
                            label: 'Compte administrateur compromis',
                            description: 'Un admin agit de manière malveillante.',
                            value: 'urgence_compromis',
                            emoji: '🔑'
                        },
                        {
                            label: 'Faille de sécurité découverte',
                            description: 'Une vulnérabilité a été trouvée dans la configuration.',
                            value: 'urgence_faille',
                            emoji: '🔎'
                        },
                        {
                            label: 'Autre raison critique',
                            description: 'Pour toute autre situation de crise non listée.',
                            value: 'urgence_autre',
                            emoji: '❓'
                        }
                    ])
            );
        
        await interaction.reply({ embeds: [embed], components: [selectMenu], flags: MessageFlags.Ephemeral });
    },
};