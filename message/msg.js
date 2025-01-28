const { callGeminiAI } = require('../index');
const moment = require('moment');
const util = require('util');

const setTimeoutPromise = util.promisify(setTimeout);

module.exports = async (conn, msg, m) => {
    if (msg.message?.conversation) {
        console.log('Processing Message:', msg.message.conversation);
        const aiResponse = await callGeminiAI(msg.message.conversation);
        const time = moment(new Date()).format('HH:mm:ss DD/MM/YYYY');
        await setTimeoutPromise(3000);
        await conn.reply(msg.key.remoteJid, `[${time}] ${aiResponse} | ai: true`, msg);
    }
};
