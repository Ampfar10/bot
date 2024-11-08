const axios = require('axios');
const FormData = require('form-data');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: "shazam",
    aliases: ["sz"],
    category: "Utils",
    async execute(conn, chatId, args, ownerId, senderId, msg = {}, quotedAudio = {}) {
        try {
            // Check if the quoted message is an audio message
            if (!quotedAudio) {
                await conn.sendMessage(chatId, {
                    text: "Please quote an audio message to use this command.",
                    mentions: [senderId]
                });
                return;
            }

            // Log the quoted audio for debugging
            console.log('Quoted Audio Message:', quotedAudio);

            // Download the audio buffer
            const buffer = await downloadMediaMessage({ message: quotedAudio }, 'buffer', {}, { conn });
            if (!buffer) {
                await conn.sendMessage(chatId, {
                    text: "No audio buffer found. Please try again.",
                    mentions: [senderId]
                });
                return;
            }

            // Prepare and send to AudD API
            const form = new FormData();
            form.append('file', buffer, { filename: 'audio.mp3' });
            form.append('return', 'apple_music,spotify');
            form.append('api_token', '014eeabe342ea7d2b2d32413c8967741'); // Replace with your API token

            const response = await axios.post('https://api.audd.io/', form, {
                headers: form.getHeaders()
            });

            // Process AudD API response
            if (response.data.result) {
                const songInfo = response.data.result;
                const songMessage = `Song found: ${songInfo.title} by ${songInfo.artist}\nApple Music: ${songInfo.apple_music?.url || 'Not available'}\nSpotify: ${songInfo.spotify?.external_urls?.spotify || 'Not available'}`;
                await conn.sendMessage(chatId, { text: songMessage, mentions: [senderId] });
            } else {
                await conn.sendMessage(chatId, { text: "No song found.", mentions: [senderId] });
            }

        } catch (error) {
            console.error("Error:", error);
            await conn.sendMessage(chatId, {
                text: `❎ Error: ${error.message}`,
                mentions: [senderId]
            });
        }
    }
};
