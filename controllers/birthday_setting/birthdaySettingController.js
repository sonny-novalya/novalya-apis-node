const {
  BirthdaySetting,
  MessageData,
  Section,
  Sequelize,
  Stage,
} = require("../../Models");
const Op = Sequelize.Op;
let self = {};
const db = require("../../Models/crm");

self.getBirthdaySetting = async (req, res) => {
  try {
    const user_id = req.authUser;
    const existingBirthdaySetting = await BirthdaySetting.findOne({
      where: { user_id },
      include: [
        {
          model: MessageData,
          as: "message",
          include: [
            {
              model: Section,
            },
          ],
        },
        {
          model: db.Message,
          as: "newMessage", 
          include: [
            {
              model: db.MessageVariant,
              as: "variants",
            },
          ],
        },
      ],
    });
    res
      .status(201)
      .json({
        status: "success",
        message: "birthday setting fetched successfully",
        data: existingBirthdaySetting,
      });
  } catch (error) {
    res.status(500).json({ status: "error", message: "something went wrong" });
  }
};

self.createBirthdaySetting = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { type, time_interval, birthday_id, birthday_type, action } =
      req.body;
    const existingBirthdaySetting = await BirthdaySetting.findOne({
      where: { user_id },
    });
    // Create a new birthday setting record in the database

    if (existingBirthdaySetting) {
      // If it exists, update the existing record
      await existingBirthdaySetting.update({
        type,
        time_interval: time_interval || 1,
        birthday_id,
        birthday_type,
        action,
      });
    } else {
      // If it doesn't exist, create a new record
      const newBirthdaySetting = await BirthdaySetting.create({
        user_id,
        type,
        time_interval: time_interval || 1,
        birthday_id,
        birthday_type,
        action,
      });
    }
    const birthdaySetting = await BirthdaySetting.findOne({
      where: { user_id },
      include: [
        {
          model: MessageData,
          as: "message",
          include: [
            {
              model: Section,
            },
          ],
        },
        {
          model: db.Message,
          as: "newMessage", 
          include: [
            {
              model: db.MessageVariant,
              as: "variants",
            },
          ],
        },

      ],
    });
    res
      .status(201)
      .json({
        status: "success",
        message: "birthday setting created successfully",
        data: birthdaySetting,
      });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: "Unable to create birthday setting" });
  }
};

module.exports = self;
