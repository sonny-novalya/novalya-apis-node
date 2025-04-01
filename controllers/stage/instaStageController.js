const { InStage, Sequelize } = require("../../Models");
const Op = Sequelize.Op;
let self = {};
const db = require("../../Models/crm");
const tag = db.instatag;
const User = db.User;
const stage = db.instastage;
const taggedusers = db.instataggedusers;

self.createStage = async (req, res) => {
  try {
    const user_id = req.authUser;
    let { stage_num = 1, name, tag_id } = req.body;
    try {
      const lastStage = await stage.findOne({
        where: { tag_id },
        order: [["id", "DESC"]],
      });
      if (lastStage) {
        stage_num = lastStage.stage_num + 1;
      }

      const newStage = await stage.create({
        stage_num,
        name,
        tag_id,
        user_id: user_id,
      });
      res.status(201).json({ status: "success", data: newStage });
    } catch (error) {
      res
        .status(500)
        .json({ status: "error", message: "Error creating the stage" });
    }
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while creating the message.",
      error: error.message,
    });
  }
};
self.getAllStages = async (req, res) => {
  try {
    const user_id = req.authUser;
    const whereOptions = {
      user_id: user_id,
    };
    const { page = 1, limit = null, orderBy = "desc" } = req.query;
    const offset = (page - 1) * limit;

    const fetchParams = {
      where: whereOptions,
      offset,
      limit: limit !== null ? parseInt(limit) : undefined,
      order: [["stage_num", orderBy === "desc" ? "DESC" : "ASC"]],
      include: [{ model: tag, as: "tag" }],
    };
    const stages = await stage.findAll(fetchParams);
    res.json({ status: "success", data: stages });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error fetching stages",
      error: error.message,
    });
  }
};

self.getStageById = async (req, res) => {
  const stageId = req.params.id;
  const user_id = req.authUser;

  try {
    const stagedata = await stage.findOne({
      where: { id: stageId },
      include: ["tag"],
    });
    if (!stagedata) {
      return res
        .status(404)
        .json({ status: "error", message: "Stage not found" });
    }
    res.json({ status: "success", data: stagedata });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error fetching the stage",
      error: error.message,
    });
  }
};

self.updateStage = async (req, res) => {
  const stageId = req.params.id;
  const { stage_num, name, tag_id } = req.body;
  const authUser = req.authUser;
  try {
    const existingStage = await stage.findByPk(stageId);
    if (!existingStage) {
      return res
        .status(404)
        .json({ status: "error", message: "Stage not found" });
    }
    existingStage.stage_num = stage_num;
    existingStage.name = name;
    existingStage.tag_id = tag_id;
    await existingStage.save();
    res.json({ status: "success", data: existingStage });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: "Error updating the stage" });
  }
};

(self.deleteStage = async (req, res) => {
  const stageId = req.params.id;
  try {
    const existingStage = await stage.findByPk(stageId);
    if (!existingStage) {
      return res
        .status(404)
        .json({ status: "error", message: "Stage not found" });
    }
    await existingStage.destroy();
    res.json({ status: "success", message: "Stage deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: "Error deleting the stage" });
  }
}),
  (self.reOrderStageAndUpdateUser = async (req, res) => {
    const { stages } = req.body;
    const user_id = req.authUser;
    const tagId = stages[0].tag_id;
    try {
      for (let i = 0; i < stages.length; i++) {
        const stageId = stages[i];

        const existingStage = await stage.findByPk(stageId.id);
        if (!existingStage) {
          return res
            .status(404)
            .json({ status: "error", message: "Stage not found" });
        }
        existingStage.stage_num = i + 1;
        await existingStage.save();
      }
      stages.forEach(async (element, index) => {
        const taggedUsersDetails = await taggedusers.findAll({
          where: {
            tag_id: {
              [Op.like]: `%${element.tag_id}%`,
            },
            stage_id: element.stage_num,
            user_id: user_id,
          },
        });

        if (taggedUsersDetails.length > 0) {
          taggedUsersDetails.forEach(async (taggedUser) => {
            await taggedusers.update(
              { stage_id: index + 1 },
              { where: { id: taggedUser.id } }
            );
          });
        }
      });

      const updatedStages = await stage.findAll({
        where: { user_id: user_id, tag_id: tagId },
        order: [["stage_num", "ASC"]],
      });

      const taggedUsers = await taggedusers.findAll({
        where: { user_id: user_id, tag_id: tagId },
      });

      res.json({
        status: "success",
        message: "Stage updated successfully",
        data: { updatedStages, taggedUsers },
      });
    } catch (error) {
      res
        .status(500)
        .json({ status: "error", message: "Error updating the stage" });
    }
  });

module.exports = self;
