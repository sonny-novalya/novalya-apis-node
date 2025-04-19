const db = require("../../Models/crm");
const {
  checkAuthorization,
  getAuthUser,
  randomToken,
} = require("../../helpers/functions");
const Response = require("../../helpers/response");
const { Model } = require("sequelize");
const { Sequelize } = require("../../Models");
const Op = Sequelize.Op;
const tag = db.tag;
const campaign = db.campaign;
const stage = db.stage;


const placetag = async (req, res) => {
  try {
    const randomCode = randomToken(10); // Generate a random code of length 10

    const params = req.body;
    const authUser = await getAuthUser(req, res);
    params.user_id = authUser;

    const maxOrderNumTag = await tag.findOne({
      where: { user_id: authUser },
      order: [["order_num", "DESC"]],
    });
    const newOrderNum = maxOrderNumTag ? maxOrderNumTag.order_num + 1 : 1;
    params.order_num = newOrderNum;

    const dataToSave = {
      ...params,
      randomCode: randomCode,
    };

    let createdTag = await tag.create(dataToSave); // Save data to the database

    if (createdTag) {
      if (params.no_stages_group === false) {
        const stageData = [
          {
            stage_num: 1,
            name: "Stage 1",
            user_id: authUser,
            tag_id: createdTag.id,
          },
          {
            stage_num: 2,
            name: "Stage 2",
            user_id: authUser,
            tag_id: createdTag.id,
          },
          {
            stage_num: 3,
            name: "Stage 3",
            user_id: authUser,
            tag_id: createdTag.id,
          },
        ];
        stageData.forEach((item) => {
          stage.create(item);
        });
      }

      createdTag = await tag.findOne({
        where: { id: createdTag.id },
        include: "stage",
      });
    }
    return Response.resWith202(res, createdTag);
  } catch (error) {
    console.log('error', error);    
    return Response.resWith422(res, error);
  }
};

const getAll = async (req, res) => {
  try {
    const query = req.query;
    const authUser = await getAuthUser(req, res);
    const user_id = authUser;
    const whereOptions = user_id ? { user_id: user_id } : {};

    const data = await db.tag.findAll({
      where: whereOptions,
      include: [
        { model: db.campaign },
        { model: stage, as: "stage", order: [["stage_num", "ASC"]] },
      ],
      order: [["order_num", "DESC"]],
    });
    return Response.resWith202(res, data);
  } catch (error) {

    console.log('error', error);    
    return Response.resWith422(res, error);
  }
};

function findDuplicateStages(stageData) {
  const sortedStages = stageData.sort((a, b) => a.id - b.id);
  const seenStageNums = {};
  const duplicateStages = [];
  let last_stage_number = 0;

  for (const stage of sortedStages) {
    if (seenStageNums[stage.stage_num]) {
      duplicateStages.push(stage);
    } else {
      seenStageNums[stage.stage_num] = stage.stage_num;
      if (Number(stage.stage_num) > last_stage_number) {
        last_stage_number = stage.stage_num;
      }
    }
  }

  return { duplicateStages, last_stage_number };
}

const getOne = async (req, res) => {
  const id = req.params.id;
  const authUser = await getAuthUser(req, res);

  try {
    const tagData = await db.tag.findOne({
      where: { id: id },
      include: [{ model: db.campaign }],
    });

    if (!tagData) {
      
      return Response.resWith422(res, 'Tag not found');
    }

    let stageData = await db.stage.findAll({
      where: { tag_id: id },
      order: [["stage_num", "ASC"]],
    });

    const { duplicateStages, lastStageNumber } = findDuplicateStages(stageData);

    if (duplicateStages.length > 0) {
      await Promise.all(
        duplicateStages.map(async (stage, index) => {
          const stageNum = lastStageNumber + (index + 1);

          await db.stage.update(
            { stage_num: stageNum },
            { where: { id: stage.id } }
          );
        })
      );

      stageData = await db.stage.findAll({
        where: { tag_id: id },
        order: [["stage_num", "ASC"]],
      });
    }

    const taggedUsersDetails = await db.taggedusers.findAll({
      where: {
        tag_id: { [Op.like]: `%${id}%` },
        user_id: authUser,
      },
    });

    res.json({
      ...tagData.toJSON(),
      taggedUsers: taggedUsersDetails,
      stage: stageData,
      duplicateStages,
    });
  } catch (error) {
    console.log('error', error);    
    return Response.resWith422(res, error);
  }
};

const updateOne = async (req, res) => {
  const id = req.params.id;
  const authUser = await getAuthUser(req, res);
  let params = req.body;
  params.user_id = authUser;

  const data = await tag.update(params, { where: { id: id } });
  return Response.resWith202(res, data);
};

const deleteOne = async (req, res) => {
  try {
    const id = req.params.id;
    await db.stage.destroy({ where: { tag_id: id } });

    await db.taggedusers.update(
      {
        tag_id: Sequelize.fn("REPLACE", Sequelize.col("tag_id"), `${id}`, ""),
      },
      {
        where: {
          [Sequelize.Op.and]: [
            Sequelize.literal(`FIND_IN_SET('${id}', tag_id)`),
            Sequelize.literal(`LENGTH(tag_id) > 0`),
          ],
        },
      }
    );

    await tag.destroy({ where: { id: id } });

    return Response.resWith202(res, null, 'tag successfully deleted');
  } catch (error) {

    console.log('error', error);    
    return Response.resWith422(res, error.message);
  }
};

const limitDowngrade = async (req, res) => {
  try {
    const data = req.data;
  
    // Use Promise.all to handle multiple asynchronous operations
    await Promise.all(
      data.map(async (item) => {
        const { tag_id, stage_id, type, current_tag_id } = item;
  
        if (type === "fb") {
          // Handle Facebook tags
          await db.stage.destroy({ where: { tag_id: current_tag_id } });
  
          await db.taggedusers.update(
            {
              tag_id,
              stage_id: `${stage_id}`,
            },
            {
              where: {
                tag_id: { [Sequelize.Op.like]: `%${current_tag_id}%` }, // Check if `tag_id` contains `id`
              },
            }
          );
  
          await tag.destroy({ where: { id: current_tag_id } });
        } else {
          // Handle Instagram tags
          await db.instastage.destroy({ where: { tag_id: current_tag_id } });
  
          await db.instataggedusers.update(
            {
              tag_id,
              stage_id: `${stage_id}`,
            },
            {
              where: {
                tag_id: { [Sequelize.Op.like]: `%${current_tag_id}%` }, // Check if `tag_id` contains `id`
              },
            }
          );
  
          await tag.destroy({ where: { id: current_tag_id } });
        }
      })
    );
  
    // Send a single response after all operations are complete
    return Response.resWith202(res, null, 'All tags successfully processed.');
    
    
  } catch (error) {

    console.log('error', error);    
    return Response.resWith422(res, error.message);
  }
};

const reorderGroup = async (req, res) => {
  const authUser = await getAuthUser(req, res);

  const { source, destination } = req.body;

  const tags = await tag.findAll({
    where: { user_id: authUser },
    order: [["order_num", "DESC"]],
  });

  const updatedGroups = [...tags];

  const [reorderedGroup] = updatedGroups.splice(source, 1);
  updatedGroups.splice(destination, 0, reorderedGroup);
  for (let i = updatedGroups.length - 1; i >= 0; i--) {
    await updatedGroups[i].update({ order_num: updatedGroups.length - i });
  }

  return Response.resWith202(res, updatedGroups);
};

module.exports = {
  placetag,
  getAll,
  getOne,
  updateOne,
  deleteOne,
  reorderGroup,
  limitDowngrade
};
