const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const crypto = require('crypto');

// Konstanta
const API_URL_LOGIN = "https://mtacc.mobilelegends.com/v2.1/inapp/login";
const API_URL_CHANGE_EMAIL = "https://mtacc.mobilelegends.com/v2.1/inapp/changebindemail";
const BOT_TOKEN = "7426966749:AAFDHzqlRWhqGi9RHPkP4cWbDhXQUgjha9k"; // Ganti dengan token bot Anda

// Inisialisasi bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Menyimpan data sementara
const user_data = {};

// Fungsi untuk mengonversi password menjadi MD5
function convertPasswordToMd5(password) {
    return crypto.createHash('md5').update(password).digest('hex');
}

// Fungsi untuk login ke Mobile Legends
async function login(account, password, verification_code) {
    const md5pwd = convertPasswordToMd5(password);
    const loginData = {
        op: "login",
        sign: "ca62428dca478c20b860f65cf000201f",
        params: {
            account: account,
            md5pwd: md5pwd,
            game_token: "",
            recaptcha_token: verification_code,
            country: ""
        },
        lang: "id"
    };

    try {
        const response = await axios.post(API_URL_LOGIN, loginData);
        if (response.status === 200) {
            const loginResponse = response.data;
            return {
                game_token: loginResponse.data.game_token,
                guid: loginResponse.data.guid,
                token: loginResponse.data.token
            };
        }
    } catch (error) {
        console.error("Login error:", error);
    }
    return null;
}

// Fungsi untuk mengganti email
async function changeEmail(game_token, guid, token, new_email, verification_code_new_email) {
    const changeEmailData = {
        op: "changebindemail",
        params: {
            email: new_email,
            guid: guid,
            game_token: game_token,
            token: token,
            verification_code: verification_code_new_email
        },
        lang: "id"
    };

    try {
        const response = await axios.post(API_URL_CHANGE_EMAIL, changeEmailData);
        if (response.status === 200) {
            return response.data.status === "success"
                ? "Email berhasil diganti."
                : `Gagal mengganti email: ${response.data.message}`;
        }
    } catch (error) {
        console.error("Change email error:", error);
    }
    return "Permintaan gagal.";
}

// Handler /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Selamat datang! Kirimkan email yang ingin diganti terlebih dahulu.");
    user_data[chatId] = {};
});

// Menerima email lama
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    if (!user_data[chatId].old_email) {
        user_data[chatId].old_email = msg.text;
        bot.sendMessage(chatId, "Sekarang, kirimkan password Moonton Anda.");
    } else if (!user_data[chatId].password) {
        user_data[chatId].password = msg.text;
        bot.sendMessage(chatId, "Sekarang, kirimkan kode verifikasi Moonton (dikirim ke email lama).");
    } else if (!user_data[chatId].verification_code) {
        user_data[chatId].verification_code = msg.text;
        bot.sendMessage(chatId, "Sekarang, kirimkan email baru yang ingin Anda kaitkan.");
    } else if (!user_data[chatId].new_email) {
        user_data[chatId].new_email = msg.text;
        bot.sendMessage(chatId, "Terakhir, kirimkan kode verifikasi dari email baru.");
    } else if (!user_data[chatId].new_email_verification_code) {
        user_data[chatId].new_email_verification_code = msg.text;

        (async () => {
            const { old_email, password, verification_code, new_email, new_email_verification_code } = user_data[chatId];

            const loginData = await login(old_email, password, verification_code);
            if (loginData) {
                const result = await changeEmail(loginData.game_token, loginData.guid, loginData.token, new_email, new_email_verification_code);
                bot.sendMessage(chatId, result);
            } else {
                bot.sendMessage(chatId, "Login gagal. Cek kembali email, password, atau kode verifikasi Anda.");
            }

            delete user_data[chatId];
        })();
    }
});

// Menampilkan pesan saat script berjalan
console.log("Script berjalan...");
               
