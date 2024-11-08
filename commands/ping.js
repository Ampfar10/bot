const CFonts = require('cfonts');

module.exports = {
    name: 'ping',
    description: 'Responds with Pong!',
    category: 'General',
    execute(conn, chatId) {
        const response = 'Pong! 🏓';
        
        // Use cfonts to display the response
        CFonts.say(response, {
            font: 'console',
            align: 'center',
            colors: ['cyan'],
        });

        // Send the response back to the user
        return conn.sendMessage(chatId, { text: response });
    },
};
