module.exports = {
    name: 'leave',
    category: 'Group',
    description: 'Make the bot leave the group',
    async execute(sock, from, commands, messageContent, msg) {
      const senderId = msg.key.participant || msg.key.remoteJid;
  
      try {
        await sock.groupLeave(from);
        console.log(`Bot has left the group ${from}`);
      } catch (error) {
        console.error(`Failed to leave group: ${error.message}`);
        await sock.sendMessage(from, { text: `Error leaving group: ${error.message}`, mentions: [senderId] });
      }
    },
  };
  