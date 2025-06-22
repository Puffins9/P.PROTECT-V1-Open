// src/events/messageCreate.js (CORRIGÉ AVEC ANTI-SPAM)

const { Events, PermissionFlagsBits, EmbedBuilder, Collection } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { isMessageToxic } = require('../utils/ai-moderator');

const linkRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;

// Structure pour la détection de spam
const spamMap = new Collection();
const SPAM_THRESHOLD = 5; // 5 messages...
const SPAM_TIMEFRAME = 5000; // ...en 5 secondes

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        const guildConfig = await prisma.guild.findUnique({ where: { guildId: message.guild.id } });
        if (!guildConfig) return;

        // Le bypass pour les modérateurs
        if (message.member && message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;

        // --- MODULE ANTI-SPAM (AJOUTÉ) ---
        if (guildConfig.antiSpam) {
            const now = Date.now();
            const userMessages = spamMap.get(message.author.id) || [];
            
            // On ajoute le timestamp actuel et on filtre les anciens
            userMessages.push(now);
            const recentMessages = userMessages.filter(ts => now - ts < SPAM_TIMEFRAME);
            spamMap.set(message.author.id, recentMessages);

            if (recentMessages.length >= SPAM_THRESHOLD) {
                try {
                    // On supprime les messages de spam de l'utilisateur
                    const messagesToDelete = await message.channel.messages.fetch({ limit: 100 });
                    const userSpamMessages = messagesToDelete.filter(msg => msg.author.id === message.author.id).first(SPAM_THRESHOLD);
                    await message.channel.bulkDelete(userSpamMessages, true);
                    
                    // On met l'utilisateur en sourdine
                    if (message.member.moderatable) {
                        await message.member.timeout(60 * 1000, "Détection de spam par P.PROTECT");
                    }

                    // On envoie un avertissement
                    const warningMessage = await message.channel.send(`**${message.author}, le spam n'est pas toléré. Vous avez été mis en sourdine pendant 1 minute.**`);
                    setTimeout(() => warningMessage.delete().catch(() => {}), 7000);
                    
                    spamMap.delete(message.author.id); // On réinitialise le compteur de l'utilisateur
                } catch (error) {
                    console.error("Erreur Anti-Spam:", error);
                }
                return;
            }
        }

        // --- MODULE ANTI-LIENS ---
        if (guildConfig.antiLink) {
            if (linkRegex.test(message.content)) {
                try {
                    await message.delete();
                    const warningMessage = await message.channel.send(`**${message.author}, les liens ne sont pas autorisés ici.**`);
                    setTimeout(() => warningMessage.delete().catch(() => {}), 5000);
                } catch (error) { console.error("Erreur Anti-Lien:", error); }
                return;
            }
        }
        
        // --- MODULE MOTS INTERDITS (IA) ---
        if (guildConfig.badWordsAI) {
            const isToxic = await isMessageToxic(message.content);
            if (isToxic) {
                try {
                    await message.delete();
                    const warningMessage = await message.channel.send(`**${message.author}, votre message a été jugé inapproprié par l'IA et supprimé.**`);
                    setTimeout(() => warningMessage.delete().catch(() => {}), 7000);

                    if (guildConfig.logChannelId) {
                        const logChannel = await message.guild.channels.fetch(guildConfig.logChannelId).catch(() => null);
                        if (logChannel) {
                            const logEmbed = new EmbedBuilder().setColor('#E74C3C').setAuthor({ name: 'IA : Message Toxique Détecté' })
                                .addFields(
                                    { name: 'Auteur', value: message.author.tag, inline: true },
                                    { name: 'Salon', value: message.channel.toString(), inline: true },
                                    { name: 'Message Supprimé', value: `\`\`\`${message.content}\`\`\`` }
                                ).setTimestamp();
                            logChannel.send({ embeds: [logEmbed] });
                        }
                    }
                } catch (error) { console.error("Erreur Anti-Mots Interdits (IA):", error); }
                return;
            }
        }
    },
};