const ApiAutoresbot = require('api-autoresbot');
const config        = require("@config");
const api           = new ApiAutoresbot(config.APIKEY);
const mess          = require('@mess');
const { logWithTime }  = require('@lib/utils');

const WAKTU_GAMES   = 60; // 60 detik

const { addUser, removeUser, isUserPlaying } = require("@tmpDB/tebak gambar");

async function handle(sock, messageInfo) {
    const { remoteJid, message, fullText } = messageInfo;

    if (!fullText.includes("gambar")) {
        return true;
    }

    try {
        const response = await api.get(`/api/game/tebakgambar`);

        const UrlData = response.data.img;
        const answer = response.data.jawaban;
        const deskripsi = response.data.deskripsi;

        // Ketika sedang bermain
        if (isUserPlaying(remoteJid)) {
                return await sock.sendMessage(
                    remoteJid,
                    { text: mess.game.isPlaying },
                    { quoted: message }
                );
        }

        // Buat timer baru untuk user
        const timer = setTimeout(async () => {
            if (!isUserPlaying(remoteJid)) return;

            removeUser(remoteJid); // Hapus user dari database jika waktu habis

            if (mess.game_handler.waktu_habis) {
                const messageWarning = mess.game_handler.waktu_habis.replace('@answer', answer);
                await sock.sendMessage(remoteJid, { text: messageWarning }, { quoted: message });
            }
        }, WAKTU_GAMES * 1000);


        // Tambahkan pengguna ke database
        addUser(remoteJid, {
            answer: answer.toLowerCase(),
            hadiah  : 10, // jumlah money jika menang
            command : fullText,
            timer: timer
        });

        await sock.sendMessage(remoteJid, { image: { url: UrlData }, caption: `Silahkan Jawab Soal Di Atas Ini\n\nDeskripsi : ${deskripsi}\nWaktu : ${WAKTU_GAMES}s` }, { quoted: message });
     
        logWithTime('Tebak Gambar', `Jawaban : ${answer}`);

        
    } catch (error){

        const errorMessage = `Maaf, terjadi kesalahan saat memproses permintaan Anda. Mohon coba lagi nanti.\n\n${error || "Kesalahan tidak diketahui"}`;
        await sock.sendMessage(
            remoteJid,
            { text: errorMessage },
            { quoted: message }
        );
    }

}

module.exports = {
    handle,
    Commands: ["tebak", "tebakgambar"],
    OnlyPremium: false,
    OnlyOwner: false,
};
