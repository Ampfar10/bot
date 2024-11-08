const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'ytvp',
  category: 'Media',
  description: 'Downloads videos from a YouTube playlist and sends each one as a separate video.',
  async execute(client, chatId, args, senderId) {
    try {
      const url = args[0];
      if (!url) {
        await client.sendMessage(chatId, { text: 'Please provide a valid YouTube playlist URL.', mentions: [senderId] });
        return;
      }

      await client.sendMessage(chatId, { text: 'Downloading playlist videos... This may take a while.', mentions: [senderId] });

      // Send POST request to the Flask app to initiate the download
      const response = await axios.post('http://localhost:5000/downloadv', { url });

      // Extract file information from the response
      const { files, download_id } = response.data;
      const downloadDir = path.join('./downloads', download_id);

      // Send each video file one by one with title as caption
      for (const file of files) {
        const videoPath = path.join(downloadDir, file.filename);

        // Ensure the file exists and send it as a video
        if (fs.existsSync(videoPath)) {
          const videoData = fs.readFileSync(videoPath);

          await client.sendMessage(chatId, {
            video: videoData,
            caption: file.title,  // Title of the video as caption
            mentions: [senderId]
          });

          // Clean up the file after sending
          fs.unlinkSync(videoPath);
        } else {
          console.error(`File not found: ${videoPath}`);
          await client.sendMessage(chatId, { text: `Error: File ${file.title} could not be found.`, mentions: [senderId] });
        }
      }

      // Remove the download directory after sending all videos
      fs.rmdirSync(downloadDir, { recursive: true });
      await client.sendMessage(chatId, { text: 'All videos from the playlist have been sent!', mentions: [senderId] });

    } catch (error) {
      console.error('Error in ytvp command:', error);
      await client.sendMessage(chatId, { text: `An error occurred. Please try again later: ${error}`, mentions: [senderId] });
    }
  },
};
