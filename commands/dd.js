const CFonts = require('cfonts');

module.exports = {
    name: 'dd',
    description: 'Deletes any quoted message.',
    category: 'Group',
    async execute(conn, chatId, args, ownerId, senderId) {
        // Check if the user quoted a message
        if (args.length === 0) {
            await conn.sendMessage(chatId, {
                text: '❗ Please reply to a quoted message with the command !dd to delete it.',
                mentions: [senderId]
            });
            return;
        }

        // Try to find the message that is being replied to
        const quotedMessageId = args[0]; // Assuming the quoted message ID is passed as an argument

        try {
            // Delete the quoted message
            await conn.sendMessage(chatId, {
                delete: { id: quotedMessageId }
            });
            await conn.sendMessage(chatId, {
                text: '✅ The quoted message has been deleted.',
                mentions: [senderId]
            });
        } catch (error) {
            console.error('Error deleting the quoted message:', error);
            await conn.sendMessage(chatId, {
                text: '❌ Failed to delete the quoted message. Please try again.',
                mentions: [senderId]
            });
        }
    }
};
