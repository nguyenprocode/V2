const fs = require("fs");
const path = require("path");
const configPath = path.resolve(__dirname, '..', '..', '..', 'config.json');

module.exports.config = {
  name: "admin",
  version: "3.0.0",
  hasPermssion: 0,
  credits: "Niio-team (Vtuan) - Redesign: Thanh Nguyên",
  description: "Quản lý SuperAdmin, NDH và chế độ bảo trì",
  commandCategory: "Admin",
  usages: "[add|remove|sp|rsp|list|only|refresh]",
  cooldowns: 3,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, mentions, messageReply } = event;
  const action = args[0]?.toLowerCase();

  const uidList = getUIDs(args, mentions, messageReply);
  const isAdmin = global.config.ADMINBOT?.includes(senderID);
  const isNDH = global.config.NDH?.includes(senderID);

  // ADMIN ACTIONS
  if (["add", "remove", "sp", "rsp"].includes(action)) {
    if (!isAdmin) return api.sendMessage("⛔ Bạn không có quyền sử dụng lệnh này!", threadID, messageID);
    const count = updateList(action, uidList);
    const actionNames = {
      add: "🌟 Đã thêm vào SuperAdmin:",
      remove: "🗑️ Đã xóa khỏi SuperAdmin:",
      sp: "🔧 Đã thêm vào NDH:",
      rsp: "🧹 Đã xóa khỏi NDH:"
    };
    return api.sendMessage(`${actionNames[action]}\n${uidList.map(uid => `• ${uid}`).join('\n') || "Không có UID hợp lệ."}`, threadID, messageID);
  }

  // LIST MODE
  if (action === "list") {
    const { admin, ndh } = await getLists(api);
    return api.sendMessage(
      `📋 DANH SÁCH QUẢN TRỊ BOT\n\n👑 SuperAdmin:\n${admin.join("\n") || "Không có"}\n\n🛠 NDH:\n${ndh.join("\n") || "Không có"}`,
      threadID, messageID
    );
  }

  // BẢO TRÌ / REFRESH
  if (["only", "refresh"].includes(action)) {
    if (!isAdmin) return api.sendMessage("⛔ Bạn không có quyền!", threadID, messageID);
    if (action === "only") {
      global.config.MAINTENANCE = !global.config.MAINTENANCE;
      saveConfig();
      return api.sendMessage(`🔧 Đã ${global.config.MAINTENANCE ? "bật" : "tắt"} chế độ bảo trì bot.`, threadID, messageID);
    } else {
      global.config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      return api.sendMessage("🔄 Đã tải lại file config thành công!", threadID, messageID);
    }
  }

  // XEM GIAO DIỆN HƯỚNG DẪN
  if (!isAdmin && !isNDH) {
    const { admin, ndh } = await getLists(api);
    return api.sendMessage(
      `📋 DANH SÁCH QUẢN TRỊ BOT\n\n👑 SuperAdmin:\n${admin.join("\n") || "Không có"}\n\n🛠 NDH:\n${ndh.join("\n") || "Không có"}`,
      threadID, messageID
    );
  }

  // HƯỚNG DẪN
  return api.sendMessage(
    `📚 SUPPORT ADMIN\n
👥 ADMIN ADD
🗑️ ADMIN REMOVE
🛟 ADMIN SP
🗑️ ADMIN RSP
📋 ADMIN LIST
🔒 ADMIN ONLY
♻️ ADMIN REFRESH

💡 DÙNG @TAG, UID HOẶC REPLY TIN NHẮN.`,
    threadID, messageID
  );
};

// ──────────────── TOOLS ──────────────── //

function getUIDs(args, mentions, messageReply) {
  let uids = [];
  if (mentions && Object.keys(mentions).length) uids.push(...Object.keys(mentions));
  if (messageReply) uids.push(messageReply.senderID);
  if (args.length > 1) uids.push(...args.slice(1).filter(id => /^\d+$/.test(id)));
  return [...new Set(uids)];
}

function updateList(action, uidList) {
  let count = 0;
  const config = global.config;
  const list = (["add", "remove"].includes(action)) ? config.ADMINBOT : config.NDH;
  uidList.forEach(uid => {
    if (!/^\d+$/.test(uid)) return;
    if (["add", "sp"].includes(action) && !list.includes(uid)) {
      list.push(uid);
      count++;
    }
    if (["remove", "rsp"].includes(action) && list.includes(uid)) {
      list.splice(list.indexOf(uid), 1);
      count++;
    }
  });
  saveConfig();
  return count;
}

function saveConfig() {
  fs.writeFileSync(configPath, JSON.stringify(global.config, null, 2), "utf8");
}

async function getLists(api) {
  const getNames = async uids => Promise.all(uids.map(async uid => {
    try {
      const info = await api.getUserInfo(uid);
      return `• ${info[uid]?.name || "Không rõ"} (UID: ${uid})`;
    } catch {
      return `• Không rõ tên (UID: ${uid})`;
    }
  }));
  return {
    admin: await getNames(global.config.ADMINBOT || []),
    ndh: await getNames(global.config.NDH || [])
  };
}
