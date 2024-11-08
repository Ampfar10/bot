const fs = require('fs');
const path = require('path');

const antilinkStatusFile = path.join(__dirname, '../data/antilinkStatus.json');

module.exports = {
    name: 'antilink',
    description: 'Enables or disables the antilink feature in the group.',
    category: 'Group',
    async execute(conn, chatId, args, ownerId, senderId, isGroupAdmin) {
        // Allow both admin and the owner to execute the command
        const isOwner = senderId === ownerId;

        const action = args[0]?.toLowerCase();
        if (isOwner || isGroupAdmin) {
            if (action === 'on') {
                updateAntilinkStatus(chatId, true);
                await conn.sendMessage(chatId, {
                    text: '🔒 Antilink feature is now *enabled*. Anyone who sends a link will be removed (except admins).',
                    mentions: [senderId]
                });
            } else if (action === 'off') {
                updateAntilinkStatus(chatId, false);
                await conn.sendMessage(chatId, {
                    text: '🔓 Antilink feature is now *disabled*.',
                    mentions: [senderId]
                });
            } else {
                await conn.sendMessage(chatId, {
                    text: '❗ Usage: antilink on/off',
                    mentions: [senderId]
                });
            }
        } else {
            await conn.sendMessage(chatId, {
                text: '❌ This command is only for group admins or the bot owner.',
                mentions: [senderId]
            });
        }
    }
};

// Function to update antilink status in the JSON file
function updateAntilinkStatus(chatId, status) {
    let antilinkStatus = {};
    if (fs.existsSync(antilinkStatusFile)) {
        antilinkStatus = JSON.parse(fs.readFileSync(antilinkStatusFile, 'utf-8'));
    }
    antilinkStatus[chatId] = status;
    fs.writeFileSync(antilinkStatusFile, JSON.stringify(antilinkStatus, null, 2));
}

// Function to get antilink status
function getAntilinkStatus(chatId) {
    if (fs.existsSync(antilinkStatusFile)) {
        const antilinkStatus = JSON.parse(fs.readFileSync(antilinkStatusFile, 'utf-8'));
        return antilinkStatus[chatId] || false;
    }
    return false;
}

module.exports.getAntilinkStatus = getAntilinkStatus;
