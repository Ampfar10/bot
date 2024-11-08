const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'vv',
    description: 'Retrieve and resend view-once media.',
    category: 'Media',
    async execute(conn, chatId, args, ownerId, senderId, msg) {
        // Check if message contains view-once media
        if (!msg.message?.viewOnceMessage) {
            await conn.sendMessage(chatId, { 
                text: `@${senderId.split('@')[0]} Please reply to a view-once message.`,
                mentions: [senderId]
            });
            return;
        }

        try {
            // Extract the view-once message content
            const viewOnceMessage = msg.message.viewOnceMessage.message;
            const isImage = !!viewOnceMessage.imageMessage;
            const mediaType = isImage ? 'image' : 'video';
            const fileExtension = isImage ? 'jpg' : 'mp4';

            // Download the media content
            const mediaBuffer = await downloadMediaMessage(
                { message: viewOnceMessage },
                'buffer'
            );

            // Save to a temporary file
            const tempFilePath = path.resolve(__dirname, `temp.${fileExtension}`);
            fs.writeFileSync(tempFilePath, mediaBuffer);

            // Send the media to the user
            const mediaOptions = isImage
                ? { image: { url: tempFilePath } }
                : { video: { url: tempFilePath } };
            
            await conn.sendMessage(chatId, mediaOptions, {
                caption: `@${senderId.split('@')[0]}`,
                mentions: [senderId]
            });

            // Clean up temporary file
            fs.unlinkSync(tempFilePath);

        } catch (error) {
            console.error('Error retrieving view-once media:', error);
            await conn.sendMessage(chatId, { 
                text: `⚠️ @${senderId.split('@')[0]} An error occurred while retrieving the view-once media.`,
                mentions: [senderId]
            });
        }
    }
};
