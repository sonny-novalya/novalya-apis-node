const db = require("../../Models/crm");
const {
  checkAuthorization,
  getAuthUser,
  randomToken,
} = require("../../helpers/functions");
const { Model } = require("sequelize");
const { Sequelize } = require("../../Models");
const Response = require("../../helpers/response");
const Op = Sequelize.Op;
const tag = db.instatag;
const campaign = db.instagramCampaign;
const stage = db.instastage;
const taggedusers = db.instataggedusers;

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
    return Response.resWith202(res, 'success', createdTag);
  } catch (error) {
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

    const enrichedTags = await Promise.all(
      tags.map(async (tag) => {
        // Count taggedUsers for this tag
        const usersTagsCount = await taggedusers.count({
          where: { tag_id: tag.id },
        });

        // Add count to each stage
        const enrichedStages = await Promise.all(
          (tag.stage || []).map(async (stageItem) => {
            const usersStageCount = await taggedusers.count({
              where: { stage_id: stageItem.id },
            });

            return {
              ...stageItem.toJSON(),
              usersStageCount,
            };
          })
        );

        return {
          ...tag.toJSON(),
          usersTagsCount,
          stage: enrichedStages,
        };
      })
    );
    
    return Response.resWith202(
      res,
      "Opration completed",
      enrichedTags
    );
  } catch (error) {
    return Response.resWith422(res, error.message);
  }
};

// const getAllUsers = async (req, res) => {
//   try {
//     const authUser = await getAuthUser(req, res);

//     const data = await taggedusers.findAll({
//       where: {
//         user_id: authUser,
//       },
//     });
//     res.send(data);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

const getAllUsers = async (req, res) => {
  try {
    const authUser = await getAuthUser(req, res);
    console.log(req.query)
    const start = parseInt(req.query.start) || 0;
    const offset = parseInt(req.query.offset) || 0;

    let query = {
      where: {
        user_id: authUser,
      },
    };

    if (start >= 0 && offset > 0) {
      query.offset = start;
      query.limit = offset;
    }

    query = {...query, attributes: [
      'id',
      'user_id',
      'stage_id',
      'insta_name',
      'insta_user_id',
      'numeric_insta_id',
      'tag_id',
      'thread_id',
      'createdAt',
      'updatedAt'
    ]}

    const data = await taggedusers.findAll(query);

    res.send(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOne = async (req, res) => {
  const id = req.params.id;
  const authUser = await getAuthUser(req, res);

  try {
    const data = await tag.findOne({
      where: { id: id },
      include: [{ model: campaign }],
    });
    const stageData = await stage.findAll({
      where: { tag_id: id },
      order: [["stage_num", "ASC"]],
    });
    const taggedUsersDetails = await taggedusers.findAll({
      where: {
        tag_id: {
          [Op.like]: `%${id}%`,
        },
        user_id: authUser,
      },
    });

    if (data) {
      // res.json({
      //   ...data.toJSON(),
      //   taggedUsers: taggedUsersDetails,
      //   stage: stageData,
      // });

      return Response.resWith202(res, 'success', 
        {
          ...data.toJSON(),
          taggedUsers: taggedUsersDetails,
          stage: stageData
        }
      );
    } else {
      return Response.resWith422(res, "Tag not found" );
    }
  } catch (error) {
    // res
    //   .status(500)
    //   .json({ message: "Internal server error", error: error.message });
      
    return Response.resWith422(res, error.message);
  }
};

const updateOne = async (req, res) => {
  const id = req.params.id;
  const authUser = await getAuthUser(req, res);
  let params = req.body;
  params.user_id = authUser;

  const data = await tag.update(params, { where: { id: id } });

  return Response.resWith202(res, 'success', data);
};

const deleteOne = async (req, res) => {
  const id = req.params.id;

  try {
    await stage.destroy({ where: { tag_id: id } });

    await db.instataggedusers.update(
      {
        tag_id: Sequelize.literal(
          `REPLACE(REPLACE(REPLACE(tag_id, '${id},', ''), ',${id}', ''), '${id}', '')`
        ),
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

    return Response.resWith202(res, 'success', "tag successfully deleted");
  } catch (error) {
    // res
    //   .status(500)
    //   .json({ message: "Internal server error", error: error.message });

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

  return Response.resWith202(res, 'success', updatedGroups);
};
module.exports = {
  placetag,
  getAll,
  getOne,
  updateOne,
  deleteOne,
  reorderGroup,
  getAllUsers,
};
