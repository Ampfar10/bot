const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'mute',
    description: 'Mute the bot in this group.',
    category: 'Group',
    async execute(conn, chatId, args, ownerId, senderId) {
        const statusFilePath = path.join(__dirname, '../data/antilinkStatus.json');

        // Read the existing status file or initialize it
        let statusData;
        try {
            if (fs.existsSync(statusFilePath)) {
                statusData = JSON.parse(fs.readFileSync(statusFilePath));
            } else {
                statusData = {};
            }
        } catch (error) {
            console.error('Error reading status file:', error);
            await conn.sendMessage(chatId, {
                text: '❌ An error occurred while checking the mute status.',
                mentions: [senderId]
            });
            return;
        }

        // Check if the group is already muted
        if (statusData[chatId]?.muted) {
            await conn.sendMessage(chatId, {
                text: 'This group is already muted.',
                mentions: [senderId]
            });
            return;
        }

        // Mute the group
        statusData[chatId] = { muted: true };
        fs.writeFileSync(statusFilePath, JSON.stringify(statusData, null, 2));

        await conn.sendMessage(chatId, {
            text: 'The bot has been muted in this group',
            mentions: [senderId]
        });
    }
};
