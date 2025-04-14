const {
  SendRequestMessage,
  MessageData,
  Message,
  Section,
  Sequelize,
  M
} = require("../../Models");
const Op = Sequelize.Op;
let self = {};
const db = require("../../Models/crm");

const Response = require("../../helpers/response");

// Create a new send request message
self.createSendRequestMessage = async (req, res) => {
  try {
    const user_id = req.authUser;
    const {
      reject_group_id,
      accept_group_id,
      reject_message_id,
      accept_message_id,
      reject_stage_id,
      accept_stage_id,
    } = req.body;

    SendRequestMessage.findOne({
      where: {
        user_id: user_id,
      },
    }).then(async (record) => {
        if (record) {
          const newTargetFriendSetting = await SendRequestMessage.update(
            {
              reject_group_id,
              accept_group_id,
              reject_message_id,
              accept_message_id,
              reject_stage_id,
              accept_stage_id,
            },
            {
              where: { user_id },
            }
          );
          SendRequestMessage.findOne({
            where: {
              user_id: user_id,
            },
          }).then(async (record) => {
            return Response.resWith202(res, "success", record);
          });
        } else {
          const result = await SendRequestMessage.create({
            user_id,
            reject_group_id,
            accept_group_id,
            reject_message_id,
            accept_message_id,
            reject_stage_id,
            accept_stage_id,
          });
          return Response.resWith202(res, "success", result);
        }
      })
      .catch((error) => {
        return Response.resWith422(res, "An error occurred while creating message");
      });
  } catch (error) {
    return Response.resWith422(res, "An error occurred while creating message");
  }
};

// Update an existing send request message by ID
self.updateSendRequestMessage = async (req, res) => {
  try {
    const sendRequestMessageID = req.params.id;
    const {
      reject_group_id,
      accept_group_id,
      reject_message_id,
      accept_message_id,
      reject_stage_id,
      accept_stage_id,
    } = req.body;

    const existingSendRequestMessage = await SendRequestMessage.findByPk(
      sendRequestMessageID
    );

    if (!existingSendRequestMessage) {
      return Response.resWith422(res, "Send request message not found");
    }

    // Update send request message attributes
    existingSendRequestMessage.accept_stage_id = accept_stage_id;
    existingSendRequestMessage.reject_stage_id = reject_stage_id;
    existingSendRequestMessage.accept_message_id = accept_message_id;
    existingSendRequestMessage.reject_message_id = reject_message_id;
    existingSendRequestMessage.reject_group_id = reject_group_id;
    existingSendRequestMessage.accept_group_id = accept_group_id;

    // Save the updated send request message
    await existingSendRequestMessage.save();

    return Response.resWith202(res, "success", existingSendRequestMessage);
  } catch (error) {

    return Response.resWith422(res, "An error occurred while updating the message.");
  }
};

// Get a list of all send request messages
self.getAllSendRequestMessages = async (req, res) => {
  try {
    const user_id = req.authUser;

    SendRequestMessage.findOne({
      where: {
        user_id: user_id,
      },
      include: [
        {
          model: Message,
          as: "accept_new_message",
          include: [
            {
              model: db.MessageVariant,
              as: "variants",
            },
          ],
        },
        {
          model: Message,
          as: "reject_new_message",
          include: [
            {
              model: db.MessageVariant,
              as: "variants",
            },
          ],
        },
        {
          model: MessageData,
          as: "accept_message",
          include: [
            {
              model: Section,
            },
          ],
        },
        {
          model: MessageData,
          as: "reject_message",
          include: [
            {
              model: Section,
            },
          ],
        },
      ],
    })
    .then((record) => {
      Response.resWith202(res, "success", record);
    })
    .catch((error) => {
      console.error("Error occurred:", error); 
      return Response.resWith422(res, "An error occurred while updating the message.");
    });
  } catch (error) {
    console.error("Error occurred:", error);  
    return Response.resWith422(res, "An error occurred while updating the message.");
  }
};


module.exports = self;
