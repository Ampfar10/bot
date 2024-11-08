const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function ensureDownloadDirectory() {
    const downloadDir = path.join(__dirname, '../downloads');
    if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
        console.log(`Created download directory: ${downloadDir}`);
    }
    return downloadDir;
}

async function fetchYouTubeMP3(url) {
    try {
        const apiURL = `https://api.agatz.xyz/api/ytmp3?url=${url}`;
        const response = await axios.get(apiURL);
        if (response.status === 200 && response.data.data) {
            return response.data.data;
        } else {
            throw new Error('Failed to retrieve MP3 download URL.');
        }
    } catch (error) {
        console.error('Error fetching MP3 download URL:', error);
        return null;
    }
}

module.exports = {
    name: 'yta',
    description: 'Download audio from YouTube',
    category: 'Media',
    async execute(conn, chatId, args) {
        const url = args[0];
        if (!url) {
            await conn.sendMessage(chatId, { text: 'Please provide a YouTube video URL!' });
            return;
        }
        try {
            const downloadUrl = await fetchYouTubeMP3(url);
            if (!downloadUrl) {
                await conn.sendMessage(chatId, { text: 'Failed to retrieve the MP3. Please try again.' });
                return;
            }
            await conn.sendMessage(chatId, { text: 'Starting audio download...' });
            const downloadDir = await ensureDownloadDirectory();
            const audioFilePath = path.join(downloadDir, `${Date.now()}.mp3`);
            const response = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
            fs.writeFileSync(audioFilePath, response.data);
            console.log(`Audio downloaded successfully: ${audioFilePath}`);
            await conn.sendMessage(chatId, {
                audio: { url: audioFilePath },
                mimetype: 'audio/mpeg',
                caption: `Here is your audio: ${path.basename(audioFilePath)}`,
                ptt: false
            });
            setTimeout(() => {
                fs.unlinkSync(audioFilePath);
                console.log(`Deleted audio file: ${audioFilePath}`);
            }, 120000);
        } catch (error) {
            console.error('Error in yta command:', error);
            await conn.sendMessage(chatId, { text: `An error occurred: ${error.message}` });
        }
    }
};
