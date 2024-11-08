const { MessageType } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'kick',
    description: 'Removes a tagged user from the group.',
    category: 'Group',
    async execute(conn, chatId, args, ownerId, senderId) {
        // Ensure the command is sent in a group chat
        const groupMetadata = await conn.groupMetadata(chatId);
        if (!groupMetadata) {
            await conn.sendMessage(chatId, { 
                text: '⚠️ This command can only be used in a group.', 
                mentions: [senderId]
            });
            return;
        }

        // Get the user(s) mentioned in the message
        const mentionedUsers = args.filter(arg => arg.startsWith('@')).map(arg => arg.replace('@', ''));
        if (mentionedUsers.length === 0) {
            await conn.sendMessage(chatId, { 
                text: '⚠️ Please tag a user to kick.', 
                mentions: [senderId]
            });
            return;
        }

        // Validate mentioned users
        const validUsers = mentionedUsers.filter(userId => groupMetadata.participants.some(participant => participant.id.includes(userId)));
        
        if (validUsers.length === 0) {
            await conn.sendMessage(chatId, { 
                text: '⚠️ The tagged user(s) are not in the group.', 
                mentions: [senderId]
            });
            return;
        }

        try {
            // Kick the mentioned users
            await conn.groupParticipantsUpdate(chatId, validUsers, 'remove');

            // Success message
            await conn.sendMessage(chatId, { 
                text: '✅ User(s) kicked successfully.', 
                mentions: [senderId]
            });
        } catch (error) {
            console.error('Error kicking user(s):', error);
            await conn.sendMessage(chatId, { 
                text: '⚠️ An error occurred while trying to kick the user(s).', 
                mentions: [senderId]
            });
        }
    }
};
