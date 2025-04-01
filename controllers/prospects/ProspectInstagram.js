const {
  Sequelize,
  InstaProspects,
  InstagramGroupUsers,
  InstagramPrivateUsers
} = require("../../Models");
const Op = Sequelize.Op;
let self = {};

const Prospects = InstaProspects;

self.createProspect = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { insta_user_id } = req.body;

    Prospects.findOne({
      where: { user_id: user_id, insta_user_id: insta_user_id },
    })
      .then(async (record) => {
        if (record) {
          const currentDate = new Date();
          const newProspect = await Prospects.update(
            {
              date_add: currentDate,
            },
            {
              where: { user_id: user_id, insta_user_id: insta_user_id },
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
            insta_user_id,
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

self.checkProspect = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { insta_user_id } = req.body;
    Prospects.findOne({
      where: { user_id: user_id, insta_user_id: insta_user_id },
    })
      .then(async (record) => {
        if (record) {
          res.status(200).json({
            status: "success",
            message: "Record already found",
            data: record,
          });
        } else {
          res.status(200).json({ status: "error", message: "no record found" });
        }
      })
      .catch((error) => {
        res.status(500).json({
          status: "error",
          message: "An error occurred while creating Prospect setting.",
          error: error.message,
        });
      });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while creating Prospect setting.",
    });
  }
};

self.getAllProspectMembers = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { group_id, group_name, browser_insta_user_id} = req.query;
    let record = [];
    record = await InstagramGroupUsers.findAll({
      where: { user_id: user_id, group_id: group_id, browser_insta_user_id: browser_insta_user_id },
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

self.createInstagramProspectMember = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { instagram_user_id, group_id, browser_insta_user_id} = req.body;

    InstagramGroupUsers.findOne({
      where: {
        user_id: user_id,
        instagram_user_id: instagram_user_id,
        group_id: group_id,
        browser_insta_user_id: browser_insta_user_id
      },
    })
      .then(async (record) => {
        if (record) {
          const currentDate = new Date();
          const newProspect = await InstagramGroupUsers.update(
            {
              updated_at: currentDate,
            },
            {
              where: {
                user_id: user_id,
                instagram_user_id: instagram_user_id,
                group_id: group_id,
                browser_insta_user_id: browser_insta_user_id
              },
            }
          );
          InstagramGroupUsers.findOne({
            where: {
              user_id: user_id,
              instagram_user_id: instagram_user_id,
              group_id: group_id,
              browser_insta_user_id: browser_insta_user_id
            },
          }).then(async (record) => {
            res
              .status(200)
              .json({ status: "success", message: "Record Updated" });
          });
        } else {
          console.log("inside else: ",browser_insta_user_id)
          const result = await InstagramGroupUsers.create({
            user_id: user_id,
            instagram_user_id: instagram_user_id,
            group_id: group_id,
            browser_insta_user_id: browser_insta_user_id
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

self.getAllPrivateMembers = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { insta_login_account } = req.query;
    let record = [];
    record = await InstagramPrivateUsers.findAll({
      where: { user_id: user_id, insta_login_account: insta_login_account },
    });
    res.status(200).json({
      status: "success",
      message: "private member list",
      data: record,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while getting private members.",
      error,
    });
  }
};

self.createInstaPrivateMember = async (req, res) => {
  try {

    const user_id = req.authUser;
    const { private_insta_account, insta_login_account } = req.body;

    InstagramPrivateUsers.findOne({
      where: {
        user_id: user_id,
        private_insta_account: JSON.stringify(private_insta_account)
      },
    })
      .then(async (record) => {
        if (record) {
          const currentDate = new Date();
          const newUser = await InstagramPrivateUsers.update(
            {
              updated_at: currentDate,
              
            },
            {
              where: {
                user_id: user_id,
                private_insta_account: JSON.stringify(private_insta_account),
                insta_login_account: insta_login_account
              },
            }
          );
          InstagramPrivateUsers.findOne({
            where: {
              user_id: user_id,
              private_insta_account: JSON.stringify(private_insta_account),
              insta_login_account: insta_login_account
            },
          }).then(async (record) => {
            res
              .status(200)
              .json({ status: "success", message: "Record Updated" });
          });
        } else {
          const result = await InstagramPrivateUsers.create({
            user_id: user_id,
            private_insta_account: JSON.stringify(private_insta_account),
            insta_login_account: insta_login_account
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
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while saving Private member.",
    });
  }
}

module.exports = self;
