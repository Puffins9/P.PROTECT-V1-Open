// src/events/guildMemberAdd.js (Version Finale avec Anti-Raid Configurable)

const { Events, EmbedBuilder } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const raidMap = new Map();
const lockdownStatus = new Map(); // Pour éviter les alertes multiples

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        const guildConfig = await prisma.guild.findUnique({
            where: { guildId: member.guild.id },
        });

        if (!guildConfig) return;

        // --- MODULE ANTI-RAID ---
        if (guildConfig.antiRaidEnabled && !lockdownStatus.get(member.guild.id)) {
            const currentTime = Date.now();
            const timeframe = guildConfig.antiRaidTimeframe * 1000;
            const threshold = guildConfig.antiRaidThreshold;
            const action = guildConfig.antiRaidAction;

            const userJoins = raidMap.get(member.guild.id) || [];
            const recentJoins = userJoins.filter(ts => currentTime - ts < timeframe);
            recentJoins.push(currentTime);
            raidMap.set(member.guild.id, recentJoins);

            if (recentJoins.length > threshold) {
                // RAID DÉTECTÉ !
                lockdownStatus.set(member.guild.id, true); // On active le verrouillage temporaire des alertes

                let actionDescription = "Aucune action configurée.";

                if (action === "KICK") {
                    if (member.kickable) await member.kick("Détection de raid massif par P.PROTECT.").catch(console.error);
                    actionDescription = "Les nouveaux arrivants seront **expulsés** pendant la durée du confinement.";
                } else { // Par défaut, ou si l'action est "CAPTCHA"
                    await prisma.guild.update({
                        where: { guildId: member.guild.id },
                        data: { captchaEnabled: true }
                    });
                    actionDescription = "Le système Captcha a été **activé de force**.";
                }
                
                if (guildConfig.logChannelId) {
                    const logChannel = await member.guild.channels.fetch(guildConfig.logChannelId).catch(() => null);
                    if (logChannel) {
                        const raidEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('🚨 ALERTE ANTI-RAID 🚨')
                            .setDescription(`Vague de **${recentJoins.length} arrivées en moins de ${guildConfig.antiRaidTimeframe} secondes** détectée !`)
                            .addFields({ name: 'Mesure automatique', value: actionDescription })
                            .setTimestamp()
                            .setFooter({ text: 'P.PROTECT | Surveillance Active' });
                        await logChannel.send({ content: `@here Alerte de sécurité !`, embeds: [raidEmbed] });
                    }
                }
                raidMap.set(member.guild.id, []);
                // Fin du verrouillage des alertes après 5 minutes
                setTimeout(() => lockdownStatus.set(member.guild.id, false), 300000); 
            }
        }

        // --- MODULE CAPTCHA ---
        const currentGuildConfig = await prisma.guild.findUnique({ where: { guildId: member.guild.id } });
        if (currentGuildConfig.captchaEnabled && currentGuildConfig.captchaUnverifiedRoleId) {
            try {
                const role = member.guild.roles.cache.get(currentGuildConfig.captchaUnverifiedRoleId);
                if (role) await member.roles.add(role);
            } catch (error) {
                console.error(`Impossible d'assigner le rôle Captcha sur ${member.guild.name}:`, error);
            }
        }
    },
};