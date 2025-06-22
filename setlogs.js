// src/commands/admin/setlogs.js

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlogs')
        .setDescription('Configure le salon où les logs de modération seront envoyés.') // Seuls les admins peuvent configurer
        .addChannelOption(option =>
            option.setName('salon')
                .setDescription('Le salon texte pour recevoir les logs.')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText) // On ne peut sélectionner qu'un salon textuel
        ),
    async execute(interaction) {
        const logChannel = interaction.options.getChannel('salon');

        await interaction.deferReply({ ephemeral: true });

        try {
            // On utilise upsert : crée la ligne si le serveur est nouveau, sinon met à jour. C'est robuste.
            await prisma.guild.upsert({
                where: { guildId: interaction.guild.id },
                update: { logChannelId: logChannel.id },
                create: { 
                    guildId: interaction.guild.id,
                    logChannelId: logChannel.id
                },
            });

            const successEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('✅ Configuration Réussie')
                .setDescription(`Le salon des logs a été correctement configuré sur ${logChannel}.`);

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error("Erreur lors de la configuration du salon de logs :", error);
            await interaction.editReply({ content: '❌ Une erreur est survenue lors de la mise à jour de la configuration.' });
        }
    },
};