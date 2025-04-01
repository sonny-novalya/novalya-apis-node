const {
  Sequelize,
  Userlimit,
  NewPackage,
  UsersData,
  Stage,
  UserPlanLimit,
} = require("../../Models");
const { tag } = require("../../Models/crm");
const db = require("../../Models/crm");
const taggedusers = db.taggedusers;

let self = {};

self.getPlanDetails = async (req, res) => {
  try {
    const user_id = req.authUser;

    const { type = "facebook" } = req.query;
    let stageTable = Stage;
    let tagsTable = tag;
    let taggedusersTable = taggedusers;
    let instaGramTag = db.instatag;

    if (type === "instagram") {
      stageTable = db.instastage;
      taggedusersTable = db.instataggedusers;
    }

    const [
      planDetails,
      new_packages,
      userlimit,
      stageCount,
      tagCount,
      totalUsers,
      userPlanLimit,
      instaGramTagCount,
    ] = await Promise.all([
      NewPackage.findOne({ where: { userid: user_id, status: "Active" } }),
      UsersData.findOne({ where: { id: user_id } }),
      Userlimit.findOne({ where: { user_id } }),
      stageTable.findAll({ where: { user_id } }),
      tagsTable.findAll({ where: { user_id } }),
      taggedusersTable.findAll({ where: { user_id } }),
      UserPlanLimit.findOne({ where: { userid: user_id } }),
      instaGramTag.findAll({ where: { user_id } }),
    ]);

    const defaultUserLimit = {
      no_crm_group: 0,
      no_stages_group: 0,
      no_friend_request: 0,
      no_crm_message: 0,
      no_ai_comment: 0,
      no_insta_ai_comment: 0,
      advanced_novadata: 0,
      no_friend_requests_received: 0,
      no_of_birthday_wishes: 0,
      no_insta_prospection: 0,
      no_insta_crm: 0,
    };

    const totalTagCount = tagCount.length + instaGramTagCount.length;

    return res.status(200).json({
      status: "success",
      data: {
        planDetails,
        new_packages,
        userlimit: {
          ...defaultUserLimit,
          ...userlimit?.dataValues,
        },
        userPlanLimit,
        stageCount: stageCount.length,
        tagCount: totalTagCount,
        totalUsers: totalUsers.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error,
    });
  }
};

self.updateLimit = async (req, res) => {
  try {
    const user_id = req.authUser;
    const new_packages = await NewPackage.findOne({
      where: { userid: user_id, status: "Active" },
    });
    if (!new_packages) {
      return res.status(400).json({
        status: "error",
        message: "No package found",
      });
    }
    const {
      no_crm_group,
      no_stages_group,
      no_friend_request,
      no_crm_message,
      no_ai_comment,
      no_insta_ai_comment,
      advanced_novadata,
      no_friend_requests_received,
      no_of_birthday_wishes,
      no_insta_prospection,
      no_insta_crm,
    } = req.body;
    const userlimit = await Userlimit.findOne({
      where: { user_id: user_id },
    });
    if (userlimit) {
      const updatedFields = {
        plan_id: new_packages.id,
        ...(no_crm_group && { no_crm_group }),
        ...(no_stages_group && { no_stages_group }),
        ...(no_friend_request && { no_friend_request }),
        ...(no_crm_message && { no_crm_message }),
        ...(no_ai_comment && { no_ai_comment }),
        ...(no_insta_ai_comment && { no_insta_ai_comment }),
        ...(advanced_novadata && { advanced_novadata }),
        ...(no_friend_requests_received && { no_friend_requests_received }),
        ...(no_of_birthday_wishes && { no_of_birthday_wishes }),
        ...(no_insta_prospection && { no_insta_prospection }),
        ...(no_insta_crm && { no_insta_crm }),
      };

      await Userlimit.update(updatedFields, {
        where: { user_id: user_id },
      });
    } else {
      const newLimitData = {
        user_id: user_id,
        plan_id: new_packages.id,
        ...(no_crm_group && { no_crm_group }),
        ...(no_stages_group && { no_stages_group }),
        ...(no_friend_request && { no_friend_request }),
        ...(no_crm_message && { no_crm_message }),
        ...(no_ai_comment && { no_ai_comment }),
        ...(no_insta_ai_comment && { no_insta_ai_comment }),
        ...(advanced_novadata && { advanced_novadata }),
        ...(no_friend_requests_received && { no_friend_requests_received }),
        ...(no_of_birthday_wishes && { no_of_birthday_wishes }),
        ...(no_insta_prospection && { no_insta_prospection }),
        ...(no_insta_crm && { no_insta_crm }),
      };
      await Userlimit.create(newLimitData);
    }

    return res.status(200).json({
      status: "success",
      message: "Record Updated",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while updating user limit.",
    });
  }
};

self.updateGender = async (req, res) => {
  try {
    const user_id = req.authUser;

    const { gender } = req.body;

    const userDetails = await UsersData.findOne({
      where: { id: user_id },
    });
    if (userDetails) {
      await UsersData.update(
        { gender: gender },
        {
          where: { id: user_id },
        }
      );
      return res.status(200).json({
        status: "success",
        message: "Record Updated",
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while updating user limit.",
    });
  }
};

self.resetLimit = async (req, res) => {
  try {
    const result = await Userlimit.update(
      {
        no_friend_request: 0,
        no_crm_message: 0,
        no_ai_comment: 0,
        no_insta_ai_comment: 0,
        no_friend_requests_received: 0,
        no_of_birthday_wishes: 0,
        no_insta_prospection: 0,
        no_insta_crm: 0,
      },
      {
        where: {},
      }
    );

    return res.status(200).json({
      status: "success",
      message: result,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while updating user limit.",
    });
  }
};

module.exports = self;
