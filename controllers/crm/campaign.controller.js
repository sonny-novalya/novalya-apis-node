const db = require("../../Models/crm");
const { getAuthUser, Qry } = require("../../helpers/functions");
const campaign = db.campaign;
const tag = db.tag;
const message_data = db.MessageData;
const section = db.Section;
const taggedusers = db.taggedusers;
const { Op } = require("sequelize");
const placecampaign = async (req, res) => {
  try {
    const user_id = await getAuthUser(req, res);

    const { group_id, message_id, time_interval } = req.body;

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
              group_id: 0,
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
            group_id: 0,
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
        });
      });
  } catch (error) {
    res.status(500).json({ status: "error", message: error });
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
};
