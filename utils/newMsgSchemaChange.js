const { Category, Message, MessageVariant, MessageData, Section, MessageSection, MessageDataType, UsersData } = require("../Models");

const ProcessOldMessagesFunc = async (userIds = []) => {
    try {
        userIds.forEach(async (user_id) => {
            const userScriptRun = await UsersData.findOne({ where: { id: user_id, isScript: "0" } })
            if (userScriptRun) {
                let categoryId;
                const category = await Category.findOne({ where: { user_id, name: 'My message' } });
                if (!category) {
                    const newCategory = await Category.create({ user_id, name: 'My message' });
                    categoryId = newCategory.id;
                } else {
                    categoryId = category.id;
                }

                const usersAllMessages = await MessageData.findAll({
                    where: { user_id }
                });

                usersAllMessages.forEach(async (userMessage) => {
                    let message_data_id = userMessage.id;
                    let message_title = userMessage.name;

                    let messageType = await MessageDataType.findOne({ where: { message_data_id } });
                    if (messageType) {
                        const userAllMessageSections = await MessageSection.findAll({
                            where: { message_data_id },
                            order: [
                                ['id', 'ASC']
                            ]
                        });

                        let sectionIdPool = [];
                        userAllMessageSections.forEach((userMessageSection) => {
                            sectionIdPool.push(userMessageSection.section_id);
                        });

                        const userMessageVarients = await Section.findAll({
                            where: { id: sectionIdPool },
                            order: [
                                ['id', 'ASC']
                            ]
                        });

                        let varientPool = [];
                        userMessageVarients.forEach((userMessageVarient) => {
                            try {
                                let varientJson = JSON.parse(userMessageVarient.varient);
                                varientPool.push(varientJson);
                            } catch(err) {
                                console.log(userMessageVarient.varient);
                            }
                        });

                        if (varientPool.length > 0) {
                            let newMessagePool = [];
                            varientPool[0].forEach((msgTxt, index) => {
                                let newMessage = "";
                                for (let i = 0; i < varientPool.length; i++) {
                                    if(varientPool[i][index]) {
                                        newMessage += " " + varientPool[i][index];
                                    }
                                }
                                newMessagePool.push(newMessage.trim());
                            });

                            let createdMsgInDB = await Message.create({ user_id, title: message_title, category_id: categoryId });
                            newMessagePool.forEach(async (msg) => {
                                try {
                                    await MessageVariant.create({ message_id: createdMsgInDB.id, name: msg });
                                } catch(err) {
                                    //
                                }
                            })
                        }
                    }
                })

                await userScriptRun.update({ isScript: "1" });
            }
        });
        return true
    } catch (error) {
        return false;
    }
}

module.exports = ProcessOldMessagesFunc;