// src/commands/protection/protection.js (FICHIER COMPLET FINAL)

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('protection')
        .setDescription('Affiche le panel de configuration des protections avancées.'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const guildConfig = await prisma.guild.upsert({
            where: { guildId: interaction.guild.id },
            update: {},
            create: { guildId: interaction.guild.id },
        });

        const embed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('🛡️ Citadelle P.PROTECT - Panel de Protection')
            .setDescription('Configurez ici les boucliers de défense actifs de votre serveur.')
            .addFields(
                { name: 'Système Captcha', value: guildConfig.captchaEnabled ? 'Activé ✅' : 'Désactivé ❌', inline: true },
                { name: 'Système Anti-Raid', value: guildConfig.antiRaidEnabled ? 'Activé ✅' : 'Désactivé ❌', inline: true },
                { name: 'Système Anti-Nuke', value: guildConfig.antiNukeEnabled ? `Activé ${guildConfig.antiNukeSimulationMode ? ' (Mode Simulation)' : ''} ✅` : 'Désactivé ❌', inline: true },
            )
            .setFooter({ text: 'P.PROTECT by Puffins' });

        const configButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('config_captcha_button').setLabel('Configurer le Captcha').setStyle(ButtonStyle.Secondary).setEmoji('🔐'),
                new ButtonBuilder().setCustomId('config_antiraid_button').setLabel('Configurer l\'Anti-Raid').setStyle(ButtonStyle.Secondary).setEmoji('🔥'),
                new ButtonBuilder().setCustomId('config_antinuke_button').setLabel('Configurer l\'Anti-Nuke').setStyle(ButtonStyle.Secondary).setEmoji('💥')
            );
        
        const analysisButton = new ActionRowBuilder()
            .addComponents(
                 new ButtonBuilder()
                    .setCustomId('security_analysis_button')
                    .setLabel("Analyser la Sécurité du Serveur")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🩺')
            );

        await interaction.editReply({ embeds: [embed], components: [configButtons, analysisButton] });
    },
};