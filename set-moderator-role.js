const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-moderator-role')
        .setDescription('Définit le rôle qui aura accès aux commandes de modération.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Seuls les vrais admins peuvent utiliser cette commande
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Le rôle à désigner comme rôle modérateur.')
                .setRequired(true)
        ),

    async execute(interaction) {
        const selectedRole = interaction.options.getRole('role');

        try {
            await prisma.guild.upsert({
                where: { guildId: interaction.guild.id },
                update: { moderatorRoleId: selectedRole.id },
                create: { 
                    guildId: interaction.guild.id,
                    moderatorRoleId: selectedRole.id 
                },
            });

            const successEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setDescription(`✅ Le rôle ${selectedRole} a bien été défini comme rôle modérateur pour ce serveur.`);

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

        } catch (error) {
            console.error("Erreur lors de la configuration du rôle modérateur :", error);
            await interaction.reply({ content: '❌ Une erreur est survenue lors de la mise à jour de la configuration.', ephemeral: true });
        }
    },
};