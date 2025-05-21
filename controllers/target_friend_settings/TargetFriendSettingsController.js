const { TargetFriendSettings, Group, MessageData, Keyword, Section, Sequelize } = require('../../Models');
const Op = Sequelize.Op;
let self = {};
const db = require("../../Models/crm");

TargetFriendSettings.belongsTo(Group, { as: 'groupData', foreignKey: 'group_id' })

Group.hasMany(TargetFriendSettings, { foreignKey: 'group_id' })

self.createTargetSetting = async (req, res) => {
    try {
        const user_id = req.authUser;
        const {
          group_id,
          custom = null,
          message,
          norequest = "5",
          interval= "30-60",
          gender,
          country,
          search_index  = 1,
          prospect,
          selectedinterval,
          datevalue,
          keyword,
          action,
          prospection_type = "facebook",
          stratagy = 0,
          pro_stratagy,
          pro_convo,
          post_target
        } = req.body;
        TargetFriendSettings.findOne({
          where: {
            user_id: user_id,
            prospection_type: prospection_type,
            group_id: group_id
          },
        })
          .then(async (record) => {
            if (record) {
              const newTargetFriendSetting = await TargetFriendSettings.update(
                {
                  message,
                  norequest,
                  interval,
                  gender,
                  country,
                  search_index,
                  prospect,
                  selectedinterval,
                  datevalue,
                  keyword,
                  action,
                  prospection_type,
                  custom,
                  stratagy,
                  pro_stratagy,
                  pro_convo,
                  post_target
                },
                {
                  where: { user_id, prospection_type, group_id },
                }
              );
              TargetFriendSettings.findOne({
                where: {
                  user_id: user_id,
                  prospection_type: prospection_type,
                  group_id: group_id
                },
              }).then(async (record) => {
                res.status(200).json({ status: "success", data: record });
              });
            } else {
              const result = await TargetFriendSettings.create({
                user_id,
                group_id,
                message,
                norequest,
                interval,
                gender,
                country,
                search_index,
                prospect,
                selectedinterval,
                datevalue,
                keyword,
                action,
                prospection_type,
                custom,
                stratagy,
                pro_stratagy,
                pro_convo,
                post_target
              });
              res.status(200).json({ status: "success", data: result });
            }
          })
          .catch((error) => {
            res.status(500).json({
              status: "catch error",
              error: error.message,
              message: "An error occurred while creating target setting.",
            });
          });

    } catch (error) {
        res.status(500).json({
          status: "catch error",
          error: error.message,
          message: "An error occurred while creating target setting.",
        });
    }
};

self.getAllTargetSetting = async (req, res) => {
    try {
        const user_id = req.authUser;
        const {
          page = 1,
          limit = null,
          orderBy = "desc",
          prospection_type = "facebook",
          grp_id
        } = req.query;
        const offset = (page - 1) * limit;
        const whereOptions = user_id ? { user_id: user_id } : {};
        whereOptions.prospection_type = prospection_type;

        if(grp_id){
          whereOptions.group_id = grp_id;
        }

        const fetchParams = {
            where: whereOptions,
            offset,
            limit: limit !== null ? parseInt(limit) : undefined,
            order: [['id', orderBy === 'desc' ? 'DESC' : 'ASC']],
            include: [
                {
                    model: Group,// Include the Group model
                    as: 'groupData',
                },
                {
                    model: MessageData,// Include the Group model
                    as: 'messages',
                    include: [
                        {
                            model: Section,
                            order: Sequelize.literal('"messages->MessageSection"."id" ASC'),
                        },
                    ],
                },
                {
                  model: db.Message,
                  as: "newMessage",
                },
                {
                    model: Keyword,
                    as: 'keywords',
                }
            ],
        };
        const messageDataRecords = await TargetFriendSettings.findAll(fetchParams);

        res.status(200).json({ status: 'success', data: messageDataRecords });
    } catch (error) {
        res.status(500).json({ status: 'error', error: error, message: 'An error occurred while fetching target settings.' });
    }
};

module.exports = self;
