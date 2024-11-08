module.exports = {
    name: 'tagall',
    category: 'group',
    description: 'Tags all group members (admin only)',
    async execute(conn, msg) {
        const { remoteJid } = msg.key;
        if (!await isAdmin(conn, msg)) return conn.sendMessage(remoteJid, { text: 'Only admins can use this command.' });

        const groupMetadata = await conn.groupMetadata(remoteJid);
        const members = groupMetadata.participants.map((member) => ({
            id: member.id,
            notify: true
        }));
        
        const mentions = members.map(member => member.id);
        await conn.sendMessage(remoteJid, {
            text: 'Tagging everyone:',
            mentions
        });
    }
};
