const axios = require("axios");
const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "join",
  eventType: ["log:subscribe"],
  version: "1.2.0",
  credits: "Thanh Nguyên",
  description: "Gửi thông báo và file MP3 khi bot hoặc thành viên được thêm vào nhóm",
};

module.exports.run = async function ({ api, event }) {
  const { threadID, logMessageData } = event;
  if (!threadID || !logMessageData?.addedParticipants) return;

  const botID = api.getCurrentUserID();
  const isBotAdded = logMessageData.addedParticipants.some(i => i.userFbId === botID);
  const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss - DD/MM/YYYY");

  const getMP3Stream = async () => {
    try {
      const res = await axios.get("https://apidocs-ten.vercel.app/api/nhac?apikey=tnguyen001"); // Thay bằng API cung cấp MP3
      if (!res.data?.url || !res.data.url.endsWith(".mp3")) throw new Error("Không lấy được URL MP3");

      const audioUrl = res.data.url;
      const filePath = path.join(__dirname, "join_audio.mp3");

      const response = await axios({
        url: audioUrl,
        method: "GET",
        responseType: "stream"
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on("finish", () => resolve(fs.createReadStream(filePath)));
        writer.on("error", reject);
      });
    } catch (err) {
      console.error("❌ Lỗi tải MP3:", err);
      return null;
    }
  };

  // Khi bot được thêm vào nhóm
  if (isBotAdded) {
    try {
      await api.changeNickname(
        `『 ${global.config.PREFIX} 』 • ${global.config.BOTNAME || "Bot"}`,
        threadID,
        botID
      );

      const threadInfo = await api.getThreadInfo(threadID);
      const memberCount = threadInfo.participantIDs.length;

      const message = [
        `➾ Bây Giờ Là: ${time}`,
        `➾ Bot Đã Được Thêm Vào Nhóm Này!`,
        `▭▭▭▭ [ BOT INFO ] ▭▭▭▭`,
        `⋄ Tên Bot: ${global.config.BOTNAME || "Bot"}`,
        `⋄ Là Thành Viên Số ${memberCount} Của Nhóm!`,
        `⋄ Mình Rất Hân Hạnh Được Phục Vụ Mọi Người! 🤖`,
        `▭▭▭▭▭▭▭▭▭▭▭▭`
      ].join("\n");

      await api.sendMessage(message, threadID);

      const audioStream = await getMP3Stream();
      if (audioStream) {
        api.sendMessage({ attachment: audioStream }, threadID, () => {
          fs.unlinkSync(path.join(__dirname, "join_audio.mp3"));
        });
      }
    } catch (e) {
      console.error("❌ Bot Join Error:", e);
      return api.sendMessage("❌ Lỗi khi xử lý bot vào nhóm!", threadID);
    }
    return;
  }

  // Khi thành viên thường được thêm vào nhóm
  try {
    const added = logMessageData.addedParticipants;
    const threadInfo = await api.getThreadInfo(threadID);
    const memberCount = threadInfo.participantIDs.length;

    const nameArray = added.map(user => user.fullName || "Không Rõ");
    const mentions = added.map(user => ({
      tag: user.fullName || "Không Rõ",
      id: user.userFbId
    }));

    const message = [
      `➾ Bây Giờ Là: ${time}`,
      `➾ Xin Chào Mừng Thành Viên Mới Của Chúng Ta !!!`,
      `▭▭▭▭ [ INFO ] ▭▭▭▭`,
      `⋄ Name: ${nameArray.join(", ")}`,
      `⋄ Là Thành Viên Số ${memberCount} Của Nhóm!`,
      `⋄ Chúc ${nameArray.join(", ")} Một Ngày Vui Vẻ 🍒`,
      `▭▭▭▭▭▭▭▭▭▭▭▭`
    ].join("\n");

    await api.sendMessage({ body: message, mentions }, threadID);

    const audioStream = await getMP3Stream();
    if (audioStream) {
      api.sendMessage({ attachment: audioStream }, threadID, () => {
        fs.unlinkSync(path.join(__dirname, "join_audio.mp3"));
      });
    }
  } catch (err) {
    console.error("❌ Member Join Error:", err);
    return api.sendMessage("❌ Gặp lỗi khi gửi chào mừng!", threadID);
  }
};
