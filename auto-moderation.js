// src/commands/moderation/auto-moderation.js

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('auto-moderation')
        .setDescription('Configure les modules de modération automatique.'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const guildConfig = await prisma.guild.upsert({
            where: { guildId: interaction.guild.id },
            update: {},
            create: { guildId: interaction.guild.id },
        });

        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('⚙️ Panel de Configuration de l\'Auto-Modération')
            .setDescription('Activez ou désactivez les modules de protection automatique. L\'état actuel est affiché ci-dessous.')
            .addFields(
                { name: 'Anti-Spam', value: guildConfig.antiSpam ? 'Activé ✅' : 'Désactivé ❌', inline: true },
                { name: 'Anti-Liens', value: guildConfig.antiLink ? 'Activé ✅' : 'Désactivé ❌', inline: true },
                { name: 'Mots Interdits (IA)', value: guildConfig.badWordsAI ? 'Activé ✅' : 'Désactivé ❌', inline: true },
            )
            .setFooter({ text: 'P.PROTECT by Puffins' });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`automod_toggle_antilink`)
                    .setLabel('Anti-Liens')
                    .setStyle(guildConfig.antiLink ? ButtonStyle.Success : ButtonStyle.Danger),
                
                new ButtonBuilder()
                    .setCustomId('automod_toggle_badwordsai')
                    .setLabel('Mots Interdits (IA)')
                    .setStyle(guildConfig.badWordsAI ? ButtonStyle.Success : ButtonStyle.Danger),

                new ButtonBuilder()
                    .setCustomId('automod_toggle_antispam')
                    .setLabel('Anti-Spam')
                    .setStyle(guildConfig.antiSpam ? ButtonStyle.Success : ButtonStyle.Danger)
                    .setDisabled(true),
            );

        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },
};
