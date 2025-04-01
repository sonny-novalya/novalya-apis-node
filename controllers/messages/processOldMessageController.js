const { UsersData } = require("../../Models");
const ProcessOldMessagesFunc = require("../../utils/newMsgSchemaChange");

let self = {};
self.processOldMessages = async (req, res) => {
    try {
        const { body } = req;
        // const userIds = [body.user_id];
        const userIds = [];
        
        const users_data_from_db = await UsersData.findAll({
            where: {isScript: "0"},
            offset: body.offset,
            limit: body.limit
        })

        users_data_from_db.forEach((userInfo) => {
            userIds.push(userInfo.id);
        });

        console.log(userIds, "userIds");

        await ProcessOldMessagesFunc(userIds)
        res.json({ message: 'Messages processed successfully' });
    } catch (error) {
        console.error('Error in processing messages:', error); 
        res.status(500).json({
            status: "error",
            message: "Something went wrong!!",
            error
        });
    }
}

module.exports = self;