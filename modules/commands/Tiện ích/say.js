const { downloadFile } = require("../../../utils/index");

module.exports.config = {

	name: "say",

	version: "1.0.1",

	hasPermssion: 0,

	credits: "Mirai Team",

	description: "Khiến bot trả về file âm thanh của chị Google thông qua văn bản",

	commandCategory: "Tiện ích", //

	usages: "[ru/en/ko/ja] [Text]",

	cooldowns: 5,

	dependencies: {

		"path": "",

		"fs-extra": ""

	}

};

module.exports.run = async function ({ api, event, args }) {

	try {

		const { createReadStream, unlinkSync, existsSync, mkdirSync } = require("fs-extra");

		const { resolve } = require("path");

		// Lấy nội dung văn bản từ tin nhắn hoặc phản hồi

		let content = (event.type === "message_reply") ? event.messageReply.body : args.join(" ");

		let languageToSay = (["ru", "en", "ko", "ja"].some(lang => content.indexOf(lang) === 0))

			? content.slice(0, content.indexOf(" "))

			: (global.config.language || "vi"); // fallback sang 'vi' nếu không xác định được

		let msg = (languageToSay !== (global.config.language || "vi"))

			? content.slice(3).trim()

			: content.trim();

		// Tạo thư mục cache nếu chưa tồn tại

		const cacheDir = resolve(__dirname, 'cache');

		if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });

		// Tạo đường dẫn tệp .mp3

		const filePath = resolve(cacheDir, `${event.threadID}_${event.senderID}.mp3`);

		// Tải file âm thanh từ Google TTS

		await downloadFile(

			`https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(msg)}&tl=${languageToSay}&client=tw-ob`,

			filePath

		);

		// Gửi file âm thanh, rồi xóa sau khi gửi

		return api.sendMessage(

			{ attachment: createReadStream(filePath) },

			event.threadID,

			() => unlinkSync(filePath)

		);

	} catch (error) {

		console.error("Lỗi trong lệnh say:", error);

		api.sendMessage("❌ Đã xảy ra lỗi khi xử lý yêu cầu.", event.threadID);

	}

};
