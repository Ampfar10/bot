const CFonts = require('cfonts');

module.exports = {
    name: 'owner',
    description: 'Get the owner\'s contact information in vCard format',
    category: 'General',
    execute(conn, chatId, args, ownerId) {
        // Define the owner's information
        const ownerName = 'P A I N'; // Replace with your actual name
        const phoneNumber = '27672633675'; // Extract phone number from ownerId

        // Create a vCard string for the owner
        const vCard = `BEGIN:VCARD\nVERSION:3.0\nN:${ownerName}\nTEL;TYPE=CELL:${phoneNumber}\nEND:VCARD`;

        // Use cfonts to display the owner's info in the console
        CFonts.say(`Owner's contact card sent to ${chatId}`, {
            font: 'console',
            align: 'center',
            colors: ['cyan'],
        });

        // Send the vCard to the user
        return conn.sendMessage(chatId, {
            contacts: {
                displayName: ownerName,
                contacts: [{
                    vCard: vCard,
                }],
            },
        });
    },
};
