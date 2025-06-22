// src/commands/utils/info.js (Version Améliorée)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const userFlags = {
    Staff: '🛠️ Employé Discord',
    Partner: '🤝 Partenaire Discord',
    Hypesquad: '🎉 Événements HypeSquad',
    BugHunterLevel1: '🐛 Chasseur de Bugs (Niv. 1)',
    BugHunterLevel2: '🐛 Chasseur de Bugs (Niv. 2)',
    HypeSquadOnlineHouse1: '🏠 Maison de la Bravoure',
    HypeSquadOnlineHouse2: '🏠 Maison de la Brillance',
    HypeSquadOnlineHouse3: '🏠 Maison de l\'Équilibre',
    PremiumEarlySupporter: '💎 Soutien de la Première Heure',
    TeamPseudoUser: '‍🏳️‍🌈 Utilisateur de l\'Équipe',
    VerifiedBot: '✅ Bot Vérifié',
    VerifiedDeveloper: '👨‍💻 Développeur de Bot Vérifié',
    CertifiedModerator: '🛡️ Modérateur Certifié',
    ActiveDeveloper: '👨‍💻 Développeur Actif',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Affiche une carte d\'identité complète sur un utilisateur.')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur sur lequel obtenir des informations.')
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
        const member = await interaction.guild.members.fetch(targetUser.id);
        const user = await targetUser.fetch({ force: true });

        const embed = new EmbedBuilder()
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setColor(member.displayHexColor === '#000000' ? '#3498db' : member.displayHexColor)
            .setDescription(`**ID :** \`${user.id}\``)
            .addFields(
                // Ligne 1: Dates
                { name: '📅 Compte créé', value: `<t:${parseInt(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '👋 Arrivée', value: `<t:${parseInt(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: '🤖 Bot', value: user.bot ? 'Oui' : 'Non', inline: true },

                // Ligne 2 : Informations de Rôle (non-inline pour prendre toute la largeur)
                { name: '⭐ Plus haut rôle', value: `${member.roles.highest}`, inline: false },
                { 
                    name: `📚 Rôles (${member.roles.cache.size - 1})`, 
                    value: member.roles.cache.size > 1 ? member.roles.cache.map(r => r).join(' ').replace('@everyone', '') : 'Aucun',
                    inline: false
                },

                // Ligne 3: Badges (non-inline pour prendre toute la largeur)
                {
                    name: '🏅 Badges',
                    value: user.flags.toArray().length > 0 ? user.flags.toArray().map(flag => userFlags[flag]).join('\n') : 'Aucun badge',
                    inline: false
                }
            )
            .setTimestamp()
            .setFooter({ text: `P.PROTECT by Puffins`, iconURL: interaction.client.user.displayAvatarURL() });

        if (user.banner) {
            embed.setImage(user.bannerURL({ dynamic: true, size: 512 }));
        }

        await interaction.reply({ embeds: [embed] });
    },
};