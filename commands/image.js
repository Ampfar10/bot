const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'image',
  category: 'Utility',
  description: 'Downloads and sends images based on a search query.',
  async execute(client, chatId, args, senderId) {
    try {
      // Extract query and amount
      const query = args.slice(0, -1).join(' ') || args[0];
      const amount = args.slice(-1).join('') || '1';
      const numImages = Math.min(parseInt(amount) || 1, 10);  // Default to 1 image, max 10

      if (!query) {
        await client.sendMessage(chatId, { text: 'Please provide a search query for the images.', mentions: [senderId] });
        return;
      }

      await client.sendMessage(chatId, { text: `Searching and downloading ${numImages} images for "${query}"...`, mentions: [senderId] });

      // Send POST request to Flask to initiate download
      const response = await axios.post('http://localhost:5000/download_images', { query, amount: numImages });
      const imagePaths = response.data.images;

      // Download each image and send it to the user
      for (const imagePath of imagePaths) {
        const imageId = path.basename(imagePath);
        const imageResponse = await axios.get(`http://localhost:5000/get_image/${imageId}`, { responseType: 'stream' });

        const imageFilePath = path.join(__dirname, `${imageId}.jpg`);
        const writer = fs.createWriteStream(imageFilePath);
        imageResponse.data.pipe(writer);

        // Wait for download to finish before sending
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        // Send the image to the user
        const imageData = fs.readFileSync(imageFilePath);
        await client.sendMessage(chatId, { image: imageData, caption: `Image for "${query}"`, mentions: [senderId] });

        // Clean up the downloaded image file
        fs.unlinkSync(imageFilePath);
      }

      await client.sendMessage(chatId, { text: `Sent ${imagePaths.length} images for "${query}".`, mentions: [senderId] });
    } catch (error) {
      console.error('Error in image command:', error);
      await client.sendMessage(chatId, { text: `An error occurred: ${error}`, mentions: [senderId] });
    }
  },
};
