module.exports.config = {
  name: "goihon",
  version: "1.0.0",
  hasPermssion: 1,
  credits: "Thanh Nguyên",
  description: "Gọi hồn người được tag nhiều lần với nội dung khác nhau",
  commandCategory: "Spam",
  usages: "@tag",
  cooldowns: 5
};

module.exports.run = async ({ api, event }) => {
  const { threadID, messageID, mentions } = event;

  // Kiểm tra có tag ai không
  if (!Object.keys(mentions).length)
    return api.sendMessage("Bạn phải tag một người để gọi hồn!", threadID, messageID);

  const uid = Object.keys(mentions)[0];
  const nameTag = mentions[uid].replace("@", "");
  const tag = [{ id: uid, tag: nameTag }];

  // Danh sách nội dung gửi
  const messages = [
    `${nameTag} dậy mẹ đê!`,
    ` ${nameTag} ccho ơi!`,
    `${nameTag} m có dậy không thì bảo?`,
    `${nameTag} ngoi lên nói chuyện coi!`,
    `${nameTag} m chết rồi hả🙂`
  ];

  // Gửi từng nội dung với độ trễ giữa các tin nhắn
  for (let i = 0; i < messages.length; i++) {
    ((index) => {
      setTimeout(() => {
        api.sendMessage({ body: messages[index], mentions: tag }, threadID);
      }, index * 2000); // 2 giây mỗi tin nhắn
    })(i);
  }
};
