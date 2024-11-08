const { google } = require('googleapis');
const youtube = google.youtube('v3');

// Replace 'YOUR_API_KEY' with your actual YouTube Data API key
const API_KEY = 'AIzaSyBQSOlFefCVJjVctHDs2VPwkUAJvJRuKH4';

const searchYouTube = async (query) => {
    const response = await youtube.search.list({
        part: 'snippet',
        q: query,
        maxResults: 10,
        type: 'video',
        key: API_KEY,
    });
    
    return response.data.items;
};

const formatYouTubeResponse = (items) => {
    const videos = items.map(item => ({
        title: item.snippet.title,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        thumbnail: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high.url,
    }));

    return videos;
};

// Main command handling
module.exports = {
    name: 'yts',
    description: 'Search YouTube and return video links',
    category: 'Search',
    async execute(conn, chatId, args) {
        const query = args.join(' ');

        if (!query) {
            return conn.sendMessage(chatId, { text: 'Please provide a search query!' });
        }

        try {
            const items = await searchYouTube(query);
            const videos = formatYouTubeResponse(items);

            let responseMessage = '🎥 *YouTube Search Results:* \n\n';
            videos.forEach((video, index) => {
                responseMessage += `${index + 1}. ${video.title}\n${video.url}\n\n`;
            });

            // Include the thumbnail of the first video in high quality
            if (videos.length > 0) {
                await conn.sendMessage(chatId, {
                    image: { url: videos[0].thumbnail },
                    caption: responseMessage,
                });
            } else {
                conn.sendMessage(chatId, { text: 'No results found.' });
            }
        } catch (error) {
            console.error('YouTube search error:', error);
            conn.sendMessage(chatId, { text: 'An error occurred while searching YouTube.' });
        }
    }
};
