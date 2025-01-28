const moment = require('moment');

exports.serialize = (conn, msg) => {
    msg.isGroup = msg.key.remoteJid.endsWith('@g.us');
    msg.sender = msg.isGroup ? msg.key.participant : msg.key.remoteJid;
    msg.from = msg.key.remoteJid;
    msg.pushName = msg.pushName || "User";
    msg.time = moment(new Date()).format('HH:mm:ss DD/MM/YYYY');
    return msg;
};
