"use strict";

const {
    default: makeWASocket,
    makeInMemoryStore,
    DisconnectReason,
    useMultiFileAuthState,
    generateWAMessageFromContent,
} = require("@whiskeysockets/baileys");

const { Boom } = require('@hapi/boom');
const figlet = require("figlet");
const fs = require("fs");
const moment = require('moment');
const chalk = require('chalk');
const logger = require('pino');
const clui = require('clui');
const axios = require('axios');
const dotenv = require('dotenv');
const util = require('util');
const { serialize } = require("./lib/myfunc");

dotenv.config();
const setTimeoutPromise = util.promisify(setTimeout);

// **Google Generative AI**
const { GoogleGenerativeAI } = require("@google/generative-ai");

const store = makeInMemoryStore({
    logger: logger().child({ level: 'silent', stream: 'store' })
});

// **Inisialisasi Gemini AI**
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};

// **Fungsi Memanggil Gemini AI**
const callGeminiAI = async (text) => {
    try {
        const chatSession = model.startChat({ generationConfig, history: [] });
        const result = await chatSession.sendMessage(text);
        return result.response.text();
    } catch (error) {
        console.error('Error calling Gemini AI:', error);
        return 'Error processing your request';
    }
};

// **Fungsi Menjalankan WhatsApp**
const startWhatsApp = async () => {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_multi');
    const conn = makeWASocket({
        auth: state,
        logger: logger({ level: 'silent' }),
        printQRInTerminal: true,
    });

    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut 
                ? startWhatsApp() 
                : console.log('Connection logged out...');
        }
    });

    conn.ev.on('creds.update', saveCreds);

    // **Event Listener untuk Pesan**
    conn.ev.on('messages.upsert', async m => {
        if (!m.messages) return;
        let msg = m.messages[0];

        try { if (msg.message.messageContextInfo) delete msg.message.messageContextInfo; } catch { }

        msg = serialize(conn, msg);
        msg.isBaileys = msg.key.id.startsWith('BAE5');

        if (msg.message?.conversation) {
            console.log('Received Message:', msg.message.conversation);
            const aiResponse = await callGeminiAI(msg.message.conversation);
            const time = moment(new Date()).format('HH:mm:ss DD/MM/YYYY');
            await setTimeoutPromise(3000);
            conn.reply(msg.key.remoteJid, `[${time}] ${aiResponse} | ai: true`, msg);
        }
    });

    return conn;
};

// **Ekspor Fungsi untuk `msg.js`**
module.exports = { callGeminiAI };

startWhatsApp().catch(e => console.log(e));
