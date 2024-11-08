module.exports = {
    name: 'join',
    category: 'Owner',
    description: 'Joins a group using an invite link (owner only)',
    async execute(conn, chatId, msg, args) {
        if (!await isOwner(msg)) return conn.sendMessage(chatId, { text: 'Only the bot owner can use this command.' });

        const inviteLink = args[0];
        try {
            await conn.groupAcceptInvite(inviteLink.split('/').pop());
            conn.sendMessage(mchatId, { text: 'Joined group successfully.' });
        } catch {
            conn.sendMessage(chatId, { text: 'Failed to join group.' });
        }
    }
};
