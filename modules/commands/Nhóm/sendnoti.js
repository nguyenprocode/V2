const moment = require('moment-timezone');

module.exports.config = {
    name: "sendnoti",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Thanh Nguyên",
    description: "Gửi tin nhắn đến các nhóm",
    commandCategory: "Nhóm",
    usages: "[msg]",
    cooldowns: 5,
};

const getTime = () => moment.tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY || HH:mm:ss");

module.exports.handleReply = async function ({ api, event, handleReply, Users, Threads }) {
    const { threadID, messageID, senderID, body } = event;
    const name = await Users.getNameUser(senderID);

    switch (handleReply.type) {
        case "sendnoti": {
            const text = `📨 PHẢN HỒI TỪ THANH VIÊN\n────────────────────\n👤 Tên: ${name}\n🏘️ Nhóm: ${(await Threads.getInfo(threadID)).threadName || "không xác định"}\n🕒 Thời gian: ${getTime()}\n\n💬 Nội dung: ${body || "không có nội dung"}\n\n📎 Reply tin nhắn này để gửi lại cho các thành viên.\n────────────────────`;
            api.sendMessage(text, handleReply.threadID, (err, info) => {
                global.client.handleReply.push({
                    name: this.config.name,
                    type: "reply",
                    messageID: info.messageID,
                    messID: messageID,
                    threadID
                });
            });
            break;
        }
        case "reply": {
            const text = `🔁 PHẢN HỒI TỪ ADMIN\n────────────────────\n👤 Tên Admin: ${name}\n🕒 Thời gian: ${getTime()}\n\n💬 Nội dung: ${body}\n\n📎 Reply để báo về admin.\n────────────────────`;
            api.sendMessage(text, handleReply.threadID, (err, info) => {
                global.client.handleReply.push({
                    name: this.config.name,
                    type: "sendnoti",
                    messageID: info.messageID,
                    threadID
                });
            }, handleReply.messID);
            break;
        }
    }
};

module.exports.run = async function ({ api, event, args, Users }) {
    const { threadID, messageID, senderID } = event;
    if (!args[0]) return api.sendMessage("Vui lòng nhập nội dung cần gửi.", threadID);

    const allThread = global.data.allThreadID || [];
    let can = 0, canNot = 0;

    const text = `📢 THÔNG BÁO TỪ ADMIN\n────────────────────\n👤 Tên Admin: ${await Users.getNameUser(senderID)}\n🕒 Thời gian: ${getTime()}\n\n📝 Nội dung: ${args.join(" ")}\n\n✉️ Hãy reply tin nhắn này để gửi phản hồi.\n────────────────────`;

    for (const tid of allThread) {
        try {
            api.sendMessage(text, tid, (err, info) => {
                if (err) return canNot++;
                can++;
                global.client.handleReply.push({
                    name: this.config.name,
                    type: "sendnoti",
                    messageID: info.messageID,
                    messID: messageID,
                    threadID
                });
            });
        } catch (e) {
            console.log(e);
            canNot++;
        }
    }

    setTimeout(() => {
        api.sendMessage(`✅ Đã gửi đến ${can} nhóm.\n⚠️ Không gửi được đến ${canNot} nhóm.`, threadID);
    }, 2000);
};
