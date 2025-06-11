module.exports = function ({ api, models, Users, Threads, Currencies }) {
    return async function (event) {
        const { threadID, logMessageType, logMessageData } = event;
        const { setData, getData } = Threads;

        const threadData = await Threads.getData(threadID);
        let dataThread = threadData.threadInfo || {};

        // Đảm bảo các thuộc tính tồn tại để tránh lỗi
        dataThread.nicknames = dataThread.nicknames || {};
        dataThread.participantIDs = dataThread.participantIDs || [];
        dataThread.userInfo = dataThread.userInfo || [];
        dataThread.inviteLink = dataThread.inviteLink || { enable: false, link: "" };
        dataThread.adminIDs = dataThread.adminIDs || [];

        switch (logMessageType) {
            case 'joinable_group_link_mode_change': {
                if (logMessageData.cta_text) {
                    if (!dataThread.inviteLink.link || dataThread.inviteLink.link.length === 0) {
                        const info = await Threads.getInfo(threadID);
                        dataThread.inviteLink.link = info.inviteLink?.link || "";
                    }
                    dataThread.inviteLink.enable = true;
                } else {
                    dataThread.inviteLink.enable = false;
                }
                await setData(threadID, { threadInfo: dataThread });
                break;
            }

            case "joinable_group_link_reset": {
                dataThread.inviteLink.link = logMessageData.linh || "";
                await setData(threadID, { threadInfo: dataThread });
                break;
            }

            case 'log:thread-name': {
                dataThread.threadName = logMessageData.name || "";
                await setData(threadID, { threadInfo: dataThread });
                break;
            }

            case 'log:thread-image': {
                dataThread.imageSrc = logMessageData.url || "";
                await setData(threadID, { threadInfo: dataThread });
                break;
            }

            case "log:thread-color": {
                dataThread.emoji = logMessageData.theme_emoji || "";
                dataThread.threadTheme = {
                    id: logMessageData.theme_id || "",
                    accessibility_label: logMessageData.accessibility_label || ""
                };
                dataThread.color = logMessageData.theme_color || "";
                await setData(threadID, { threadInfo: dataThread });
                break;
            }

            case "log:thread-icon": {
                dataThread.emoji = logMessageData.thread_quick_reaction_emoji || "";
                await setData(threadID, { threadInfo: dataThread });
                break;
            }

            case "log:user-nickname": {
                const { participant_id, nickname } = logMessageData;
                if (nickname === '') {
                    delete dataThread.nicknames[participant_id];
                } else {
                    dataThread.nicknames[participant_id] = nickname;
                }
                await setData(threadID, { threadInfo: dataThread });
                break;
            }

            case 'log:unsubscribe': {
                if (logMessageData.leftParticipantFbId == api.getCurrentUserID()) return;

                const idIndex = dataThread.participantIDs.indexOf(logMessageData.leftParticipantFbId);
                if (idIndex !== -1) dataThread.participantIDs.splice(idIndex, 1);

                const userInfoIndex = dataThread.userInfo.findIndex(user => user.id == logMessageData.leftParticipantFbId);
                if (userInfoIndex !== -1) dataThread.userInfo.splice(userInfoIndex, 1);

                await setData(threadID, { threadInfo: dataThread });
                break;
            }

            case 'log:subscribe': {
                if (logMessageData.addedParticipants.some(i => i.userFbId == api.getCurrentUserID())) {
                    return require('./handleCreateDatabase.js')({ api, event, models, Users, Threads, Currencies });
                }

                for (const participant of logMessageData.addedParticipants) {
                    const userFbId = participant.userFbId;
                    const userInfo = await api.getUserInfo(userFbId);
                    const user = userInfo[userFbId];

                    const userData = {
                        id: userFbId,
                        name: user.name,
                        firstName: user.firstName,
                        vanity: user.vanity,
                        thumbSrc: user.thumbSrc,
                        profileUrl: user.profileUrl,
                        gender: user.gender === 2 ? "MALE" : "FEMALE",
                        type: "User",
                        isFriend: user.isFriend,
                        isBirthday: user.isBirthday
                    };

                    if (!dataThread.participantIDs.includes(userFbId)) {
                        dataThread.participantIDs.push(userFbId);
                    }

                    dataThread.userInfo.push(userData);

                    await Users.createData(userFbId, {
                        name: user.name,
                        gender: userData.gender,
                        data: {}
                    });
                }

                await setData(threadID, { threadInfo: dataThread });
                break;
            }

            case "log:thread-admins": {
                const { ADMIN_EVENT, TARGET_ID } = logMessageData;
                if (ADMIN_EVENT === "add_admin") {
                    if (!dataThread.adminIDs.find(a => a.id == TARGET_ID)) {
                        dataThread.adminIDs.push({ id: TARGET_ID });
                    }
                } else if (ADMIN_EVENT === "remove_admin") {
                    dataThread.adminIDs = dataThread.adminIDs.filter(item => item.id != TARGET_ID);
                }
                await setData(threadID, { threadInfo: dataThread });
                break;
            }

            default:
                break;
        }
    };
};
