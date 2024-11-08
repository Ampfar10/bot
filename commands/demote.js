module.exports = {
    name: 'demote',
    description: 'Demotes a tagged or quoted admin to a regular participant.',
    category: 'Group',
    async execute(conn, chatId, args, ownerId, senderId, isAdmin, quotedUser) {
        const isGroup = chatId.endsWith('@g.us');
        
        if (!isGroup) {
            await conn.sendMessage(chatId, { 
                text: `@${senderId.split('@')[0]}, this command can only be used in group chats.`,
                mentions: [senderId]
            });
            return;
        }

        if (!isAdmin && senderId !== ownerId) {
            await conn.sendMessage(chatId, { 
                text: `@${senderId.split('@')[0]}, only admins or the owner can use this command.`,
                mentions: [senderId]
            });
            return;
        }

        const targetUser = quotedUser || (args[0] ? args[0] + '@s.whatsapp.net' : null);
        if (!targetUser) {
            await conn.sendMessage(chatId, { 
                text: `@${senderId.split('@')[0]}, please tag or quote the user you want to demote.`,
                mentions: [senderId]
            });
            return;
        }

        try {
            await conn.groupParticipantsUpdate(chatId, [targetUser], 'demote');
            await conn.sendMessage(chatId, { 
                text: `@${targetUser.split('@')[0]} has been demoted by @${senderId.split('@')[0]}.`,
                mentions: [targetUser, senderId]
            });
        } catch (error) {
            console.error('Error demoting user:', error);
            await conn.sendMessage(chatId, {
                text: `@${senderId.split('@')[0]}, I couldn't demote the user. Ensure I have admin rights.`,
                mentions: [senderId]
            });
        }
    }
};
