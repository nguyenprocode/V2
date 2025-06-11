const axios = require('axios');
const fs = require('fs');

module.exports.config = {
    name: "vdgai",
    version: "1.0.1",
    hasPermssion: 0,
    credits: "Thanh Nguyên",
    description: "Gửi video gái ngẫu nhiên từ API",
    commandCategory: "Tiện ích",
    usages: "prefix + vdgai",
    cooldowns: 5
};

module.exports.run = async function ({ api, event }) {
    try {
        const apiUrl = 'https://apidocs-ten.vercel.app/api/vdgai?apikey=tnguyen001';
        
        const response = await axios.get(apiUrl);
        const { data } = response;

        console.log("[VDGAI_DEBUG] Full API Response:", JSON.stringify(data, null, 2));

        let videoUrl = null;

        if (data && data.url) { 
            videoUrl = data.url;
        } else if (data && data.data && data.data.url) { 
            videoUrl = data.data.url;
        } else if (data && data.video && data.video.url) { 
            videoUrl = data.video.url;
        } else {
            console.error("[VDGAI_ERROR] Cấu trúc API không như mong đợi hoặc thiếu URL:", data);
            return api.sendMessage("❌ Không thể lấy video từ API! Cấu trúc dữ liệu không hợp lệ. Vui lòng thử lại sau.", event.threadID, event.messageID);
        }

        if (!videoUrl || typeof videoUrl !== 'string') {
            return api.sendMessage("❌ Không thể lấy URL video từ API! Vui lòng thử lại sau.", event.threadID, event.messageID);
        }

        if (!videoUrl.endsWith('.mp4')) {
            return api.sendMessage("🚫 Link video không hợp lệ (phải là .mp4)! Vui lòng thử lại sau.", event.threadID, event.messageID);
        }

        const timestamp = Date.now();
        const videoPath = `/tmp/vdgai_${timestamp}.mp4`;

        const videoStreamResponse = await axios({
            url: videoUrl,
            method: 'GET',
            responseType: 'stream'
        });

        await new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(videoPath);
            videoStreamResponse.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        const messageBody = `🎬 Khám Phá Video Ngẫu Nhiên 🎥\n` +
                             `════════════════════════════\n` +
                             `📝 Nguồn: ${data.author || "Ẩn danh"}\n` +
                             `🔗 Link: ${videoUrl}\n` +
                             `════════════════════════════\n` +
                             `✨ Thưởng thức video và chia sẻ cảm nhận nhé! 😄`;

        await api.sendMessage({
            body: messageBody,
            attachment: fs.createReadStream(videoPath)
        }, event.threadID, event.messageID);

        fs.unlink(videoPath, (err) => {
            if (err) console.error("[VDGAI_ERROR] Lỗi khi xóa file tạm:", err);
        });

    } catch (error) {
        console.error("[VDGAI_ERROR] Đã có lỗi xảy ra:", error);
        if (error.response) {
            api.sendMessage(`❌ API gặp sự cố! Mã lỗi: ${error.response.status}. Vui lòng thử lại sau. 😔`, event.threadID, event.messageID);
        } else if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
            api.sendMessage("❌ Không thể kết nối đến API! Vui lòng kiểm tra kết nối mạng hoặc API đang gặp sự cố. 😔", event.threadID, event.messageID);
        } else {
            api.sendMessage("❌ Đã có lỗi xảy ra khi lấy video! Vui lòng thử lại sau. 😔", event.threadID, event.messageID);
        }
    }
};
