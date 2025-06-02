const { BirthdaySetting, MessageData, Section, Sequelize} = require("../../Models");
const Op = Sequelize.Op;
let self = {};
const db = require("../../Models/crm");
const Response = require("../../helpers/response");

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
    return Response.resWith202(res, "birthday setting fetched successfully", existingBirthdaySetting);
  } catch (error) {
    console.error("Error occurred:", error); 
    return Response.resWith422(res, "something went wrong");
  }
};

self.getBirthdaySettingExcludingVariant = async (req, res) => {
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
        },
      ],
    });
    return Response.resWith202(res, "birthday setting fetched successfully", existingBirthdaySetting);
  } catch (error) {
    console.error("Error occurred:", error); 
    return Response.resWith422(res, "something went wrong");
  }
};

self.createBirthdaySetting = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { type, time_interval, birthday_id, birthday_type, action, prospect } = req.body;
    const existingBirthdaySetting = await BirthdaySetting.findOne({where: { user_id }});
    console.log('existingBirthdaySetting--46', existingBirthdaySetting);
    
    if (existingBirthdaySetting) {
      // If it exists, update the existing record
      var updateData = await existingBirthdaySetting.update({
        type,
        time_interval: time_interval || 1,
        birthday_id,
        birthday_type,
        action,
        prospect
      });
      console.log('updateData--46', updateData);
    } else {
      // If it doesn't exist, create a new record
      const newBirthdaySetting = await BirthdaySetting.create({
        user_id,
        type,
        time_interval: time_interval || 1,
        birthday_id,
        birthday_type,
        action,
        prospect
      });
      console.log('newBirthdaySetting--46', newBirthdaySetting);
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
    return Response.resWith202(res, "birthday setting created successfully", birthdaySetting);
    
  } catch (error) {

    console.error("Error occurred:", error); 
    return Response.resWith422(res, "something went wrong");
  }
};

module.exports = self;
