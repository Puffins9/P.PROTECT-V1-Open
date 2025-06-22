const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('moderation')
        .setDescription('Ouvre le panel de modération pour un utilisateur spécifique.')
        .addUserOption(option => 
            option.setName('utilisateur')
                .setDescription('L\'utilisateur que vous souhaitez modérer.')
                .setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('utilisateur');

        if (targetUser.id === interaction.user.id) {
            return interaction.reply({ content: 'Vous ne pouvez pas vous modérer vous-même.', flags: MessageFlags.Ephemeral });
        }

        const embed = new EmbedBuilder()
            .setColor('#F39C12')
            .setTitle(`🛡️ Panel de Modération`)
            .setDescription(`Actions disponibles pour **${targetUser.tag}**.\nChaque action sera enregistrée dans les logs.`)
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: 'P.PROTECT by Puffins' });
        
        const customId = `moderation_menu_select:${targetUser.id}`;

        const selectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(customId) 
                    .setPlaceholder('Choisissez une action...')
                    .addOptions([
                        { label: 'Bannir', description: 'Bannit définitivement le membre.', value: 'mod_ban', emoji: '🔨' },
                        { label: 'Expulser', description: 'Expulse le membre. Il pourra revenir.', value: 'mod_kick', emoji: '👢' },
                        { label: 'Avertir', description: 'Ajoute un avertissement au casier du membre.', value: 'mod_warn', emoji: '⚠️' },
                        { label: 'Consulter le casier', description: 'Affiche les avertissements du membre.', value: 'mod_casier', emoji: '📋' }
                    ])
            );
        
        // Correction appliquée ici
        await interaction.reply({ embeds: [embed], components: [selectMenu], flags: MessageFlags.Ephemeral });
    },
};