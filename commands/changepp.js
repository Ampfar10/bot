const { downloadMediaMessage, proto } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'changepp',
  category: 'Group',
  description: 'Changes the group profile picture with the tagged image or the one sent.',
  async execute(client, chatId, args, senderId, msg) {
    try {
      // Ensure the command is used in a group
      if (!chatId.endsWith('@g.us')) {
        await client.sendMessage(chatId, { text: 'This command can only be used in a group.', mentions: [senderId] });
        return;
      }

      // Identify the image from the message or quoted message
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const imageMessage = msg.message?.imageMessage || (quotedMsg && proto.Message.fromObject(quotedMsg).imageMessage);
      
      if (!imageMessage) {
        await client.sendMessage(chatId, { text: 'Please tag or send an image to use as the group profile picture.', mentions: [senderId] });
        return;
      }

      // Download the image
      const mediaBuffer = await downloadMediaMessage(imageMessage, 'buffer');
      const tempImagePath = path.join(__dirname, 'temp-profile-pic.jpg');
      fs.writeFileSync(tempImagePath, mediaBuffer);

      // Update the group profile picture
      await client.updateProfilePicture(chatId, { url: tempImagePath });

      // Confirm success and cleanup
      await client.sendMessage(chatId, { text: 'Group profile picture has been updated successfully!', mentions: [senderId] });
      fs.unlinkSync(tempImagePath);
    } catch (error) {
      console.error('Error in changepp command:', error);
      await client.sendMessage(chatId, { text: `An error occurred while updating the profile picture: ${error.message}`, mentions: [senderId] });
    }
  },
};
