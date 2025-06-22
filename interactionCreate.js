// src/events/interactionCreate.js (VERSION FINALE, COMPLÈTE ET SÉCURISÉE)

const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, MessageFlags, ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle, RoleSelectMenuBuilder } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getSecurityAdvice } = require('../utils/ai-moderator');

// ========================================================================================
// --- FONCTIONS HELPERS ---
// ========================================================================================

async function lockChannel(channel, reason) {
    try {
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { SendMessages: false });
        const lockEmbed = new EmbedBuilder().setColor('#E74C3C').setTitle('🔒 Salon Verrouillé').setDescription(`Ce salon a été temporairement verrouillé.`).addFields({ name: 'Raison', value: reason }).setTimestamp();
        await channel.send({ embeds: [lockEmbed] });
    } catch (error) { console.error(`Impossible de verrouiller ${channel.name}:`, error); }
}

async function unlockChannel(channel) {
    try {
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { SendMessages: null });
        const unlockEmbed = new EmbedBuilder().setColor('#2ECC71').setTitle('✅ Salon Déverrouillé').setDescription('Ce salon est de nouveau ouvert.');
        await channel.send({ embeds: [unlockEmbed] });
    } catch (error) { console.error(`Impossible de déverrouiller ${channel.name}:`, error); }
}

function getCaptchaConfigPayload(guildConfig) {
    const embed = new EmbedBuilder().setColor(guildConfig.captchaEnabled ? '#2ECC71' : '#E74C3C').setTitle('🔐 Configuration du Système Captcha').setDescription('Configurez ici le système de vérification.\n**Système Actuellement : ' + (guildConfig.captchaEnabled ? 'ACTIVÉ** ✅' : 'DÉSACIVÉ** ❌')).addFields({ name: "Rôle 'Non Vérifié'", value: guildConfig.captchaUnverifiedRoleId ? `<@&${guildConfig.captchaUnverifiedRoleId}>` : '`Non défini`', inline: true }, { name: "Rôle 'Membre'", value: guildConfig.captchaVerifiedRoleId ? `<@&${guildConfig.captchaVerifiedRoleId}>` : '`Non défini`', inline: true }).setFooter({ text: 'P.PROTECT by Puffins' });
    const components = [
        new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId('captcha_config_verifiedrole').setPlaceholder('2. Choisir le rôle "Membre" à donner...')),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('captcha_config_createrole').setLabel("1. Créer/Assigner Rôle Non Vérifié").setStyle(ButtonStyle.Primary).setEmoji('🪄'),
            new ButtonBuilder().setCustomId('captcha_config_toggle').setLabel(guildConfig.captchaEnabled ? 'Désactiver' : 'Activer').setStyle(guildConfig.captchaEnabled ? ButtonStyle.Danger : ButtonStyle.Success))
    ];
    return { embeds: [embed], components: [components], ephemeral: true };
}

async function runSecurityAnalysis(interaction) {
    await interaction.deferReply({ ephemeral: true });
    try {
        const { guild } = interaction;
        let securityScore = 100;
        const vulnerabilities = [];
        const allFields = [];
        const dangerousPerms = [PermissionFlagsBits.Administrator, PermissionFlagsBits.BanMembers, PermissionFlagsBits.KickMembers, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageWebhooks];
        const everyoneRole = guild.roles.everyone;
        const everyoneDangerousPerms = everyoneRole.permissions.toArray().filter(p => dangerousPerms.includes(p));
        if (everyoneDangerousPerms.length > 0) {
            securityScore -= 40;
            vulnerabilities.push(`Le rôle @everyone possède des permissions dangereuses (${everyoneDangerousPerms.join(', ')}).`);
            allFields.push({ name: '⚠️ Permissions @everyone', value: 'Critique ! Le rôle @everyone a des permissions sensibles.' });
        } else {
            allFields.push({ name: '✅ Permissions @everyone', value: 'Sécurisé.' });
        }
        if (guild.mfaLevel !== 1) {
            securityScore -= 25;
            vulnerabilities.push('L\'authentification à deux facteurs (2FA) n\'est pas requise pour les modérateurs.');
            allFields.push({ name: '⚠️ 2FA pour Modérateurs', value: 'Recommandé d\'activer cette option.' });
        } else {
            allFields.push({ name: '✅ 2FA pour Modérateurs', value: 'Activé.' });
        }
        if (guild.verificationLevel < 3) {
            securityScore -= 15;
            vulnerabilities.push(`Le niveau de vérification du serveur est bas.`);
            allFields.push({ name: '⚠️ Niveau de Vérification', value: 'Faible. Un niveau "Élevé" ou "Très Élevé" est recommandé.' });
        } else {
            allFields.push({ name: '✅ Niveau de Vérification', value: `Élevé ou plus.` });
        }
        const advice = await getSecurityAdvice(vulnerabilities);
        let adviceText = advice && advice.trim() !== '' ? advice : 'L\'IA n\'a pas pu fournir de conseil spécifique pour cette analyse.';
        if (adviceText.length > 1024) {
            adviceText = adviceText.substring(0, 1020) + '...';
        }
        allFields.push({ name: '🧠 Conseils de l\'IA', value: adviceText });
        const finalEmbed = new EmbedBuilder().setTitle(`🩺 Rapport de Sécurité pour ${guild.name}`).setDescription(`**Score de Sécurité : ${securityScore} / 100**`).addFields(allFields).setFooter({ text: `Score de Sécurité estimé` });
        if (securityScore >= 80) finalEmbed.setColor('#2ECC71');
        else if (securityScore >= 50) finalEmbed.setColor('#F1C40F');
        else finalEmbed.setColor('#E74C3C');
        await interaction.editReply({ embeds: [finalEmbed] });
    } catch (error) {
        console.error('Erreur capturée dans runSecurityAnalysis :', error);
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ content: '❌ Oups, une erreur critique est survenue lors de la génération du rapport.', embeds: [], components: [] });
        }
    }
}


module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {

        // --- VERROU DE SÉCURITÉ BASÉ SUR LES RÔLES ---
        const publicCommands = ['help', 'info', 'serveur', 'speedtest'];
        const protectedPrefixes = ['moderation_', 'maintenance_', 'config_', 'automod_', 'captcha_config', 'warn_modal', 'kick_modal', 'ban_modal', 'urgence_'];
        
        let isProtected = false;
        
        if (interaction.isChatInputCommand() && !publicCommands.includes(interaction.commandName)) {
            isProtected = true;
        } else if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
            if (protectedPrefixes.some(prefix => interaction.customId.startsWith(prefix))) {
                isProtected = true;
            }
        }

        if (isProtected) {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                const guildConfig = await prisma.guild.findUnique({ where: { guildId: interaction.guild.id } });
                const modRoleId = guildConfig?.moderatorRoleId;

                if (!modRoleId) {
                    return interaction.reply({
                        content: "❌ Aucun rôle modérateur n'a été configuré sur ce serveur. Un administrateur doit d'abord utiliser la commande `/set-moderator-role`.",
                        ephemeral: true,
                    });
                }

                if (!interaction.member.roles.cache.has(modRoleId)) {
                    return interaction.reply({
                        content: "❌ Vous n'avez pas le rôle requis pour effectuer cette action.",
                        ephemeral: true,
                    });
                }
            }
        }
        // --- FIN DU VERROU DE SÉCURITÉ ---


        try {
            // GESTION DES COMMANDES SLASH (/)
            if (interaction.isChatInputCommand()) {
                const command = interaction.client.commands.get(interaction.commandName);
                if (command) {
                    await command.execute(interaction);
                }
            }
            // GESTION DES MENUS DÉROULANTS
            else if (interaction.isStringSelectMenu()) {
                if (interaction.customId.startsWith('moderation_menu_select')) {
                    const targetUserId = interaction.customId.split(':')[1];
                    const selectedAction = interaction.values[0];
                    let modal;
                    switch (selectedAction) {
                        case 'mod_warn': modal = new ModalBuilder().setCustomId(`warn_modal:${targetUserId}`).setTitle('Avertir un membre'); modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('moderation_reason_input').setLabel("Raison de l'avertissement ?").setStyle(TextInputStyle.Paragraph).setRequired(true))); await interaction.showModal(modal); break;
                        case 'mod_kick': modal = new ModalBuilder().setCustomId(`kick_modal:${targetUserId}`).setTitle('Expulser un membre'); modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('moderation_reason_input').setLabel("Raison de l'expulsion (optionnel)").setStyle(TextInputStyle.Paragraph).setRequired(false))); await interaction.showModal(modal); break;
                        case 'mod_ban': modal = new ModalBuilder().setCustomId(`ban_modal:${targetUserId}`).setTitle('Bannir un membre'); modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('moderation_reason_input').setLabel("Raison du bannissement (optionnel)").setStyle(TextInputStyle.Paragraph).setRequired(false))); await interaction.showModal(modal); break;
                        case 'mod_casier':
                            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                            const targetUser = await interaction.client.users.fetch(targetUserId).catch(() => null);
                            if (!targetUser) return interaction.editReply("Utilisateur introuvable.");
                            const warns = await prisma.warn.findMany({ where: { userId: targetUserId, guildId: interaction.guild.id }, orderBy: { createdAt: 'desc' } });
                            const casierEmbed = new EmbedBuilder().setColor('#3498DB').setAuthor({ name: `Casier judiciaire de ${targetUser.tag}`, iconURL: targetUser.displayAvatarURL() });
                            if (warns.length === 0) {
                                casierEmbed.setDescription('Cet utilisateur n\'a aucun avertissement.');
                            } else {
                                const warnsDescription = warns.slice(0, 10).map(warn => `**ID:** \`${warn.id}\` - <t:${parseInt(warn.createdAt.getTime() / 1000)}:d> - Par: <@${warn.moderatorId}>\n**Raison:** ${warn.reason}`).join('\n\n');
                                casierEmbed.setDescription(warnsDescription);
                                casierEmbed.setFooter({ text: `Affiche ${warns.length > 10 ? 'les 10 derniers' : 'tous les'} avertissement(s) | Total: ${warns.length}` });
                            }
                            await interaction.editReply({ embeds: [casierEmbed] });
                            break;
                    }
                } else if (interaction.customId.startsWith('maintenance_menu')) {
                    const channelId = interaction.customId.split(':')[1];
                    const selectedAction = interaction.values[0];
                    switch (selectedAction) {
                        case 'lock_channel': case 'lock_all': {
                            const modal = new ModalBuilder().setCustomId(`maintenance_lock_modal:${channelId}:${selectedAction}`).setTitle('Raison du Verrouillage');
                            const reasonInput = new TextInputBuilder().setCustomId('maintenance_reason_input').setLabel('Veuillez spécifier la raison').setStyle(TextInputStyle.Short).setRequired(true);
                            modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
                            await interaction.showModal(modal);
                            break;
                        }
                        case 'unlock_channel': {
                            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                            const channel = await interaction.guild.channels.fetch(channelId);
                            await unlockChannel(channel);
                            await interaction.editReply({ content: `Le salon ${channel} a été déverrouillé.` });
                            break;
                        }
                        case 'unlock_all': {
                            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                            const textChannels = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
                            let count = 0;
                            for (const channel of textChannels.values()) { try { await unlockChannel(channel); count++; } catch (e) {} }
                            await interaction.editReply({ content: `✅ ${count} salons ont été déverrouillés.` });
                            break;
                        }
                    }
                } else if (interaction.customId === 'urgence_raisons_menu') {
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    const owner = await interaction.client.users.fetch(process.env.OWNER_ID).catch(() => null);
                    if (!owner) return interaction.editReply({ content: "Le propriétaire du bot n'a pas pu être trouvé." });
                    let invite;
                    try {
                        invite = await interaction.guild.invites.create(interaction.channel.id, { maxAge: 86400, maxUses: 1, temporary: true, reason: `Alerte d'urgence pour ${interaction.user.tag}` });
                    } catch (error) { return interaction.editReply({ content: "Je n'ai pas pu créer d'invitation." }); }
                    const reasonLabel = interaction.component.options.find(opt => opt.value === interaction.values[0]).label;
                    const alertEmbed = new EmbedBuilder().setColor('#FF0000').setTitle('🆘 ALERTE URGENCE 🆘').setThumbnail(interaction.guild.iconURL()).addFields({ name: 'Serveur en crise', value: `**${interaction.guild.name}** (\`${interaction.guild.id}\`)` }, { name: 'Membres', value: `${interaction.guild.memberCount}` }, { name: 'Lancée par', value: `${interaction.user.tag} (\`${interaction.user.id}\`)` }, { name: 'Nature de l\'urgence', value: reasonLabel }, { name: 'Lien d\'intervention', value: `[Cliquez ici pour rejoindre](${invite.url})` }).setTimestamp().setFooter({ text: 'Intervention requise' });
                    try {
                        await owner.send({ embeds: [alertEmbed] });
                        await interaction.editReply({ content: '✅ Alerte envoyée.' });
                    } catch (dmError) {
                        await interaction.editReply({ content: "Alerte générée, mais le fondateur a ses MPs fermés." });
                    }
                }
            }
            // GESTION DES MODALS
            else if (interaction.isModalSubmit()) {
                const moderator = interaction.user;
                if (interaction.customId.startsWith('ban_modal') || interaction.customId.startsWith('kick_modal') || interaction.customId.startsWith('warn_modal')) {
                    const reason = interaction.fields.getTextInputValue('moderation_reason_input') || 'Aucune raison spécifiée';
                    const targetUserId = interaction.customId.split(':')[1];
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
                    if (!targetMember) return interaction.editReply({ content: "Utilisateur introuvable." });
                    if (interaction.customId.startsWith('ban_modal')) {
                        if (!targetMember.bannable) return interaction.editReply({ content: "Je ne peux pas bannir cet utilisateur." });
                        await targetMember.send({ embeds: [new EmbedBuilder().setColor('#E74C3C').setTitle(`Banni de ${interaction.guild.name}`).addFields({ name: 'Raison', value: reason })] }).catch(() => {});
                        await targetMember.ban({ reason: reason });
                        const logEmbed = new EmbedBuilder().setColor('#E74C3C').setTitle('🔨 Bannissement').addFields({ name: 'Cible', value: `\`${targetMember.user.tag}\`` }, { name: 'Modérateur', value: `\`${moderator.tag}\`` }, { name: 'Raison', value: reason }).setTimestamp();
                        const guildData = await prisma.guild.findUnique({ where: { guildId: interaction.guild.id } });
                        if (guildData?.logChannelId) { const logChannel = await interaction.guild.channels.fetch(guildData.logChannelId).catch(() => null); if (logChannel) await logChannel.send({ embeds: [logEmbed] }); }
                        await interaction.editReply({ content: `✅ **${targetMember.user.tag}** a été banni.` });
                    } else if (interaction.customId.startsWith('kick_modal')) {
                        if (!targetMember.kickable) return interaction.editReply({ content: "Je ne peux pas expulser cet utilisateur." });
                        await targetMember.send({ embeds: [new EmbedBuilder().setColor('#F39C12').setTitle(`Expulsé de ${interaction.guild.name}`).addFields({ name: 'Raison', value: reason })] }).catch(() => {});
                        await targetMember.kick(reason);
                        const logEmbed = new EmbedBuilder().setColor('#F39C12').setTitle('👢 Expulsion').addFields({ name: 'Cible', value: `\`${targetMember.user.tag}\`` }, { name: 'Modérateur', value: `\`${moderator.tag}\`` }, { name: 'Raison', value: reason }).setTimestamp();
                        const guildData = await prisma.guild.findUnique({ where: { guildId: interaction.guild.id } });
                        if (guildData?.logChannelId) { const logChannel = await interaction.guild.channels.fetch(guildData.logChannelId).catch(() => null); if (logChannel) await logChannel.send({ embeds: [logEmbed] }); }
                        await interaction.editReply({ content: `✅ **${targetMember.user.tag}** a été expulsé.` });
                    } else if (interaction.customId.startsWith('warn_modal')) {
                        const guildData = await prisma.guild.upsert({ where: { guildId: interaction.guild.id }, update: {}, create: { guildId: interaction.guild.id } });
                        const newWarn = await prisma.warn.create({ data: { userId: targetUserId, moderatorId: moderator.id, reason: reason, guildId: interaction.guild.id } });
                        const logEmbed = new EmbedBuilder().setColor('#E67E22').setTitle('⚠️ Avertissement').addFields({ name: 'Cible', value: `\`${targetMember.user.tag}\`` }, { name: 'Modérateur', value: `\`${moderator.tag}\`` }, { name: 'Raison', value: reason }).setTimestamp().setFooter({ text: `ID: ${newWarn.id}` });
                        if (guildData.logChannelId) { const logChannel = await interaction.guild.channels.fetch(guildData.logChannelId).catch(() => null); if (logChannel) await logChannel.send({ embeds: [logEmbed] }); }
                        await interaction.editReply({ content: `✅ **${targetMember.user.tag}** a été averti.` });
                        await targetMember.send({ embeds: [new EmbedBuilder().setColor('#E67E22').setTitle(`Avertissement sur ${interaction.guild.name}`).addFields({ name: 'Raison', value: reason })] }).catch(() => {
                            interaction.followUp({ content: '⚠️ L\'utilisateur a ses MPs fermés.', flags: MessageFlags.Ephemeral });
                        });
                    }
                } else if (interaction.customId.startsWith('maintenance_lock_modal')) {
                    const [_, channelId, action] = interaction.customId.split(':');
                    const maintenanceReason = interaction.fields.getTextInputValue('maintenance_reason_input');
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    if (action === 'lock_channel') {
                        const channel = await interaction.guild.channels.fetch(channelId);
                        await lockChannel(channel, maintenanceReason);
                        await interaction.editReply({ content: `Le salon ${channel} a été verrouillé.` });
                    } else if (action === 'lock_all') {
                        const textChannels = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
                        let count = 0;
                        for (const channel of textChannels.values()) { try { await lockChannel(channel, maintenanceReason); count++; } catch (e) {} }
                        await interaction.editReply({ content: `🚨 ${count} salons ont été verrouillés.` });
                    }
                } else if (interaction.customId === 'config_antiraid_modal' || interaction.customId === 'config_antinuke_modal') {
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    if (interaction.customId === 'config_antiraid_modal') {
                        const threshold = parseInt(interaction.fields.getTextInputValue('antiraid_threshold_input'));
                        const timeframe = parseInt(interaction.fields.getTextInputValue('antiraid_timeframe_input'));
                        const action = interaction.fields.getTextInputValue('antiraid_action_input').toUpperCase();
                        const status = interaction.fields.getTextInputValue('antiraid_status_input').toLowerCase();
                        if (isNaN(threshold) || isNaN(timeframe) || threshold < 2 || timeframe < 2) { return interaction.editReply({ content: 'Erreur : Le seuil/période doit être un nombre > 1.' }); }
                        if (!['CAPTCHA', 'KICK'].includes(action)) { return interaction.editReply({ content: 'Erreur : L\'action doit être CAPTCHA ou KICK.' }); }
                        if (!['oui', 'non'].includes(status)) { return interaction.editReply({ content: 'Erreur : Le statut doit être "oui" ou "non".' }); }
                        await prisma.guild.update({ where: { guildId: interaction.guild.id }, data: { antiRaidThreshold: threshold, antiRaidTimeframe: timeframe, antiRaidAction: action, antiRaidEnabled: status === 'oui' } });
                        await interaction.editReply({ content: '✅ La configuration de l\'Anti-Raid a été mise à jour !' });
                    } else {
                        const threshold = parseInt(interaction.fields.getTextInputValue('antinuke_threshold_input'));
                        const action = interaction.fields.getTextInputValue('antinuke_action_input').toUpperCase();
                        const simMode = interaction.fields.getTextInputValue('antinuke_simmode_input').toLowerCase();
                        if (isNaN(threshold) || threshold < 10) return interaction.editReply({ content: 'Erreur : Le seuil de menace doit être un nombre >= 10.' });
                        if (!['QUARANTINE', 'KICK', 'BAN'].includes(action)) return interaction.editReply({ content: 'Erreur : L\'action doit être QUARANTINE, KICK, ou BAN.' });
                        if (!['oui', 'non'].includes(simMode)) return interaction.editReply({ content: 'Erreur : Le mode simulation doit être "oui" ou "non".' });
                        await prisma.guild.update({ where: { guildId: interaction.guild.id }, data: { antiNukeThreshold: threshold, antiNukeAction: action, antiNukeSimulationMode: simMode === 'oui', antiNukeEnabled: true } });
                        await interaction.editReply({ content: '✅ La configuration de l\'Anti-Nuke a été mise à jour !' });
                    }
                }
            }
            // GESTION DES BOUTONS
            else if (interaction.isButton()) {
                if (interaction.customId.startsWith('automod_toggle_')) {
                    await interaction.deferUpdate();
                    const moduleToToggle = interaction.customId.split('_').pop();
                    const currentConfig = await prisma.guild.findUnique({ where: { guildId: interaction.guild.id } });
                    let newConfigData = {};
                    if (moduleToToggle === 'antispam') newConfigData.antiSpam = !currentConfig.antiSpam;
                    if (moduleToToggle === 'antilink') newConfigData.antiLink = !currentConfig.antiLink;
                    if (moduleToToggle === 'badwordsai') newConfigData.badWordsAI = !currentConfig.badWordsAI;
                    const updatedConfig = await prisma.guild.update({ where: { guildId: interaction.guild.id }, data: newConfigData });
                    const newEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setFields({ name: 'Anti-Spam', value: updatedConfig.antiSpam ? 'Activé ✅' : 'Désactivé ❌', inline: true }, { name: 'Anti-Liens', value: updatedConfig.antiLink ? 'Activé ✅' : 'Désactivé ❌', inline: true }, { name: 'Mots Interdits (IA)', value: updatedConfig.badWordsAI ? 'Activé ✅' : 'Désactivé ❌', inline: true });
                    const newButtons = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('automod_toggle_antilink').setLabel('Anti-Liens').setStyle(updatedConfig.antiLink ? ButtonStyle.Success : ButtonStyle.Danger), new ButtonBuilder().setCustomId('automod_toggle_badwordsai').setLabel('Mots Interdits (IA)').setStyle(updatedConfig.badWordsAI ? ButtonStyle.Success : ButtonStyle.Danger), new ButtonBuilder().setCustomId('automod_toggle_antispam').setLabel('Anti-Spam').setStyle(updatedConfig.antiSpam ? ButtonStyle.Success : ButtonStyle.Danger));
                    await interaction.editReply({ embeds: [newEmbed], components: [newButtons] });
                } else if (interaction.customId === 'config_captcha_button') {
                    await interaction.deferUpdate();
                    const guildConfig = await prisma.guild.upsert({ where: { guildId: interaction.guild.id }, update: {}, create: { guildId: interaction.guild.id } });
                    const payload = getCaptchaConfigPayload(guildConfig);
                    await interaction.editReply(payload);
                } else if (interaction.customId === 'captcha_config_toggle') {
                    await interaction.deferUpdate();
                    const guildConfig = await prisma.guild.findUnique({ where: { guildId: interaction.guild.id } });
                    if (!guildConfig.captchaUnverifiedRoleId || !guildConfig.captchaVerifiedRoleId) {
                        return interaction.followUp({ content: '❌ Vous devez définir les deux rôles avant d\'activer le système.', ephemeral: true });
                    }
                    const updatedConfig = await prisma.guild.update({ where: { guildId: interaction.guild.id }, data: { captchaEnabled: !guildConfig.captchaEnabled } });
                    const payload = getCaptchaConfigPayload(updatedConfig);
                    await interaction.editReply(payload);
                } else if (interaction.customId === 'captcha_config_createrole') {
                    await interaction.deferUpdate();
                    let unverifiedRole = interaction.guild.roles.cache.find(r => r.name === "P.PROTECT - Non Vérifié");
                    if (!unverifiedRole) {
                        try {
                            unverifiedRole = await interaction.guild.roles.create({ name: 'P.PROTECT - Non Vérifié', permissions: [], reason: 'Rôle pour système Captcha de P.PROTECT' });
                            for (const channel of interaction.guild.channels.cache.values()) {
                                if (channel.isTextBased() || channel.isVoiceBased()) {
                                    await channel.permissionOverwrites.edit(unverifiedRole.id, { ViewChannel: false }).catch(() => {});
                                }
                            }
                        } catch (e) {
                            return interaction.followUp({ content: "Erreur lors de la création du rôle. Vérifiez mes permissions.", ephemeral: true });
                        }
                    }
                    const updatedConfig = await prisma.guild.update({ where: { guildId: interaction.guild.id }, data: { captchaUnverifiedRoleId: unverifiedRole.id } });
                    const payload = getCaptchaConfigPayload(updatedConfig);
                    await interaction.editReply(payload);
                } else if (interaction.customId === 'captcha_verify_button') {
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    const guildConfig = await prisma.guild.findUnique({ where: { guildId: interaction.guild.id } });
                    if (!guildConfig?.captchaEnabled || !guildConfig.captchaUnverifiedRoleId || !guildConfig.captchaVerifiedRoleId) { return interaction.editReply({ content: 'Le Captcha n\'est pas configuré.' }); }
                    const unverifiedRole = interaction.guild.roles.cache.get(guildConfig.captchaUnverifiedRoleId);
                    const verifiedRole = interaction.guild.roles.cache.get(guildConfig.captchaVerifiedRoleId);
                    if (!unverifiedRole || !verifiedRole) { return interaction.editReply({ content: 'Erreur de configuration des rôles.' }); }
                    if (interaction.member.roles.cache.has(unverifiedRole.id)) {
                        await interaction.member.roles.remove(unverifiedRole);
                        await interaction.member.roles.add(verifiedRole);
                        await interaction.editReply({ content: '✅ Vous avez été vérifié !' });
                    } else { await interaction.editReply({ content: 'Vous êtes déjà vérifié.' }); }
                } else if (interaction.customId === 'config_antiraid_button') {
                    const guildConfig = await prisma.guild.upsert({ where: { guildId: interaction.guild.id }, update: {}, create: { guildId: interaction.guild.id } });
                    const modal = new ModalBuilder().setCustomId('config_antiraid_modal').setTitle('Configuration du Système Anti-Raid');
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('antiraid_threshold_input').setLabel("Seuil de membres (Ex: 10)").setStyle(TextInputStyle.Short).setRequired(true).setValue(String(guildConfig?.antiRaidThreshold || 10))));
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('antiraid_timeframe_input').setLabel("Période en secondes (Ex: 10)").setStyle(TextInputStyle.Short).setRequired(true).setValue(String(guildConfig?.antiRaidTimeframe || 10))));
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('antiraid_action_input').setLabel("Action (CAPTCHA / KICK)").setStyle(TextInputStyle.Short).setRequired(true).setValue(guildConfig?.antiRaidAction || 'CAPTCHA')));
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('antiraid_status_input').setLabel("Activer le système ? (oui / non)").setStyle(TextInputStyle.Short).setRequired(true).setValue(guildConfig?.antiRaidEnabled ? 'oui' : 'non')));
                    await interaction.showModal(modal);
                } else if (interaction.customId === 'config_antinuke_button') {
                    const guildConfig = await prisma.guild.upsert({ where: { guildId: interaction.guild.id }, update: {}, create: { guildId: interaction.guild.id } });
                    const modal = new ModalBuilder().setCustomId('config_antinuke_modal').setTitle('Configuration du Système Anti-Nuke');
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('antinuke_threshold_input').setLabel("Seuil de menace (Ex: 25)").setStyle(TextInputStyle.Short).setRequired(true).setValue(String(guildConfig?.antiNukeThreshold || 25))));
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('antinuke_action_input').setLabel("Action (QUARANTINE / KICK / BAN)").setStyle(TextInputStyle.Short).setRequired(true).setValue(guildConfig?.antiNukeAction || 'QUARANTINE')));
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('antinuke_simmode_input').setLabel("Mode simulation ? (oui / non)").setStyle(TextInputStyle.Short).setRequired(true).setValue(guildConfig?.antiNukeSimulationMode ? 'oui' : 'non')));
                    await interaction.showModal(modal);
                } else if (interaction.customId === 'security_analysis_button') {
                    await runSecurityAnalysis(interaction);
                }
            }
            // GESTION DES MENUS DE SÉLECTION DE RÔLE
            else if (interaction.isRoleSelectMenu()) {
                if (interaction.customId === 'captcha_config_verifiedrole') {
                    await interaction.deferUpdate();
                    const roleId = interaction.values[0];
                    const updatedConfig = await prisma.guild.update({ where: { guildId: interaction.guild.id }, data: { captchaVerifiedRoleId: roleId } });
                    const payload = getCaptchaConfigPayload(updatedConfig);
                    await interaction.editReply(payload);
                }
            }
        } catch (error) {
            console.error(`Erreur sur une interaction (${interaction.customId} | ${interaction.type}):`, error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'Une erreur est survenue lors du traitement de cette interaction.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'Une erreur est survenue lors du traitement de cette interaction.', ephemeral: true });
            }
        }
    },
};