const { Group, Birthday, BirthdaySetting, Sequelize } = require("../../Models");
const Response = require("../../helpers/response");
const Op = Sequelize.Op;

const BirthdayController = {
  // birthday listing
  getListing: async (req, res) => {
    try {
      const user_id = req.user.id;

      var birthdaySetting = {};
      var birthday = [];
      var final_response = [];
      // Check if a group with the same URL already exists
      birthdaySetting = await BirthdaySetting.findOne({
        where: { user_id: user_id },
      });

      if (birthdaySetting != null && birthdaySetting.dataValues) {
        var birthdaySettingObj = birthdaySetting.dataValues;

        birthday = await Birthday.findOne({
          where: { id: birthdaySetting.dataValues.birthday_id },
        });

        var final_response = {
          id: birthdaySettingObj.id,
          user_id: birthdaySettingObj.user_id,
          type: birthdaySettingObj.type,
          time_interval: birthdaySettingObj.time_interval,
          birthday_id: birthdaySettingObj.birthday_id,
          birthday_type: birthdaySettingObj.birthday_type,
          messages: element,
        };
      } else {
        var final_response = {};
      }

      return Response.resWith202(res, "birthday listing", final_response);
    } catch (error) {
      return Response.resWith422(res, error.message);
    }
  },
};

module.exports = BirthdayController;
