// src/commands/admin/maintenance.js (Version avec Menu Déroulant)

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('maintenance')
        .setDescription('Ouvre le panel de maintenance pour un ou plusieurs salons.')
        .addChannelOption(option => 
            option.setName('salon')
                .setDescription('Le salon concerné (actuel si non spécifié).')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        ),

    async execute(interaction) {
        const targetChannel = interaction.options.getChannel('salon') || interaction.channel;

        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle(`🔧 Panel de Maintenance`)
            .setDescription(`Veuillez choisir une action à effectuer pour le salon ${targetChannel}.`);

        // On intègre l'ID du salon dans le customId pour le retrouver plus tard
        const customId = `maintenance_menu:${targetChannel.id}`;

        const selectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(customId)
                    .setPlaceholder('Choisissez une action en français...')
                    .addOptions([
                        {
                            label: 'Verrouiller ce salon',
                            description: 'Empêche les membres d\'envoyer des messages ici.',
                            value: 'lock_channel',
                            emoji: '🔒'
                        },
                        {
                            label: 'Déverrouiller ce salon',
                            description: 'Autorise de nouveau les membres à parler ici.',
                            value: 'unlock_channel',
                            emoji: '🔓'
                        },
                        {
                            label: 'Verrouiller TOUS les salons',
                            description: 'Applique une maintenance sur tout le serveur.',
                            value: 'lock_all',
                            emoji: '🚨'
                        },
                        {
                            label: 'Déverrouiller TOUS les salons',
                            description: 'Lève la maintenance sur tout le serveur.',
                            value: 'unlock_all',
                            emoji: '✅'
                        }
                    ])
            );
        
        await interaction.reply({ embeds: [embed], components: [selectMenu], ephemeral: true });
    },
};