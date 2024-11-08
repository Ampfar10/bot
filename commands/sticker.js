const { downloadMediaMessage } = require('../handlers/messageHandler');

module.exports = {
    name: 'sticker',
    description: 'Converts an image, video, or GIF to a sticker',
    category: 'media',
    async execute(conn, chatId, args, ownerId, senderId, msg) {
        try {
            // Check if the message contains media (image, video, or quoted media)
            const messageType = msg?.message?.imageMessage || 
                                msg?.message?.videoMessage || 
                                msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage || 
                                msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;
            
            // If there's no valid media type, prompt the user to provide media
            if (!messageType) {
                await conn.sendMessage(chatId, { text: 'Please reply to an image or video to convert it to a sticker.' }, { quoted: msg });
                return;
            }

            // Download the media content (image, video, or sticker)
            const mediaBuffer = await downloadMediaMessage(msg);

            // Send the media as a sticker
            await conn.sendMessage(chatId, { sticker: mediaBuffer }, { quoted: msg });

        } catch (error) {
            console.error('Failed to execute command: sticker', error);
            await conn.sendMessage(chatId, { text: 'Failed to convert media to sticker. Please try again.' }, { quoted: msg });
        }
    }
};
