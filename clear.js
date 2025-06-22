// src/commands/moderation/clear.js (Version Finale - Syntaxiquement Parfaite)

// On ajoute MessageFlags à notre liste d'imports depuis discord.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Supprime un nombre de messages spécifié dans ce salon.')
        .addIntegerOption(option =>
            option.setName('nombre')
                .setDescription('Le nombre de messages à supprimer (entre 1 et 100).')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),
    async execute(interaction) {
        const amountToDelete = interaction.options.getInteger('nombre');

        // ---- LA CORRECTION EST ICI ----
        // Ancienne méthode : await interaction.deferReply({ ephemeral: true });
        // Nouvelle méthode :
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // Le reste du code ne change pas, car la logique est déjà parfaite.
        if (!interaction.channel.permissionsFor(interaction.client.user).has(PermissionFlagsBits.ManageMessages)) {
            const embedError = new EmbedBuilder()
                .setColor('#E74C3C') // Rouge
                .setTitle('❌ Erreur de Permission')
                .setDescription('Je n\'ai pas la permission `Gérer les messages` dans ce salon pour exécuter cette commande.');
            
            return interaction.editReply({ embeds: [embedError] });
        }

        try {
            const deletedMessages = await interaction.channel.bulkDelete(amountToDelete, true);

            const successEmbed = new EmbedBuilder()
                .setColor('#2ECC71') // Vert
                .setTitle('✅ Nettoyage Terminé')
                .setDescription(`J'ai supprimé **${deletedMessages.size}** message(s) avec succès.`)
                .setFooter({ text: `Note : Les messages de plus de 14 jours ne peuvent pas être supprimés.` });

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Erreur lors de la commande /clear:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('❌ Oh non !')
                .setDescription('Une erreur est survenue. Cela peut être dû à une tentative de suppression de messages dans un salon où il n\'y a rien à supprimer, ou une autre erreur de l\'API.');

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};