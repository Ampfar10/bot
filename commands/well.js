const { MessageType } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'well',
    description: 'Adds a user to the specified group and promotes them, or generates an invite link.',
    category: 'Group',
    async execute(conn, chatId, args, ownerId, senderId) {
        // Ensure the command has the correct format
        if (args.length < 2) {
            await conn.sendMessage(chatId, { 
                text: '⚠️ Please provide the group JID and user JID to add and promote.', 
                mentions: [senderId]
            });
            return;
        }

        const groupJid = args[0]; // The group JID
        const userJid = args[1];   // The user JID

        try {
            // Try to add the user to the group
            await conn.groupParticipantsUpdate(groupJid, [userJid], 'add');
            console.log(`User ${userJid} added to group ${groupJid}.`);

            // Promote the user to admin
            await conn.groupParticipantsUpdate(groupJid, [userJid], 'promote');
            console.log(`User ${userJid} promoted to admin in group ${groupJid}.`);

            // Success message
            await conn.sendMessage(chatId, { 
                text: `✅ Successfully added and promoted the user ${userJid} to the group.`, 
                mentions: [senderId]
            });
        } catch (error) {
            console.error('Error adding user:', error);
            let errorMessage = '⚠️ An error occurred while trying to add or promote the user.';

            // If the user cannot be added, generate an invite link
            if (error.message.includes('not a participant')) {
                try {
                    // Generate the invite link for the group
                    const inviteLink = await conn.groupInviteCode(groupJid);
                    const fullInviteLink = `https://chat.whatsapp.com/${inviteLink}`;

                    await conn.sendMessage(chatId, { 
                        text: `🔗 User ${userJid} cannot be added directly.\nHere is the invite link to join the group:\n${fullInviteLink}`, 
                        mentions: [senderId]
                    });
                } catch (linkError) {
                    console.error('Error generating invite link:', linkError);
                    await conn.sendMessage(chatId, { 
                        text: '⚠️ An error occurred while trying to generate the invite link.', 
                        mentions: [senderId]
                    });
                }
            } else if (error.message.includes('admin rights')) {
                errorMessage = '⚠️ The bot does not have permission to add or promote users in this group.';
            }

            await conn.sendMessage(chatId, { 
                text: errorMessage, 
                mentions: [senderId]
            });
        }
    }
};
