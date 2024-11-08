const CFonts = require('cfonts');
const fs = require('fs');
const path = require('path');
const { getAntilinkStatus } = require('../commands/antilink.js'); // Adjust the path as needed



async function isMuted(chatId) {
    const statusFilePath = path.join(__dirname, '../data/mute.json');
    if (!fs.existsSync(statusFilePath)) return false;

    const statusData = JSON.parse(fs.readFileSync(statusFilePath));
    return statusData[chatId]?.muted || false;
}

async function handleMessage(message) {
    try {
        // Your existing logic to handle messages
        const metadata = await socket.groupMetadata(message.key.remoteJid);
        // Rest of your logic...
    } catch (error) {
        console.error('Error handling message:', error);

        if (error.isBoom && error.output.statusCode === 408) {
            // Handle timeout error
            console.error('Request timed out. Retrying or handling gracefully.');
            // Implement retry logic or inform the user
        }
    }
}

async function getGroupMetadata(jid, retries = 3) {
    while (retries > 0) {
        try {
            const metadata = await socket.groupMetadata(jid);
            return metadata;
        } catch (error) {
            if (error.isBoom && error.output.statusCode === 408) {
                console.error('Request timed out. Retrying...');
                retries--;
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before retrying
            } else {
                throw error; // If it's not a timeout error, throw it
            }
        }
    }
    throw new Error('Failed to retrieve metadata after multiple attempts.');
}

module.exports = async function handleMessage(conn, msg, ownerId) {

    //console.log("Incoming Message Structure:", JSON.stringify(msg, null, 2));
    // Check if the msg.message exists
    if (!msg.message) {
        console.log('No message content found.');
        return; // Exit if there is no message content
    }

        // Safely access the message content
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';
    const chatId = msg.key.remoteJid; // The group chat ID
    const senderId = msg.key.participant || msg.key.remoteJid;

    if (text) {
        const colors = ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        CFonts.say(`Received message: ${text} from: ${senderId} in chat: ${chatId}`, {
            font: 'console',
            align: 'center',
            colors: [color],
        })

    };
    const colors = ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const quotedMessage = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quotedMessage) {
        let quotedText = '';

        if (quotedMessage.conversation) {
            quotedText = quotedMessage.conversation;
        } else if (quotedMessage.extendedTextMessage?.text) {
            quotedText = quotedMessage.extendedTextMessage.text;
        } else if (quotedMessage.imageMessage?.caption) {
            quotedText = quotedMessage.imageMessage.caption;
        } else if (quotedMessage.videoMessage?.caption) {
            quotedText = quotedMessage.videoMessage.caption;
        } else if (quotedMessage.audioMessage) {
            quotedText = '[Audio Message]'; // For audio, just display that it's an audio message
        } else {
            quotedText = 'No text content';
        }


        CFonts.say(`A message has been quoted by ${senderId} in ${chatId} message: ${quotedText}`, {
            font: 'console',
            align: 'center',
            colors: [color], 
        })
    }


    // Check if the bot is muted in this chat
    if (await isMuted(chatId)) {
        if (!text.startsWith('!unmute')) {
            return; // Ignore all commands except !unmute if the bot is muted
        }
    }

    // Check if antilink is enabled for this chat
    if (getAntilinkStatus(chatId)) {
        // Regex to detect http and https links
        const linkRegex = /(https?:\/\/[^\s]+)/g;
        const hasLink = linkRegex.test(text);

        // Proceed if the message contains a link
        if (hasLink) {
            const groupMetadata = await conn.groupMetadata(chatId);
            const participant = groupMetadata.participants.find(p => p.id === senderId);

            // Remove user if they're not an admin
            if (!participant.admin) {
                // Delete the message containing the link
                await conn.sendMessage(chatId, {
                    delete: msg.key // This will delete the original message
                });

                // Inform the group about the removal
                await conn.sendMessage(chatId, {
                    text: `🚫 @${senderId.split('@')[0]} sent a link and has been removed.`,
                    mentions: [senderId]
                });

                // Remove the user from the group
                await conn.groupParticipantsUpdate(chatId, [senderId], 'remove');
                return; // Exit after handling the link
            }
        }
    }

    // Check if the message starts with the prefix
    const PREFIX = '!';
    if (text.startsWith(PREFIX)) {
        const commandName = text.slice(PREFIX.length).trim().split(' ')[0]; // Extract the command
        const args = text.split(' ').slice(1); // Get the arguments

        try {
            const command = require(`../commands/${commandName}`); // Load command dynamically

            // Execute the command if it exists, passing the senderId instead of chatId
            if (command) {
                await command.execute(conn, chatId, args, ownerId, senderId); // Pass senderId here
            }
        } catch (error) {
            CFonts.say(`Command not found: ${commandName}`, {
                font: 'console',
                align: 'center',
                colors: ['red'],
            });
            console.log(`Command not found: ${commandName}`); // Log to console if command is not found
        }
    }
};


