module.exports = {
    name: 'add',
    description: 'Adds a person to the group using their phone number.',
    category: 'Group',
    async execute(conn, chatId, args, ownerId, senderId, isAdmin) {
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

        const phoneNumber = args[0];
        if (!phoneNumber || !/^\d+$/.test(phoneNumber)) {
            await conn.sendMessage(chatId, { 
                text: `@${senderId.split('@')[0]}, please provide a valid phone number to add.`,
                mentions: [senderId]
            });
            return;
        }

        const targetUser = `${phoneNumber}@s.whatsapp.net`;

        try {
            await conn.groupParticipantsUpdate(chatId, [targetUser], 'add');
            await conn.sendMessage(chatId, { 
                text: `@${senderId.split('@')[0]} has added @${phoneNumber} to the group.`,
                mentions: [senderId, targetUser]
            });
        } catch (error) {
            console.error('Error adding user:', error);
            await conn.sendMessage(chatId, {
                text: `@${senderId.split('@')[0]}, I couldn't add the user. Ensure I have admin rights and the number is registered on WhatsApp.`,
                mentions: [senderId]
            });
        }
    }
};
