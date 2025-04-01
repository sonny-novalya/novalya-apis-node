const {
  TargetFriendSettings,
  Group,
  MessageData,
  MessageSection,
  Section,
  Sequelize,
  Prospects,
  Novadata,
  Userlimit,
} = require("../../Models");
const Op = Sequelize.Op;
let self = {};

self.checkPlan = async (req, res) => {
  try {
    const user_id = req.authUser;
    Userlimit.findOne({
      where: { user_id: 2298 },
    })
      .then(async (record) => {
        if (record) {
          res.status(200).json({ status: "success", data: record });
        } else {
          res.status(400).json({ status: "error", message: "no plan found" });
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

self.updateMessage = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { no_of_send_message } = req.body;
    Userlimit.findOne({
      where: { user_id: user_id },
    })
      .then(async (record) => {
        if (record) {
          const totalmsg = record.no_of_send_message + no_of_send_message;
          const newTargetFriendSetting = await Userlimit.update(
            {
              no_of_send_message: totalmsg,
            },
            {
              where: { user_id: user_id },
            }
          );
          res
            .status(200)
            .json({ status: "success", message: "Record Updated" });
        } else {
          const result = await Userlimit.create({
            no_of_send_message,
            user_id,
          });
          res
            .status(200)
            .json({ status: "success", message: "record created" });
        }
      })
      .catch((error) => {
        res.status(500).json({ status: "error", message: error });
      });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while creating Prospect setting.",
    });
  }
};

self.updateConnect = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { no_of_connect } = req.body;
    Userlimit.findOne({
      where: { user_id: user_id },
    })
      .then(async (record) => {
        if (record) {
          const totalconnect = record.no_of_connect + no_of_connect;
          const newTargetFriendSetting = await Userlimit.update(
            {
              no_of_connect: totalconnect,
            },
            {
              where: { user_id: user_id },
            }
          );
          res
            .status(200)
            .json({ status: "success", message: "Record Updated" });
        } else {
          const result = await Userlimit.create({
            no_of_connect,
            user_id,
          });
          res
            .status(200)
            .json({ status: "success", message: "record created" });
        }
      })
      .catch((error) => {
        res.status(500).json({ status: "error", message: error });
      });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while creating Prospect setting.",
    });
  }
};

module.exports = self;
