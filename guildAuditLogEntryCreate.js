// src/events/guildAuditLogEntryCreate.js

const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const nukeTrack = new Map();

// On définit le "poids" de chaque action sensible
const threatScores = {
    [AuditLogEvent.MemberBanAdd]: 5,
    [AuditLogEvent.MemberKick]: 3,
    [AuditLogEvent.ChannelDelete]: 10,
    [AuditLogEvent.RoleDelete]: 10,
    [AuditLogEvent.WebhookCreate]: 8,
};

module.exports = {
    name: Events.GuildAuditLogEntryCreate,
    async execute(auditLogEntry, guild) {
        const guildConfig = await prisma.guild.findUnique({ where: { guildId: guild.id } });
        if (!guildConfig || !guildConfig.antiNukeEnabled) return;

        const { action, executorId, targetId } = auditLogEntry;

        // On ignore les actions non listées, le bot lui-même, ou le propriétaire du serveur
        if (!threatScores[action] || executorId === guild.client.user.id || executorId === guild.ownerId) {
            return;
        }

        const currentTime = Date.now();
        const timeframe = 60 * 1000; // 60 secondes
        const threshold = guildConfig.antiNukeThreshold;

        const userData = nukeTrack.get(executorId) || { score: 0, timestamps: [] };
        const recentTimestamps = userData.timestamps.filter(ts => currentTime - ts < timeframe);
        
        let currentScore = recentTimestamps.length > 0 ? userData.score : 0;
        currentScore += threatScores[action];
        recentTimestamps.push(currentTime);

        nukeTrack.set(executorId, { score: currentScore, timestamps: recentTimestamps });
        
        if (currentScore > threshold) {
            // ANTI-NUKE DÉCLENCHÉ !
            const member = await guild.members.fetch(executorId).catch(() => null);
            if (!member || !member.manageable) return; // Le bot ne peut pas agir sur cet utilisateur

            const logChannel = guildConfig.logChannelId ? await guild.channels.fetch(guildConfig.logChannelId).catch(() => null) : null;
            
            const alertEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('💥 ANTI-NUKE DÉCLENCHÉ (BEAST MODE) 💥')
                .addFields(
                    { name: 'Suspect', value: `${member.user.tag} (\`${member.id}\`)` },
                    { name: 'Score de Menace Atteint', value: `**${currentScore} / ${threshold}**` },
                    { name: 'Dernière Action Détectée', value: `\`${Object.keys(AuditLogEvent).find(key => AuditLogEvent[key] === action)}\`` }
                );

            if (guildConfig.antiNukeSimulationMode) {
                alertEmbed.setTitle('💥 ANTI-NUKE DÉCLENCHÉ (MODE SIMULATION) 💥')
                    .addFields({ name: 'Action Simulée', value: `L'action **${guildConfig.antiNukeAction}** aurait été appliquée.` });
            } else {
                // On applique la sanction
                switch (guildConfig.antiNukeAction) {
                    case 'QUARANTINE':
                        let qRole = guild.roles.cache.get(guildConfig.quarantineRoleId);
                        if (!qRole) { // On crée le rôle de quarantaine s'il n'existe pas
                            qRole = await guild.roles.create({ name: "P.PROTECT - Quarantaine", permissions: [], reason: "Anti-Nuke" });
                            await prisma.guild.update({ where: { guildId: guild.id }, data: { quarantineRoleId: qRole.id }});
                        }
                        await member.roles.set([qRole], "Action Anti-Nuke de P.PROTECT");
                        alertEmbed.addFields({ name: 'Action Appliquée', value: 'Mise en **Quarantaine**.' });
                        break;
                    case 'KICK':
                        await member.kick("Action Anti-Nuke de P.PROTECT");
                        alertEmbed.addFields({ name: 'Action Appliquée', value: '**Expulsion**.' });
                        break;
                    case 'BAN':
                        await member.ban({ reason: "Action Anti-Nuke de P.PROTECT" });
                        alertEmbed.addFields({ name: 'Action Appliquée', value: '**Bannissement**.' });
                        break;
                }
            }

            if (logChannel) await logChannel.send({ content: `@everyone Alerte de sécurité critique !`, embeds: [alertEmbed] });
            // On notifie le propriétaire du serveur
            const owner = await guild.fetchOwner();
            await owner.send({ embeds: [alertEmbed] }).catch(() => {});

            nukeTrack.set(executorId, { score: 0, timestamps: [] }); // Reset du score
        }
    }
};