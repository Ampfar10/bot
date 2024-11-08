module.exports = {
    name: 'link',
    description: 'Get the group invite link.',
    category: 'Group',
    async execute(conn, chatId, args, ownerId, senderId) {
        // Check if chatId ends with @g.us, which indicates a group
        const isGroup = chatId.endsWith('@g.us');
        
        if (!isGroup) {
            await conn.sendMessage(chatId, { 
                text: `@${senderId.split('@')[0]}, this command can only be used in group chats.`,
                mentions: [senderId]
            });
            return;
        }

        try {
            // Retrieve and format the group invite link
            const inviteCode = await conn.groupInviteCode(chatId);
            const groupLink = `https://chat.whatsapp.com/${inviteCode}`;
            
            // Send the group link, mentioning the sender
            await conn.sendMessage(chatId, {
                text: `@${senderId.split('@')[0]}, here is the group link:\n${groupLink}`,
                mentions: [senderId]
            });
        } catch (error) {
            console.error('Error retrieving group link:', error);
            await conn.sendMessage(chatId, {
                text: `@${senderId.split('@')[0]}, I couldn't retrieve the group link. Make sure I'm an admin in this group.`,
                mentions: [senderId]
            });
        }
    }
};
