const { Stage, Sequelize } = require("../../Models");
const Op = Sequelize.Op;
let self = {};
const db = require("../../Models/crm");
const tag = db.tag;
const User = db.User;
const stage = db.stage;
const taggedusers = db.taggedusers;
const Response = require("../../helpers/response");

self.createStage = async (req, res) => {
  try {
    
    const user_id = req.authUser;
    let { stage_num = 1, name, tag_id } = req.body;
    try {

      const lastStage = await Stage.findOne({
        where: { tag_id },
        order: [["id", "DESC"]],
      });
      if (lastStage) {
        stage_num = lastStage.stage_num + 1;
      }

      const newStage = await Stage.create({
        stage_num,
        name,
        tag_id,
        user_id: user_id,
      });

      return Response.resWith202(res, 'success', newStage);
    } catch (error) {

      console.log('error', error);    
      return Response.resWith422(res, error.message);
    }
  } catch (error) {

    console.log('error', error);    
    return Response.resWith422(res, error.message);
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

    const stages = await db.stage.findAll(fetchParams);
    
    return Response.resWith202(res, 'success', stages);
  } catch (error) {
    
    console.log('error', error);    
    return Response.resWith422(res, error.message);
  }
};

self.getStageById = async (req, res) => {
  const stageId = req.params.id;
  const user_id = req.authUser;

  try {
    const stage = await db.stage.findOne({
      where: { id: stageId },
      include: ["tag"],
    });
    if (!stage) {

      return Response.resWith422(res, 'Stage not found');
    }

    return Response.resWith202(res, 'success', stage);
  } catch (error) {

    console.log('error', error);    
    return Response.resWith422(res, error.message);
  }
};

self.updateStage = async (req, res) => {
  
  const stageId = req.params.id;

  console.log('stageId--100', stageId);
  console.log('req.body--100', req.body);
  const { stage_num, name, tag_id } = req.body;
  const authUser = req.authUser;
  try {
    const existingStage = await Stage.findByPk(stageId);
    
    if (!existingStage) {

      return Response.resWith422(res, 'Stage not found');
    }

    const updates = {};
    if (typeof stage_num !== 'undefined') updates.stage_num = stage_num;
    if (typeof name !== 'undefined') updates.name = name;
    if (typeof tag_id !== 'undefined') updates.tag_id = tag_id;

    var updateStage = await Stage.update(updates, { where: { id: stageId } });

    // var updateStage = await Stage.update(
    //   { 
    //     stage_num: stage_num,
    //     name: name,
    //     tag_id: tag_id
    //   },
    //   { where: { id: stageId } }
    // );

    console.log('updateStage--118', updateStage);
    
    // existingStage.stage_num = stage_num;
    // existingStage.name = name;
    // existingStage.tag_id = tag_id;
    // await existingStage.save();
    
    return Response.resWith202(res, 'success');
  } catch (error) {

    console.log('error', error);    
    return Response.resWith422(res, error.message);
  }
};

(self.deleteStage = async (req, res) => {
  const stageId = req.params.id;
  try {

    const existingStage = await Stage.findByPk(stageId);
    if (!existingStage) {

      return Response.resWith422(res, "Stage not found");
    }
    await existingStage.destroy();

    return Response.resWith202(res, 'Stage deleted successfully');
  } catch (error) {
    
    console.log('error', error);    
    return Response.resWith422(res, error.message);
  }
}),


(self.reOrderStageAndUpdateUser = async (req, res) => {

  const { stages } = req.body;
  const user_id = req.authUser;
  const tagId = stages[0].tag_id;
  try {

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const existingStage = await Stage.findByPk(stage.id);
      if (!existingStage) {

        return Response.resWith422(res, "Stage not found");
      }
      existingStage.stage_num = i + 1;
      await existingStage.save();
    }
    stages.forEach(async (element, index) => {
      const taggedUsersDetails = await db.taggedusers.findAll({
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

    return Response.resWith202(res, 'success', {'updatedStages' : updatedStages, 'taggedUsers' : taggedUsers});

  } catch (error) {

    console.log('error', error);    
    return Response.resWith422(res, error.message);
  }
});

module.exports = self;
