const { exec } = require('child_process');
const CFonts = require('cfonts');

module.exports = {
    name: 'eval',
    description: 'Execute a command (Windows or JavaScript) (owner only)',
    category: 'Owner',
    execute(conn, chatId, args, ownerId, senderId) {
        console.log(`Chat ID: ${chatId}, Owner ID: ${ownerId}, Sender ID: ${senderId}`); // Log IDs for debugging

        // Check if the user is the owner
        if (senderId !== ownerId) {
            return conn.sendMessage(chatId, { text: 'This command can only be used by the owner.', mentions: [senderId] });
        }

        const input = args.join(' '); // Join the command arguments

        // Determine if the input is a Windows command or JavaScript code
        if (input.startsWith('js:')) {
            const jsCode = input.slice(3); // Strip the prefix "js:"

            try {
                const result = eval(jsCode); // Evaluate JavaScript code
                const response = `Result: ${result}`;

                CFonts.say(response, {
                    font: 'console',
                    align: 'center',
                    colors: ['cyan'],
                });

                // Send the response back to the user tagging the sender
                return conn.sendMessage(chatId, { text: response, mentions: [senderId] });
            } catch (error) {
                const errorResponse = `JavaScript Error: ${error.message}`;
                CFonts.say(errorResponse, {
                    font: 'console',
                    align: 'center',
                    colors: ['red'],
                });
                return conn.sendMessage(chatId, { text: errorResponse, mentions: [senderId] });
            }
        } else {
            // Handle Windows command execution
            exec(input, (error, stdout, stderr) => {
                let response;
                if (error) {
                    response = `Error: ${stderr}`;
                } else {
                    response = `Output: ${stdout}`;
                }

                CFonts.say(response, {
                    font: 'console',
                    align: 'center',
                    colors: ['cyan'],
                });

                // Send the response back to the user tagging the sender
                return conn.sendMessage(chatId, { text: response, mentions: [senderId] });
            });
        }
    },
};
