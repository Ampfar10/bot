module.exports = {
    name: "te",
    aliases: ["type"],
    category: "Utils",
    async execute(conn, chatId, args, ownerId, senderId, msg = {}) {
        try {
            // Access the quoted message directly
            const quotedMessage = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            // Check if there's a quoted message
            if (!quotedMessage) {
                await conn.sendMessage(chatId, {
                    text: "Please quote a message to check its type.",
                    mentions: [senderId]
                });
                return;
            }

            // Determine the type of the quoted message
            let messageType = "Unknown";
            if (quotedMessage.conversation || quotedMessage.extendedTextMessage?.text) {
                messageType = "Text";
            } else if (quotedMessage.imageMessage) {
                messageType = "Image";
            } else if (quotedMessage.audioMessage) {
                messageType = "Audio";
            } else if (quotedMessage.videoMessage) {
                messageType = "Video";
            } else if (quotedMessage.documentMessage) {
                messageType = "Document";
            } else if (quotedMessage.stickerMessage) {
                messageType = "Sticker";
            }

            // Send back the detected type
            await conn.sendMessage(chatId, {
                text: `The quoted message is of type: ${messageType}`,
                mentions: [senderId]
            });
        } catch (error) {
            console.error("Error in te command:", error);
            await conn.sendMessage(chatId, {
                text: `❎ Error: ${error.message}`,
                mentions: [senderId]
            });
        }
    }
};
