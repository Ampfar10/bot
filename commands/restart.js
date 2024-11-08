const CFonts = require('cfonts');

module.exports = {
    name: 'restart',
    description: 'Restart the bot',
    category: 'Owner',
    execute(conn, chatId, args, ownerId, senderId) {
        console.log(`Chat ID: ${chatId}, Owner ID: ${ownerId}, Sender ID: ${senderId}`); // Log IDs for debugging

        // Check if the user is the owner
        if (senderId !== ownerId) {
            return conn.sendMessage(chatId, { text: 'This command can only be used by the owner.', mentions: [senderId] });
        }

        conn.sendMessage(chatId, { text: 'Bot is restarting...' });

        // Close the connection to restart the bot
        setTimeout(() => {
            process.exit();  // Exit the Node.js process
        }, 1000); // Delay for 1 second to allow the message to be sent
    },
};
