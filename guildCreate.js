const { Events, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: Events.GuildCreate,
    once: false,
    async execute(guild) {
        console.log(`P.PROTECT a rejoint un nouveau serveur : ${guild.name} (ID: ${guild.id})`);

        // --- PARTIE 1 : MESSAGE DE BIENVENUE ---

        // On cherche un salon où envoyer le message de bienvenue
        let welcomeChannel = guild.systemChannel; // Le salon par défaut de Discord

        // Si le salon par défaut n'existe pas ou que le bot ne peut pas y écrire, on cherche un autre salon
        if (!welcomeChannel || !welcomeChannel.permissionsFor(guild.client.user).has(PermissionFlagsBits.SendMessages)) {
            welcomeChannel = guild.channels.cache.find(
                channel => channel.type === ChannelType.GuildText &&
                           channel.permissionsFor(guild.client.user).has(PermissionFlagsBits.SendMessages)
            );
        }

        // Si on a trouvé un salon, on envoie le message
        if (welcomeChannel) {
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('👋 Merci d\'avoir ajouté P.PROTECT !')
                .setDescription('Je suis prêt à sécuriser votre serveur. Pour une protection optimale, veuillez suivre ces quelques étapes de configuration rapide.')
                .setThumbnail(guild.client.user.displayAvatarURL())
                .addFields(
                    {
                        name: '1️⃣ Étape 1 : Le Salon des Logs (Essentiel)',
                        value: 'C\'est ici que toutes les alertes et actions de modération seront enregistrées. Il est crucial de le configurer.\n▶️ Utilisez la commande `/setlogs #votre-salon-logs`'
                    },
                    {
                        name: '2️⃣ Étape 2 : Le Rôle Modérateur',
                        value: 'Désignez un rôle qui aura accès aux commandes de protection. Les administrateurs y auront toujours accès.\n▶️ Utilisez `/set-moderator-role @VotreRôleModo`'
                    },
                    {
                        name: '3️⃣ Étape 3 : Activez les Boucliers',
                        value: 'Une fois les bases prêtes, explorez les commandes `/protection` et `/auto-moderation` pour activer les modules de sécurité selon vos besoins.'
                    },
                    {
                        name: '❓ Besoin d\'aide ?',
                        value: 'La commande `/help` est disponible à tout moment pour lister toutes mes fonctionnalités.'
                    }
                )
                .setFooter({ text: 'P.PROTECT - Votre sécurité est notre priorité.' });

            try {
                await welcomeChannel.send({ embeds: [welcomeEmbed] });
            } catch (error) {
                console.error(`Impossible d'envoyer le message de bienvenue sur le serveur ${guild.name}.`);
            }
        } else {
            console.warn(`Aucun salon trouvé pour envoyer le message de bienvenue sur ${guild.name}.`);
        }

        // --- PARTIE 2 : SYNCHRONISATION DES PERMISSIONS (Intégrée ici) ---

        try {
            console.log(`Début de la synchronisation des permissions pour ${guild.name}...`);
            const localCommands = guild.client.commands;
            const remoteCommands = await guild.commands.fetch();

            for (const localCommand of localCommands.values()) {
                const remoteCommand = remoteCommands.find(cmd => cmd.name === localCommand.data.name);
                if (remoteCommand) {
                    const defaultPermissions = localCommand.data.default_member_permissions;
                    if (remoteCommand.defaultMemberPermissions?.equals(defaultPermissions) === false) {
                        console.log(`Mise à jour des permissions pour la commande /${remoteCommand.name} sur ${guild.name}.`);
                        await remoteCommand.setDefaultMemberPermissions(defaultPermissions || null);
                    }
                }
            }
            console.log(`Synchronisation des permissions terminée pour ${guild.name}.`);
        } catch (error) {
            console.error(`Impossible de synchroniser les permissions pour le serveur ${guild.name}:`, error);
        }
    },
};