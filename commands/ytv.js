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

async function fetchYouTubeVideo(query) {
    try {
        const apiURL = `https://api.agatz.xyz/api/ytplayvid?message=${query}`;
        const response = await axios.get(apiURL);
        if (response.status === 200 && response.data.data) {
            return response.data.data;
        } else {
            throw new Error('Failed to retrieve YouTube video data.');
        }
    } catch (error) {
        console.error('Error fetching video data:', error);
        return null;
    }
}

module.exports = {
    name: 'ytv',
    description: 'Download video from YouTube',
    category: 'Media',
    async execute(conn, chatId, args) {
        const query = args.join(' ').trim();
        if (!query) {
            await conn.sendMessage(chatId, { text: 'Please provide a YouTube search query or video URL!' });
            return;
        }

        try {
            const videoData = await fetchYouTubeVideo(query);
            if (!videoData) {
                await conn.sendMessage(chatId, { text: 'Failed to retrieve the video. Please try again.' });
                return;
            }

            await conn.sendMessage(chatId, {
                text: `Found: *${videoData.title}*\nBy: ${videoData.author}\nDuration: ${videoData.duration}\nUploaded: ${videoData.uploadedAt}\nViews: ${videoData.views}\n\nStarting download...`,
                parse_mode: 'Markdown'
            });

            const downloadDir = await ensureDownloadDirectory();
            const videoFilePath = path.join(downloadDir, `${Date.now()}.mp4`);

            const response = await axios.get(videoData.downloadUrl, { responseType: 'arraybuffer' });
            fs.writeFileSync(videoFilePath, response.data);
            console.log(`Video downloaded successfully: ${videoFilePath}`);

            await conn.sendMessage(chatId, {
                video: { url: videoFilePath },
                caption: `Here is your video: *${videoData.title}*`,
                mimetype: 'video/mp4',
                parse_mode: 'Markdown'
            });

            setTimeout(() => {
                fs.unlinkSync(videoFilePath);
                console.log(`Deleted video file: ${videoFilePath}`);
            }, 120000);
        } catch (error) {
            console.error('Error in ytv command:', error);
            await conn.sendMessage(chatId, { text: `An error occurred: ${error.message}` });
        }
    }
};
