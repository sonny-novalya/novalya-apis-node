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
    })
      .then(async (record) => {
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
            res.status(200).json({ status: "success", data: record });
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
          res.status(200).json({ status: "success", data: result });
        }
      })
      .catch((error) => {
        res
          .status(500)
          .json({
            status: "error",
            message: "An error occurred while creating target setting.",
          });
      });
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while creating the message.",
      });
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
      return res
        .status(404)
        .json({ status: "error", message: "Send request message not found" });
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

    res
      .status(200)
      .json({ status: "success", data: existingSendRequestMessage });
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while updating the message.",
      });
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
      res.status(200).json({ status: "success", data: record });
    })
    .catch((error) => {
      console.error("Error occurred:", error);  // Log the error for debugging
      res.status(500).json({
        status: "error",
        message: "An error occurred while creating target setting.",
      });
    });
  } catch (error) {
    console.error("Error occurred:", error);  // Log the error for debugging
    res.status(500).json({
      status: "error",
      message: "An error occurred while fetching send request messages.",
    });
  }
};


module.exports = self;
