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

self.getBirthdaySettingListing = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { 
      sort_by = "id", 
      sort_type = "ASC",
      search,
      page = 1,
      limit = 25,
    } = req.body;

    const offset = (page - 1) * limit;
    const existingBirthdaySetting = await BirthdaySetting.findAndCountAll({
      where: { 
        user_id,
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { type: { [Op.like]: `%${search}%` } }
        ]
      },
      order: [[sort_by, sort_type]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Rename `birthday_id` to `message_id` in the response
    const transformedData = existingBirthdaySetting.rows.map(setting => {
      const obj = setting.toJSON(); // Converted Sequelize model to plain object
      obj.message_id = obj.birthday_id;
      delete obj.birthday_id;
      return obj;
    });

    return Response.resWith202(res, "birthday setting fetched successfully", {
      data: transformedData,
      total: existingBirthdaySetting.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(existingBirthdaySetting.count / limit),
    });
  } catch (error) {
    console.error("Error occurred:", error); 
    return Response.resWith422(res, "something went wrong");
  }
};

self.createBirthdaySettingListing = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { name, type, time_interval, message_id, birthday_type, action, prospect } = req.body;

    // ✅ Check if name is required
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return Response.resWith422(res, "Name is required");
    }

    const existingBirthdaySetting = await BirthdaySetting.findOne({ where: { user_id, name } });
    if (existingBirthdaySetting) {
      return Response.resWith422(res, "Birthday setting already exists with same name");
    }

    // If it doesn't exist, create a new record
    const newSetting = await BirthdaySetting.create({
      user_id,
      name: name.trim(),
      type,
      time_interval: time_interval || 1,
      birthday_id: message_id,
      birthday_type,
      action,
      prospect
    });

    // Format response: convert to JSON and rename birthday_id → message_id
    const result = newSetting.toJSON();
    result.message_id = result.birthday_id;
    delete result.birthday_id;

    return Response.resWith202(res, "birthday setting created successfully", result);
  } catch (error) {
    console.error("Error occurred:", error); 
    return Response.resWith422(res, "something went wrong");
  }
};

self.updateBirthdaySettingListing = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { id, name, type, time_interval, message_id, birthday_type, action, prospect } = req.body;

    // ✅ Validate name is required
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return Response.resWith422(res, "Name is required");
    }

    const existingBirthdaySetting = await BirthdaySetting.findOne({ where: { id, user_id } });

    if (!existingBirthdaySetting) {
      return Response.resWith422(res, "Birthday setting does not exist");
    }

    await existingBirthdaySetting.update({
      name: name.trim(),
      type,
      time_interval: time_interval || 1,
      birthday_id: message_id,
      birthday_type,
      action,
      prospect
    });

     // Fetch updated record again to ensure all changes are reflected
    const updatedSetting = await BirthdaySetting.findOne({ where: { id } });
    const result = updatedSetting.toJSON();
    result.message_id = result.birthday_id;
    delete result.birthday_id;

    return Response.resWith202(res, "birthday setting updated successfully", result);
  } catch (error) {
    console.error("Error occurred:", error); 
    return Response.resWith422(res, "something went wrong");
  }
};

self.deleteBirthdaySettingListing = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { id } = req.body;
    const existingBirthdaySetting = await BirthdaySetting.findOne({where: { id, user_id }});
    
    if (!existingBirthdaySetting) {
      return Response.resWith422(res, "Birthday setting does not exists");
    }
    
    await existingBirthdaySetting.destroy();
    return Response.resWith202(res, "birthday setting deleted successfully");
  } catch (error) {
    console.error("Error occurred:", error); 
    return Response.resWith422(res, "something went wrong");
  }
};

self.cloneBirthdaySettingListing = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { id } = req.body;
    const existingBirthdaySetting = await BirthdaySetting.findOne({where: { user_id, id }});
    const existingData = existingBirthdaySetting.toJSON();
    
    if (!existingBirthdaySetting) {
      return Response.resWith422(res, "Birthday setting does not exists");
    }

    const createBirthday = await BirthdaySetting.create({
      user_id: existingData.user_id,
      name: existingData.name + ' (Copy)',
      type: existingData.type,
      time_interval: existingData.time_interval || 1,
      birthday_id: existingData.birthday_id,
      birthday_type: existingData.birthday_type,
      action: existingData.action,
      prospect: existingData.prospect,
    });

    const birthdaySetting = await BirthdaySetting.findOne({
      where: { id: createBirthday.id }
    });
    
    const result = birthdaySetting.toJSON();
    result.message_id = result.birthday_id;
    delete result.birthday_id;

    return Response.resWith202(res, "birthday setting copied successfully", result);
  } catch (error) {
    console.error("Error occurred:", error); 
    return Response.resWith422(res, "something went wrong");
  }
};

module.exports = self;
