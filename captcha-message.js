// src/commands/protection/captcha-message.js

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('captcha-message')
        .setDescription('Poste le message de vérification du Captcha dans ce salon.'),

    async execute(interaction) {
        const guildConfig = await prisma.guild.findUnique({ where: { guildId: interaction.guild.id }});

        if (!guildConfig || !guildConfig.captchaEnabled || !guildConfig.captchaVerifiedRoleId || !guildConfig.captchaUnverifiedRoleId) {
            return interaction.reply({ content: '❌ Le système Captcha n\'est pas activé ou entièrement configuré. Veuillez le faire via la commande `/protection`.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('Vérification Requise')
            .setDescription(`Bienvenue sur **${interaction.guild.name}** !\n\nPour accéder au reste du serveur et confirmer que vous n'êtes pas un robot, veuillez cliquer sur le bouton ci-dessous.`)
            .setFooter({ text: 'Ce processus garantit la sécurité de notre communauté.' });

        const button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('captcha_verify_button')
                    .setLabel('Se Vérifier')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
            );

        await interaction.channel.send({ embeds: [embed], components: [button] });
        await interaction.reply({ content: 'Le message de vérification a été posté.', ephemeral: true });
    }
};