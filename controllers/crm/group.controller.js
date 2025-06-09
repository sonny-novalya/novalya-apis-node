const db = require("../../Models/crm");
const wholeDB = require("../../Models");
const {
  checkAuthorization,
  getAuthUser,
  randomToken,
} = require("../../helpers/functions");
const Response = require("../../helpers/response");
const { Model, fn, col, literal } = require("sequelize");
const { Sequelize } = require("../../Models");
const sequelize = db.sequelize
const Op = Sequelize.Op;
const tag = db.tag;
const campaign = db.campaign;
const stage = db.stage;
const taggedusers = db.taggedusers;
const Statistic = db.Statistic;
const tagsTable = db.tag
const instaGramTag = db.instatag
const userLimit =wholeDB.UserPlanLimit

tag.hasMany(stage, { as: 'stages', foreignKey: 'tag_id' });
stage.belongsTo(tag, { foreignKey: 'tag_id' });

tag.hasMany(taggedusers, { foreignKey: 'tag_id', as: 'tagTaggedUsers' });
stage.hasMany(taggedusers, { foreignKey: 'stage_id', as: 'stageTaggedUsers' });



const placetag = async (req, res) => {
  try {
    const randomCode = randomToken(10); // Generate a random code of length 10

    const params = req.body;
    const authUser = await getAuthUser(req, res);
    params.user_id = authUser;

       const userLimitData = await userLimit.findOne({
          where: { userid:authUser  },
        });
    
        const fbCount = await tagsTable.count({ where: { user_id: authUser } });
            const igCount = await instaGramTag.count({ where: { user_id: authUser } });
            const total = fbCount + igCount;
          console.log(userLimitData,fbCount,igCount)
    
            if ( total >= userLimitData?.tags_pipelines) {
               return Response.resWith201(res, 'success', "Limit Exceeded");
            }

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

    let statistic = await Statistic.create({
      user_id: authUser,
      type : 'fb_crm',
      message_count: 1, 
    });

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
    return Response.resWith202(res, 'success', createdTag);
  } catch (error) {
    console.log('error', error);    
    return Response.resWith422(res, error.message);
  }
};

const getAll = async (req, res) => {
  try {
    const query = req.query;
    const authUser = await getAuthUser(req, res);
    const user_id = authUser;
    const whereOptions = user_id ? { user_id: user_id } : {};

    const tags = await tag.findAll({
      where: whereOptions,
      include: [
        { model: campaign },
        { model: stage, as: "stage", order: [["stage_num", "ASC"]] },
      ],
      order: [["order_num", "DESC"]],
    });

    const tagUserCounts = await sequelize.query(`
      SELECT tag_id, COUNT(*) as taggedUsersCount
      FROM taggedusers
      WHERE user_id = :user_id
      GROUP BY tag_id
    `,
    {
      replacements: { user_id },
      type: sequelize.QueryTypes.SELECT,
    }
    );

    const stageUserCounts = await sequelize.query(
    `
      SELECT stage_id, COUNT(*) as taggedUsersStageCount
      FROM taggedusers
      WHERE user_id = :user_id
      GROUP BY stage_id
    `,
    {
      replacements: { user_id },
      type: sequelize.QueryTypes.SELECT,
    }
    );

    // Handle empty tagUserCounts safely
    const tagCountMap = {};
    (tagUserCounts || []).forEach(row => {
      if (row.tag_id) {
        tagCountMap[row.tag_id] = parseInt(row.taggedUsersCount) || 0;
      }
    });

    // Handle empty stageUserCounts safely
    const stageCountMap = {};
    (stageUserCounts || []).forEach(row => {
      if (row.stage_id) {
        stageCountMap[row.stage_id] = parseInt(row.taggedUsersStageCount) || 0;
      }
    });

    // Step 5: Enrich tags with counts
    const enrichedTags = tags.map(tagItem => {
      const enrichedStages = (tagItem.stage || []).map(stageItem => ({
        ...stageItem.toJSON(),
        taggedUsersStageCount: stageCountMap[stageItem.id] || 0,
      }));

      return {
        ...tagItem.toJSON(),
        taggedUsersCount: tagCountMap[tagItem.id] || 0,
        stage: enrichedStages,
      };
    });


    return Response.resWith202(res, 'success', enrichedTags);


    // const tags = await db.tag.findAll({
    //   where: whereOptions,
    //   include: [
    //     { model: db.campaign },
    //     { model: stage, as: "stage", order: [["stage_num", "ASC"]] },
    //   ],
    //   order: [["order_num", "DESC"]],
    // });

    // // Step 2: Enrich each tag with taggedUser count and stage-level taggedUser count
    // const enrichedTags = await Promise.all(
    //   tags.map(async (tag) => {
    //     // Count taggedUsers for this tag
    //     const taggedUsersCount = await taggedusers.count({
    //       where: { tag_id: tag.id },
    //     });

    //     // Add count to each stage
    //     const enrichedStages = await Promise.all(
    //       (tag.stage || []).map(async (stageItem) => {
    //         const taggedUsersStageCount = await taggedusers.count({
    //           where: { stage_id: stageItem.id },
    //         });

    //         return {
    //           ...stageItem.toJSON(),
    //           taggedUsersStageCount,
    //         };
    //       })
    //     );

    //     return {
    //       ...tag.toJSON(),
    //       taggedUsersCount,
    //       stage: enrichedStages,
    //     };
    //   })
    // );


    // return Response.resWith202(res, 'success', enrichedTags);
  } catch (error) {

    console.log('error', error);    
    return Response.resWith422(res, error.message);
  }
};

const getGroupsInfo = async (req, res) => {
  try {
    const query = req.query;
    const authUser = await getAuthUser(req, res);
    const user_id = authUser;
    const whereOptions = user_id ? { user_id: user_id } : {};

    const tags = await tag.findAll({
      where: whereOptions,
      order: [["order_num", "DESC"]],
    });

    const tagUserCounts = await sequelize.query(`
      SELECT tag_id, COUNT(*) as taggedUsersCount
      FROM taggedusers
      WHERE user_id = :user_id
      GROUP BY tag_id
    `,
    {
      replacements: { user_id },
      type: sequelize.QueryTypes.SELECT,
    }
    );

    const stageUserCounts = await sequelize.query(
    `
      SELECT stage_id, COUNT(*) as taggedUsersStageCount
      FROM taggedusers
      WHERE user_id = :user_id
      GROUP BY stage_id
    `,
    {
      replacements: { user_id },
      type: sequelize.QueryTypes.SELECT,
    }
    );

    // Handle empty tagUserCounts safely
    const tagCountMap = {};
    (tagUserCounts || []).forEach(row => {
      if (row.tag_id) {
        tagCountMap[row.tag_id] = parseInt(row.taggedUsersCount) || 0;
      }
    });

    // Handle empty stageUserCounts safely
    const stageCountMap = {};
    (stageUserCounts || []).forEach(row => {
      if (row.stage_id) {
        stageCountMap[row.stage_id] = parseInt(row.taggedUsersStageCount) || 0;
      }
    });

    // Step 5: Enrich tags with counts
    const enrichedTags = tags.map(tagItem => {
      return {
        ...tagItem.toJSON(),
        taggedUsersCount: tagCountMap[tagItem.id] || 0
      };
    });


    return Response.resWith202(res, 'success', enrichedTags);

  } catch (error) {
    console.log('error', error);    
    return Response.resWith422(res, error.message);
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

    var final_response = {
        tag_data: tagData.toJSON(),
        taggedUsers: taggedUsersDetails,
        stage: stageData,
        duplicate_stage: duplicateStages
    };
    return Response.resWith202(res, 'success', final_response);
    
    // res.json({
    //   ...tagData.toJSON(),
    //   taggedUsers: taggedUsersDetails,
    //   stage: stageData,
    //   duplicateStages,
    // });
  } catch (error) {

    console.log('error', error);    
    return Response.resWith422(res, error.message);
  }
};

const updateOne = async (req, res) => {
  
  try {
    
    const id = req.params.id;
    const authUser = await getAuthUser(req, res);
    let params = req.body;
    params.user_id = authUser;

    const data = await tag.update(params, { where: { id: id } });
    return Response.resWith202(res, 'success', data);
  } catch (error) {
    
    console.log('error', error);    
    return Response.resWith422(res, error.message);
  }
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
  getGroupsInfo,
  getOne,
  updateOne,
  deleteOne,
  reorderGroup,
  limitDowngrade
};
