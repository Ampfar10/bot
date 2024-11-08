const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'ytdlp',
  category: 'Media',
  description: 'Downloads a YouTube playlist and sends videos with titles to the user.',
  async execute(client, chatId, args, senderId) {
    try {
      const url = args[0];
      if (!url) {
        await client.sendMessage(chatId, { text: 'Please provide a valid YouTube playlist URL.', mentions: [senderId] });
        return;
      }

      await client.sendMessage(chatId, { text: 'Downloading playlist... Please wait.', mentions: [senderId] });

      // Send POST request to Flask API
      const response = await axios.post('http://localhost:5000/ytdlp', { url }, { responseType: 'stream' });

      // Define path to save each video file temporarily
      const videoPath = path.join(__dirname, 'video.mp4');
      const writer = fs.createWriteStream(videoPath);

      response.data.pipe(writer);

      writer.on('finish', async () => {
        const videoData = fs.readFileSync(videoPath);

        // Send video to user with title as caption
        const title = path.basename(videoPath, '.mp4');
        await client.sendMessage(chatId, {
          video: videoData,
          mimetype: 'video/mp4',
          caption: `Here is the video: ${title}`,
        });

        // Cleanup
        fs.unlinkSync(videoPath);
      });

      writer.on('error', async () => {
        console.error('Error saving video file');
        await client.sendMessage(chatId, { text: 'Error saving the video file.', mentions: [senderId] });
      });

    } catch (error) {
      console.error('Error in ytdlp command:', error);
      await client.sendMessage(chatId, { text: 'An error occurred. Please try again later.', mentions: [senderId] });
    }
  },
};
