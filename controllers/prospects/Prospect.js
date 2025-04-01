const {
  TargetFriendSettings,
  Group,
  MessageData,
  MessageSection,
  Section,
  Sequelize,
  Prospects,
  FacebookGroupUsers,
} = require("../../Models");
const Op = Sequelize.Op;
let self = {};

self.createProspect = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { fb_user_id } = req.body;
    Prospects.findOne({
      where: { user_id: user_id, fb_user_id: fb_user_id },
    })
      .then(async (record) => {
        if (record) {
          const currentDate = new Date();
          const newProspect = await Prospects.update(
            {
              date_add: currentDate,
            },
            {
              where: { user_id: user_id, fb_user_id: fb_user_id },
            }
          );
          Prospects.findOne({
            where: {
              user_id: user_id,
            },
          }).then(async (record) => {
            res
              .status(400)
              .json({ status: "error", message: "Record Updated" });
          });
        } else {
          const result = await Prospects.create({
            user_id,
            fb_user_id,
          });
          res.status(200).json({ status: "success", data: result });
        }
      })
      .catch((error) => {
        res
          .status(500)
          .json({
            status: "error",
            message: "An error occurred while creating Prospect setting.",
          });
      });
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while creating Prospect setting.",
      });
  }
};

self.checkProspect = async (req, res) => {
  try {
    const user_id = req.authUser;

    const { fb_user_id } = req.body;
    Prospects.findOne({
      where: { user_id: user_id, fb_user_id: fb_user_id },
    })
      .then(async (record) => {
        if (record) {
          res
            .status(200)
            .json({
              status: "success",
              message: "Record already found",
              data: record,
            });
        } else {
          res.status(200).json({ status: "error", message: "no record found" });
        }
      })
      .catch((error) => {
        res
          .status(500)
          .json({
            status: "error",
            message: "An error occurred while creating Prospect setting.",
            error: error.message,
          });
      });
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while creating Prospect setting.",
      });
  }
};

self.getAllProspectMembers = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { group_id, group_name } = req.query;
    let record = [];
    record = await FacebookGroupUsers.findAll({
      where: { user_id: user_id, group_id: group_id },
    });
    res.status(200).json({
      status: "success",
      message: "prospect member list",
      data: record,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while getting prospect members.",
      error,
    });
  }
};

self.createFacebookProspectMember = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { fb_user_id, group_id } = req.body;

    FacebookGroupUsers.findOne({
      where: { user_id: user_id, fb_user_id: fb_user_id, group_id: group_id },
    })
      .then(async (record) => {
        if (record) {
          const currentDate = new Date();
          const newProspect = await FacebookGroupUsers.update(
            {
              updated_at: currentDate,
            },
            {
              where: {
                user_id: user_id,
                fb_user_id: fb_user_id,
                group_id: group_id,
              },
            }
          );
          FacebookGroupUsers.findOne({
            where: {
              user_id: user_id,
              fb_user_id: fb_user_id,
              group_id: group_id,
            },
          }).then(async (record) => {
            res
              .status(200)
              .json({ status: 200 , message: "Record Updated" });
          });
        } else {
          const result = await FacebookGroupUsers.create({
            user_id: user_id,
            fb_user_id: fb_user_id,
            group_id: group_id,
          });
          res.status(200).json({ status: "success", data: result });
        }
      })
      .catch((error) => {
        res.status(500).json({
          status: "error",
          message: "An error occurred while creating Prospect setting.",
        });
      });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while creating Prospect setting.",
    });
  }
};

module.exports = self;
