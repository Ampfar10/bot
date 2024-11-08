const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const CFonts = require('cfonts');
const fs = require('fs');
const path = require('path');
const express = require('express');
const QRCode = require('qrcode');
const handleMessage = require('./handlers/messageHandler'); // Import the message handler
//const { isAdmin } = require('./utils/groupUtils');
const logStream = fs.createWriteStream('baileys.log', { flags: 'a' });

// Define the command prefix and owner ID
const PREFIX = '!';
const OWNER_ID = '27672633675@s.whatsapp.net'; // Owner's WhatsApp ID formatted correctly

let isMuted = false; // Track whether the bot is muted

// Load commands from the commands folder
const commands = new Map();
fs.readdirSync(path.join(__dirname, 'commands')).forEach(file => {
    const command = require(`./commands/${file}`);
    commands.set(command.name, command);
});

// Function to create a rainbow effect
function getRainbowColors() {
    return ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'];
}

// Set up Express server for QR code display
const app = express();
let qrCodeData = ''; // Store QR code data globally to share across requests

app.post('/send', async (req, res) => {
    console.log('Incoming request body:', req.body); // Log the incoming body for debugging
  
    const { chatIds, message } = req.body;
  
    // Input validation
    if (!Array.isArray(chatIds) || chatIds.length === 0 || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'chatIds must be a non-empty array and message must be a non-empty string' });
    }
  
    // Escape newlines and handle other special characters if necessary
    //const formattedMessage = message.replace(/\n/g, '\\n');
  
    try {
      // Send messages concurrently
      await Promise.all(chatIds.map(async (chatId) => {
        try {
          await sock.sendMessage(chatId, { text: message });
        } catch (sendError) {
          console.error(`Error sending message to ${chatId}:`, sendError);
          // Optionally handle individual message failures here
        }
      }));
      
      return res.status(200).json({ success: true, message: 'Messages sent successfully' });
    } catch (error) {
      console.error('Error sending messages:', error);
      return res.status(500).json({ error: 'Failed to send messages', details: error.message });
    }
  });
  

app.get('/', (req, res) => {
    if (qrCodeData) {
        res.send(`
            <h1>WhatsApp QR Code</h1>
            <img src="${qrCodeData}" alt="QR Code">
            <p>Scan this QR code to connect to the bot.</p>
        `);
    } else {
        res.send('<h1>QR Code not generated yet. Please try again in a moment.</h1>');
    }
});

app.listen(1234, '0.0.0.0', () => {
    console.log('QR code is available at http://0.0.0.0:1234');
});

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const logger = {
        level: 'trace', // Set the desired log level
        trace: (msg) => { if (logger.level === 'trace'); },
        debug: (msg) => { if (logger.level === 'debug' || logger.level === 'trace'); },
        info: (msg) => { if (logger.level === 'info' || logger.level === 'debug' || logger.level === 'trace'); },
        warn: (msg) => { if (logger.level === 'warn' || logger.level === 'info' || logger.level === 'debug' || logger.level === 'trace'); },
        error: (msg) => console.error(`ERROR: ${msg}`),
        child: () => logger, // Return itself for child loggers
    };
    

    const conn = makeWASocket({
        printQRInTerminal: true,
        auth: state,
        browser: ['Glitch 0_0', 'macOS', '3.0'],
        syncFullHistory: true,
        timeout: 60000,
        logger,
    });

    // Display a big "Glitch 0_0" message using cfonts
    CFonts.say('Glitch 0_0', {
        font: 'block',
        align: 'center',
        colors: getRainbowColors(),
        background: 'black',
        letterSpacing: 1,
        lineHeight: 1,
        space: true,
        maxLength: 'none',
    });

    CFonts.say('Bot is starting...', {
        font: 'simple',
        colors: getRainbowColors(),
        background: 'black',
        letterSpacing: 1,
        lineHeight: 1,
        space: true,
        maxLength: 'none',
    });

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('connection.update', async (update) => {
        const { connection, qr, lastDisconnect } = update;
        if (connection === 'close') {
            if ((lastDisconnect.error)?.output?.statusCode !== 401) {
                console.log('Connection closed. Reconnecting...');
                startBot(); // Restart the bot
            } else {
                CFonts.say('Connection closed due to being logged out.', {
                    font: 'simple',
                    colors: getRainbowColors(),
                    background: 'black',
                    letterSpacing: 1,
                    lineHeight: 1,
                    space: true,
                    maxLength: 'none',
                });
            }
        } else if (connection === 'open') {
            CFonts.say('Successfully connected to WhatsApp!', {
                font: 'simple',
                colors: getRainbowColors(),
                background: 'black',
                letterSpacing: 1,
                lineHeight: 1,
                space: true,
                maxLength: 'none',
            });
            qrCodeData = ''; // Clear QR code when connected
        } else if (qr) {
            // Generate QR code as a data URL
            qrCodeData = await QRCode.toDataURL(qr);
            console.log('QR code updated for web display');
        }
    });

    // Event listener for incoming messages
    conn.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.key.fromMe) {
            await handleMessage(conn, msg, OWNER_ID, isMuted); // Pass the isMuted state to the message handler
        }
    });
}

startBot().catch(err => console.error(err));
