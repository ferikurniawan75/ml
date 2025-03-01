require("dotenv").config();
const { Telegraf, Scenes, session } = require("telegraf");
const axios = require("axios");
const crypto = require("crypto");

// Konstanta
const BOT_TOKEN = process.env.BOT_TOKEN;
const API_URL_LOGIN = "https://mtacc.mobilelegends.com/v2.1/inapp/login";
const API_URL_CHANGE_EMAIL = "https://mtacc.mobilelegends.com/v2.1/inapp/changebindemail";

// Bot
const bot = new Telegraf(BOT_TOKEN);

// Simpan data pengguna sementara
const userData = {};

// Fungsi untuk mengonversi password ke MD5
const md5Hash = (password) => {
  return crypto.createHash("md5").update(password).digest("hex");
};

// Fungsi untuk login ke Moonton
const login = async (email, password, verificationCode) => {
  try {
    const response = await axios.post(API_URL_LOGIN, {
      op: "login",
      sign: "ca62428dca478c20b860f65cf000201f",
      params: {
        account: email,
        md5pwd: md5Hash(password),
        game_token: "",
        recaptcha_token: verificationCode,
        country: "",
      },
      lang: "id",
    });

    const data = response.data.data;
    return { gameToken: data.game_token, guid: data.guid, token: data.token };
  } catch (error) {
    return null;
  }
};

// Fungsi untuk mengganti email
const changeEmail = async (gameToken, guid, token, newEmail, verificationCode) => {
  try {
    const response = await axios.post(API_URL_CHANGE_EMAIL, {
      op: "changebindemail",
      params: {
        email: newEmail,
        guid: guid,
        game_token: gameToken,
        token: token,
        verification_code: verificationCode,
      },
      lang: "id",
    });

    return response.data.status === "success"
      ? "✅ Email berhasil diganti."
      : `⚠️ Gagal mengganti email: ${response.data.message}`;
  } catch (error) {
    return "❌ Permintaan gagal.";
  }
};

// Scene Wizard untuk mengelola percakapan
const changeEmailScene = new Scenes.WizardScene(
  "CHANGE_EMAIL",
  (ctx) => {
    ctx.reply("📝 Masukkan email lama Anda:");
    return ctx.wizard.next();
  },
  (ctx) => {
    userData[ctx.from.id] = { oldEmail: ctx.message.text };
    ctx.reply("🔑 Masukkan password Moonton Anda:");
    return ctx.wizard.next();
  },
  (ctx) => {
    userData[ctx.from.id].password = ctx.message.text;
    ctx.reply("📧 Masukkan kode verifikasi dari email lama:");
    return ctx.wizard.next();
  },
  (ctx) => {
    userData[ctx.from.id].verificationCode = ctx.message.text;
    ctx.reply("📨 Masukkan email baru yang ingin Anda kaitkan:");
    return ctx.wizard.next();
  },
  (ctx) => {
    userData[ctx.from.id].newEmail = ctx.message.text;
    ctx.reply("📩 Masukkan kode verifikasi dari email baru:");
    return ctx.wizard.next();
  },
  async (ctx) => {
    const {
      oldEmail,
      password,
      verificationCode,
      newEmail,
    } = userData[ctx.from.id];
    const newEmailVerificationCode = ctx.message.text;

    ctx.reply("⏳ Sedang memproses login...");
    const loginData = await login(oldEmail, password, verificationCode);

    if (!loginData) {
      ctx.reply("❌ Login gagal! Pastikan email, password, atau kode verifikasi benar.");
      return ctx.scene.leave();
    }

    ctx.reply("🔄 Sedang mengganti email...");
    const result = await changeEmail(
      loginData.gameToken,
      loginData.guid,
      loginData.token,
      newEmail,
      newEmailVerificationCode
    );

    ctx.reply(result);
    delete userData[ctx.from.id];
    return ctx.scene.leave();
  }
);

// Setup Scene
const stage = new Scenes.Stage([changeEmailScene]);
bot.use(session());
bot.use(stage.middleware());

// Command start
bot.command("start", (ctx) => {
  ctx.reply("👋 Selamat datang! Gunakan perintah /changeemail untuk mengganti email.");
});

// Command untuk memulai pergantian email
bot.command("changeemail", (ctx) => {
  ctx.scene.enter("CHANGE_EMAIL");
});

// Jalankan bot
bot.launch();
console.log("🤖 Bot telah berjalan...");

// Clean up
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
