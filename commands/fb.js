const axios = require('axios');

module.exports = {
    name: 'fb',
    description: 'Downloads a Facebook video from the given link.',
    category: 'Media',
    async execute(conn, chatId, args, ownerId, senderId) {
        // Check if the user provided a link
        if (args.length === 0) {
            await conn.sendMessage(chatId, {
                text: 'Please provide a Facebook video link. Usage: `!fb <link>`',
                mentions: [senderId],
            });
            return;
        }

        const videoUrl = args[0];
        const options = {
            method: 'GET',
            url: `https://api.agatz.xyz/api/facebook?url=${encodeURIComponent(videoUrl)}`,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        try {
            const response = await axios.request(options);

            // Check if a download link exists in the response
            if (response.data && response.data.video_url) {
                const downloadUrl = response.data.video_url;

                // Send the video in the chat
                await conn.sendMessage(chatId, {
                    video: { url: downloadUrl },
                    caption: 'Here is your downloaded Facebook video!',
                    mentions: [senderId],
                });
            } else {
                await conn.sendMessage(chatId, {
                    text: '❌ Unable to retrieve the download link for this video. Please check the link and try again.',
                    mentions: [senderId],
                });
            }
        } catch (error) {
            console.error('Error downloading video:', error);
            await conn.sendMessage(chatId, {
                text: `❌ An error occurred while downloading the video: ${error}`,
                mentions: [senderId],
            });
        }
    },
};
