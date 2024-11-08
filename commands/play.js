const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'play',
    description: 'Downloads a YouTube song based on the given query and sends it to the user.',
    category: 'Media',
    async execute(conn, chatId, args, ownerId, senderId) {
        if (args.length === 0) {
            await conn.sendMessage(chatId, { 
                text: '⚠️ Please provide a query to search for a song.', 
                mentions: [senderId]
            });
            return;
        }

        const query = args.join(' '); // Join the args to form the query

        try {
            // Download the audio using youtube-dl-exec
            const outputPath = path.join(__dirname, `../downloads/${query}.mp3`);

            const { stdout, stderr } = await youtubedl(query, {
                output: outputPath,
                extractAudio: true,
                audioFormat: 'mp3',
                noWarnings: true,
                restrictFilenames: true,
                // Other options can be added as needed
            });

            console.log(stdout);
            console.error(stderr);

            // Check if the file was created successfully
            if (fs.existsSync(outputPath)) {
                // Send the audio file to the user
                await conn.sendMessage(chatId, {
                    audio: fs.readFileSync(outputPath),
                    mimetype: 'audio/mp3',
                    ptt: false,
                    mentions: [senderId],
                });

                // Optionally delete the file after sending
                fs.unlinkSync(outputPath);
            } else {
                await conn.sendMessage(chatId, { 
                    text: '⚠️ Failed to download the audio. Please try again later.', 
                    mentions: [senderId]
                });
            }
        } catch (error) {
            console.error('Error downloading audio:', error);
            await conn.sendMessage(chatId, { 
                text: '⚠️ An error occurred while trying to download the audio.', 
                mentions: [senderId]
            });
        }
    }
};
