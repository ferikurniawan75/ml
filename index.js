const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const crypto = require("crypto");

// Konstanta
const API_URL_LOGIN = "https://mtacc.mobilelegends.com/v2.1/inapp/login";
const API_URL_CHANGE_EMAIL = "https://mtacc.mobilelegends.com/v2.1/inapp/changebindemail";
const BOT_TOKEN = "7426966749:AAFDHzqlRWhqGi9RHPkP4cWbDhXQUgjha9k"; // Ganti dengan token bot Anda

// Inisialisasi bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Menyimpan data sementara
const user_data = {};

// Fungsi konversi password ke MD5
function convertToMD5(password) {
    return crypto.createHash("md5").update(password).digest("hex");
}

// Fungsi login ke Moonton
async function login(account, password, verification_code) {
    try {
        const response = await axios.post(API_URL_LOGIN, {
            op: "login",
            sign: "ca62428dca478c20b860f65cf000201f",
            params: {
                account,
                md5pwd: convertToMD5(password),
                game_token: "",
                recaptcha_token: verification_code,
                country: ""
            },
            lang: "id"
        });

        if (response.data.status === "success") {
            return {
                game_token: response.data.data.game_token,
                guid: response.data.data.guid,
                token: response.data.data.token
            };
        } else {
            return null;
        }
    } catch (error) {
        return null;
    }
}

// Fungsi mengganti email
async function changeEmail(game_token, guid, token, new_email, verification_code_new_email) {
    try {
        const response = await axios.post(API_URL_CHANGE_EMAIL, {
            op: "changebindemail",
            params: {
                email: new_email,
                guid,
                game_token,
                token,
                verification_code: verification_code_new_email
            },
            lang: "id"
        });

        if (response.data.status === "success") {
            return "✅ Email berhasil diganti!";
        } else {
            return `❌ Gagal mengganti email: ${response.data.message}`;
        }
    } catch (error) {
        return "❌ Permintaan gagal.";
    }
}

// Proses percakapan dengan pengguna
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    user_data[chatId] = {};

    bot.sendMessage(chatId, "👋 Selamat datang! Kirimkan email yang ingin diganti terlebih dahulu.");
});

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!user_data[chatId]) return;

    const userStep = Object.keys(user_data[chatId]).length;

    if (userStep === 0) {
        user_data[chatId]["old_email"] = text;
        bot.sendMessage(chatId, "🔑 Sekarang, kirimkan password Moonton Anda.");
    } else if (userStep === 1) {
        user_data[chatId]["password"] = text;
        bot.sendMessage(chatId, "📩 Sekarang, kirimkan kode verifikasi Moonton (dikirim ke email lama).");
    } else if (userStep === 2) {
        user_data[chatId]["verification_code"] = text;
        bot.sendMessage(chatId, "✉️ Sekarang, kirimkan email baru yang ingin Anda kaitkan.");
    } else if (userStep === 3) {
        user_data[chatId]["new_email"] = text;
        bot.sendMessage(chatId, "📬 Terakhir, kirimkan kode verifikasi dari email baru.");
    } else if (userStep === 4) {
        user_data[chatId]["new_email_verification_code"] = text;
        bot.sendMessage(chatId, "🔄 Memproses pergantian email...");

        const { old_email, password, verification_code, new_email, new_email_verification_code } = user_data[chatId];

        const loginData = await login(old_email, password, verification_code);

        if (loginData) {
            const result = await changeEmail(loginData.game_token, loginData.guid, loginData.token, new_email, new_email_verification_code);
            bot.sendMessage(chatId, result);
        } else {
            bot.sendMessage(chatId, "❌ Login gagal. Cek kembali email, password, atau kode verifikasi Anda.");
        }

        delete user_data[chatId];
    }
});

// Log saat bot aktif
console.log("🤖 Bot sedang berjalan...");
