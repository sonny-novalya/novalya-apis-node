const db = require("../../Models/crm");
const { getAuthUser, Qry } = require("../../helpers/functions");
const campaign = db.instagramCampaign;
const tag = db.instatag;
const message_data = db.MessageData;
const section = db.Section;
const taggedusers = db.instataggedusers;
const Response = require("../../helpers/response");
const { Op } = require("sequelize");

const createInstaCampaign = async (req, res) => {
  try {
      const user_id = await getAuthUser(req, res);

      console.log("user id: ",user_id)
  
      const { group_id = 0, message_id, time_interval, userIds } = req.body;
  
      let campaignRecord = await campaign.findOne({ where: { user_id } });
      let isNewCampaignSetting = false;
  
      if (campaignRecord) {
        await campaign.update(
          { group_id, message_id, time_interval },
          { where: { user_id } }
        );
        campaignRecord = await campaign.findOne({ where: { user_id } }); // get updated record
      } else {
        campaignRecord = await campaign.create({
          user_id,
          group_id,
          message_id,
          time_interval,
        });
        isNewCampaignSetting = true
      }
  
      const newMessage = await db.Message.findOne({
        where: {
          user_id: user_id, id: message_id // Match the user_id in Message table
        },
        include: [
          {
            model: db.MessageVariant,
            as: "variants", // Include MessageVariant related to Message
            where: {
              message_id: message_id,  // Match message_id in MessageVariant table
            }
          },
        ],
      });
  
      // 2. get Taggedusers based on userIDs
      const taggedUsers = await taggedusers.findAll({
        where: {
          user_id: user_id,
          id: {
            [Op.in]: userIds,  // <-- handeling the userIds array
          },
        },
        attributes: ['user_id', 'id', 'insta_name', 'insta_user_id', 'numeric_insta_id', 'tag_id', 'thread_id', 'profile_pic', 'user_note']
      });
  
      return Response.resWith202(res, 'success', {
        campaignSettings: campaignRecord,
        isNewCampaignSetting,
        newMessage,
        taggedUsers,
      });
  
    } catch (error) {
  
      console.error("Error occurred:", error);  
      return Response.resWith422(res, error.message );
    }
};

const placecampaign = async (req, res) => {
  try {
    const user_id = await getAuthUser(req, res);

    const { group_id = 0, message_id, time_interval } = req.body;

    campaign
      .findOne({
        where: {
          user_id: user_id,
        },
      })
      .then(async (record) => {
        if (record) {
          const newTargetFriendSetting = await campaign.update(
            {
              group_id,
              message_id,
              time_interval,
            },
            {
              where: { user_id },
            }
          );
          campaign
            .findOne({
              where: {
                user_id: user_id,
              },
            })
            .then(async (record) => {
              res.status(200).json({ status: "success", data: record });
            });
        } else {
          const result = await campaign.create({
            user_id,
            group_id,
            message_id,
            time_interval,
          });
          res.status(200).json({
            status: "success",
            data: result,
            message: "send request message created",
          });
        }
      })
      .catch((error) => {
        res.status(500).json({
          status: "error",
          message: "Error creating send request message",
          error: error.message
        });
      });
  } catch (error) {
    res.status(500).json({ status: "error", message: error, error: error.message });
  }
};

const getAll = async (req, res) => {
  try {
    const authUser = await getAuthUser(req, res);

    const data = await campaign.findAll({
      where: { user_id: authUser },
      include: [
        tag,
        {
          model: message_data,
          as: "MessageDatum",
          include: [
            {
              model: section,
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

    const promises = data.map(async (tag) => {
      const tagIdToSearch = tag.group_id;
      const taggedUsersDetails = await taggedusers.findAll({
        where: {
          tag_id: {
            [Op.like]: `%${tagIdToSearch}%`,
          },
          user_id: authUser,
        },
      });

      return {
        ...tag.toJSON(),
        taggedUsers: taggedUsersDetails,
      };
    });

    const taggedUsersWithTags = await Promise.all(promises);

    res.status(200).json({ status: "success", data: taggedUsersWithTags });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOne = async (req, res) => {
  const id = req.params.id;

  const data = await campaign.findOne({
    where: { id: id },
    include: [{ model: tag }],
  });

  res.json(data);
};
const updateOne = async (req, res) => {
  const id = req.params.id;

  const data = await campaign.update(req.body, { where: { id: id } });
  res.send(data);
};

const deleteOne = async (req, res) => {
  const id = req.params.id;

  await campaign.destroy({ where: { id: id } });
  res.json({
    message: "campaign successfully deleted",
  });
};
const userdata = async (req, res) => {
  const messagesSelect = await Qry(`SELECT * FROM usersdata`);
  if (messagesSelect.length > 0) {
    const userArray = { enteries: messagesSelect };
    res.status(200).json({ status: "success", data: userArray });
  }
};
module.exports = {
  userdata,
  placecampaign,
  getAll,
  getOne,
  updateOne,
  deleteOne,
  createInstaCampaign
};
