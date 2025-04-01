const {
  TargetInstaFriendSettings,
  InstaGroup,
  InstaMessageData,
  InstaKeyword,
  InstaSection,
  Sequelize,
} = require("../../Models");
const TargetFriendSettings =  TargetInstaFriendSettings
const Group = InstaGroup;
const MessageData = InstaMessageData;
const Keyword = InstaKeyword;
const Section = InstaSection;
const Op = Sequelize.Op;
let self = {};

self.createTargetSetting = async (req, res) => {
    try {
        const user_id = req.authUser;
        const { group_id, message, norequest, interval, gender, country, search_index,  prospect, selectedinterval, datevalue , keyword,action} = req.body;
        TargetFriendSettings.findOne({
            where: {
                user_id: user_id,
            },
        })
            .then(async (record) => {
                if (record) {
                    const newTargetFriendSetting = await TargetFriendSettings.update(
                        {
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
                            action
                        },
                        {
                            where: { user_id }
                        }
                    );
                    TargetFriendSettings.findOne({
                        where: {
                            user_id: user_id,
                        },
                    })
                        .then(async (record) => {
                            res.status(200).json({ status: 'success', data: record });
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
                        action
                    });
                    res.status(200).json({ status: 'success', data: result });
                }
            })
            .catch((error) => {
                res.status(500).json({ status: 'error', message: 'An error occurred while creating target setting.' });
            });

    } catch (error) {
        res.status(500).json({ status: 'error', message: 'An error occurred while creating target setting.' });
    }
};

self.getAllTargetSetting = async (req, res) => {
    try {
        const user_id = req.authUser;
        const { page = 1, limit = null, orderBy = 'desc' } = req.query;
        const offset = (page - 1) * limit;
        const whereOptions = user_id ? { user_id: user_id } : {};

        const fetchParams = {
            where: whereOptions,
            offset,
            limit: limit !== null ? parseInt(limit) : undefined,
            order: [['id', orderBy === 'desc' ? 'DESC' : 'ASC']],
            include: [
                {
                    model: Group,// Include the Group model
                    as: 'groups',
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
