const {
  TargetFriendSettings,
  Group,
  MessageData,
  MessageSection,
  Section,
  Sequelize,
  Prospects,
  BirthdayWishes,
  FacebookGroupUsers,
} = require("../../Models");
const Response = require("../../helpers/response");
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

self.createFbBirthdayMember = async (req, res) =>{
  const user_id = req.authUser;
  const { fb_user_id, connected_fb_user_id, birthday_type} = req.body;

  try{
    let getExistingRecords = await BirthdayWishes.findOne({
      where: {user_id, fb_user_id, connected_fb_user_id},
    });

    if(getExistingRecords){
      const currentDate = new Date();
      await BirthdayWishes.update(
        {
          updated_at: currentDate,
          birthday_type: birthday_type
        },
        {
          where: {
            user_id: user_id,
            fb_user_id: fb_user_id,
            connected_fb_user_id: connected_fb_user_id
          },
        }
      );

      return Response.resWith202(
        res,
        "updated",
        fb_user_id
      );
    }else{
      const result = await BirthdayWishes.create({
        user_id: user_id,
        fb_user_id: fb_user_id,
        connected_fb_user_id: connected_fb_user_id,
        birthday_type: birthday_type
      });

      return Response.resWith202(
        res,
        "created",
        result
      );
    }
    
  }catch(error){
    return Response.resWith422(res, error.message || "An error occurred");
  }
}

self.getFbBirthdayMember = async (req, res) =>{
  const user_id = req.authUser;

  try{
    let allRecords = await BirthdayWishes.findAll({
      where: {user_id},
    });

    if(allRecords.length > 0){
      
      // res.status(200).json({status: 200, data: allRecords})
      return Response.resWith202(
        res,
        "opration completed",
        allRecords
      );
    }else{

      // res.status(200).json({status: 200, data: "No record found"})
      return Response.resWith202(
        res,
        "No record found",
        []
      );
    }
    
  }catch(error){
    // res.status(400).json({error: error})
    return Response.resWith422(res, error.message || "An error occurred.");
  }
}

module.exports = self;
