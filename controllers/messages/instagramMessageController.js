const {
  InstaMessageData,
  InstaSection,
  InstaMessageDataType,
  InstaMessageSection,
  Sequelize,
} = require("../../Models");
const Op = Sequelize.Op;
let self = {};

const MessageData = InstaMessageData;
const Section = InstaSection;
const MessageDataType = InstaMessageDataType;
const MessageSection = InstaMessageSection;

self.createMessage = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { types, name, varient, randomcode, title, message, sections } =
      req.body;
    const newMessage = await MessageData.create({
      user_id,
      name,
      varient,
      randomcode,
      title,
      message,
    });
    if (types && types.length > 0) {
      const typePromises = types.map(async (type) => {
        return await MessageDataType.create({
          message_data_id: newMessage.id,
          type,
        });
      });
      await Promise.all(typePromises);
    }

    if (sections && sections.length > 0) {
      for (const section of sections) {
        await MessageSection.create({
          message_data_id: newMessage.id,
          section_id: section,
        });
      }
    }
    res.status(201).json({ status: "success", data: newMessage });
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while creating the message.",
      });
  }
};

self.getAllMessages = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { type = null } = req.query;
    const { page = 1, limit = null, orderBy = "desc" } = req.query;
    const offset = (page - 1) * limit;
    const whereOptions = {
      user_id: user_id,
    };
    const whereRelationOptions = {};
    if (type) {
      whereRelationOptions.type = type;
    }

    const fetchParams = {
      where: whereOptions,
      offset,
      limit: limit !== null ? parseInt(limit) : undefined,
      order: [["id", orderBy === "desc" ? "DESC" : "ASC"]],
      include: [
        {
          model: MessageDataType,
          attributes: ["type"],
          where: whereRelationOptions,
        },
        {
          model: Section,
        },
      ],
    };
    const messages = await MessageData.findAll(fetchParams);
    res.status(200).json({ status: "success", data: messages });
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while fetching messages.",
        error: error.message,
      });
  }
};

self.getSingleMessage = async (req, res) => {
  try {
    const messageID = req.params.messageID;

    const message = await MessageData.findByPk(messageID, {
      include: [
        {
          model: MessageDataType,
          attributes: ["type"],
        },
        {
          model: Section,
        },
      ],
    });
    if (!message) {
      return res
        .status(404)
        .json({ status: "error", message: "Message not found" });
    }

    res.status(200).json({ status: "success", data: message });
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while fetching the message.",
      });
  }
};

self.updateMessage = async (req, res) => {
  try {
    const user_id = req.authUser;
    const messageID = req.params.messageID;
    const { types, name, sections } = req.body;

    const existingMessage = await MessageData.findByPk(messageID);

    if (!existingMessage) {
      return res
        .status(404)
        .json({ status: "error", message: "Message not found" });
    }

    // Update message attributes
    existingMessage.user_id = user_id;
    existingMessage.name = name;

    // Save the updated message
    await existingMessage.save();

    if (types && types.length > 0) {
      await MessageDataType.destroy({ where: { message_data_id: messageID } }); // Delete existing types
      const typePromises = types.map(async (type) => {
        return MessageDataType.create({ message_data_id: messageID, type });
      });

      await Promise.all(typePromises);
    }

    if (sections && sections.length > 0) {
      await MessageSection.destroy({ where: { message_data_id: messageID } }); // Delete existing types

      for (const section of sections) {
        await MessageSection.create({
          message_data_id: messageID,
          section_id: section,
        });
      }
    }

    res.status(200).json({ status: "success", data: existingMessage });
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while updating the message.",
      });
  }
};

self.deleteMessage = async (req, res) => {
  try {
    const messageID = req.params.messageID;

    const existingMessage = await MessageData.findByPk(messageID);
    if (!existingMessage) {
      return res
        .status(404)
        .json({ status: "error", message: "Message not found" });
    }

    // Delete the message
    await existingMessage.destroy();

    await MessageDataType.destroy({ where: { message_data_id: messageID } }); // Delete existing types
    await MessageSection.destroy({ where: { message_data_id: messageID } });

    res
      .status(200)
      .json({ status: "success", message: "Message deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while deleting the message.",
      });
  }
};

module.exports = self;
