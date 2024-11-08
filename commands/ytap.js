const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'ytap',
  category: 'Media',
  description: 'Downloads audio from a YouTube playlist and sends each file individually.',
  async execute(client, chatId, args, senderId) {
    try {
      const url = args[0];
      if (!url) {
        await client.sendMessage(chatId, { text: 'Please provide a valid YouTube playlist URL.', mentions: [senderId] });
        return;
      }

      await client.sendMessage(chatId, { text: 'Downloading playlist audio... This may take a while.', mentions: [senderId] });

      // Request to start the playlist download
      const { data } = await axios.post('http://localhost:5000/download', { url });
      const { files, download_id } = data;

      for (const fileName of files) {
        const response = await axios.get(`http://localhost:5000/download_file/${download_id}/${fileName}`, {
          responseType: 'stream',
        });

        const filePath = path.join(__dirname, fileName);
        const writer = fs.createWriteStream(filePath);

        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        const fileData = fs.readFileSync(filePath);
        await client.sendMessage(chatId, {
          document: fileData,
          mimetype: 'audio/mp3',
          fileName,
        });

        // Cleanup
        fs.unlinkSync(filePath);
      }

      await client.sendMessage(chatId, { text: 'Playlist download complete.', mentions: [senderId] });

    } catch (error) {
      console.error('Error in ytap command:', error);
      await client.sendMessage(chatId, { text: `An error occurred. Please try again later: ${error}`, mentions: [senderId] });
    }
  },
};
