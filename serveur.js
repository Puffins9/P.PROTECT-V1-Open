// src/commands/utils/serveur.js (Version Améliorée)

const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');

const verificationLevels = {
    0: '🔓 Aucun',
    1: '🔒 Faible',
    2: '🔒 Moyen',
    3: '🔒 Élevé',
    4: '🔒 Très élevé'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serveur')
        .setDescription('Affiche un tableau de bord complet sur le serveur.'),

    async execute(interaction) {
        const guild = interaction.guild;
        await guild.members.fetch(); 
        const owner = await guild.fetchOwner();

        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
            .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
            .addFields(
                // ---- LIGNE 1 : INFOS PRINCIPALES ----
                { name: '👑 Propriétaire', value: `${owner.user.tag}`, inline: true },
                { name: '📅 Création', value: `<t:${parseInt(guild.createdTimestamp / 1000)}:D>`, inline: true },
                { name: '🔒 Vérification', value: `${verificationLevels[guild.verificationLevel]}`, inline: true },

                // ---- LIGNE 2 : STATS MEMBRES ----
                { name: '👨‍👩‍👧‍👦 Humains', value: `\`${guild.memberCount - guild.members.cache.filter(m => m.user.bot).size}\``, inline: true },
                { name: '🤖 Bots', value: `\`${guild.members.cache.filter(m => m.user.bot).size}\``, inline: true },
                { name: '🟢 Total', value: `\`${guild.memberCount}\``, inline: true },
                
                // ---- LIGNE 3 : STATS BOOSTS ----
                { name: '💎 Niveau Boost', value: `Niveau \`${guild.premiumTier || '0'}\``, inline: true },
                { name: '✨ Boosts', value: `\`${guild.premiumSubscriptionCount || '0'}\``, inline: true },
                { name: '\u200B', value: '\u200B', inline: true }, // <--- CHAMP ESPACEUR
                
                // ---- LIGNE 4 : STATS CONTENU ----
                { name: '📝 Salons', value: `\`${guild.channels.cache.size}\``, inline: true },
                { name: '😃 Emojis', value: `\`${guild.emojis.cache.size}\``, inline: true },
                { name: '📚 Rôles', value: `\`${guild.roles.cache.size}\``, inline: true },
            )
            .setTimestamp()
            .setFooter({ text: `P.PROTECT by Puffins | ID: ${guild.id}`, iconURL: interaction.client.user.displayAvatarURL() });

        if (guild.banner) {
            embed.setImage(guild.bannerURL({ size: 512 }));
        }

        await interaction.reply({ embeds: [embed] });
    },
};