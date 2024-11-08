const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'insta',
  category: 'Media',
  description: 'Downloads an Instagram video from the provided URL.',
  async execute(client, chatId, args, senderId) {
    try {
      const url = args[0];
      if (!url) {
        await client.sendMessage(chatId, { text: 'Please provide a valid Instagram URL.', mentions: [senderId] });
        return;
      }

      await client.sendMessage(chatId, { text: 'Downloading video... Please wait.', mentions: [senderId] });

      // Send POST request
      const response = await axios.post('http://127.0.0.1:5000/insta', { url }, { responseType: 'stream' });

      const videoPath = path.join(__dirname, 'video.mp4');
      const writer = fs.createWriteStream(videoPath);

      response.data.pipe(writer);

      writer.on('finish', async () => {
        const videoData = fs.readFileSync(videoPath);
        await client.sendMessage(chatId, {
          video: videoData,
          mimetype: 'video/mp4',
          caption: 'Here is your Instagram video!',
        });

        // Cleanup
        fs.unlinkSync(videoPath);
      });

      writer.on('error', async () => {
        console.error('Error saving video file');
        await client.sendMessage(chatId, { text: 'Error saving the video file.', mentions: [senderId] });
      });

    } catch (error) {
      console.error('Error in insta command:', error);
      await client.sendMessage(chatId, { text: 'An error occurred. Please try again later.', mentions: [senderId] });
    }
  },
};
