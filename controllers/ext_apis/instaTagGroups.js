const { Sequelize } = require("../../Models");
const Response = require("../../helpers/response");
const { getAuthUser } = require("../../helpers/functions");

const Op = Sequelize.Op;
const db = require("../../Models/crm");
const sequelize =db.sequelize;
const UploadImageOnS3Bucket = require("../../utils/s3BucketUploadImage");
const taggedUser = db.instataggedusers;
const tags = db.instatag;

const TagsController = {
  getTaggedUser: async (req, res) => {
    const user_id = await getAuthUser(req, res);
    const {
      type,
      insta_user_id,
      insta_image_id,
      insta_name,
      profilePic,
      is_primary,
      group_tag_id,
      stage_id,
      thread_id,
    } = req.body;

    

    if (type === "add") {
      let folderName = "insta-crm";
      let dateImg = Date.now()
      let imageUrl;

      if (!insta_user_id) {
        return Response.resWith422(res, "Missing or invalid parameters");
      }

      let tag_id = group_tag_id.join(", ");

      if (profilePic && profilePic.includes("novalya-assets") != true) {

        imageUrl = await UploadImageOnS3Bucket(profilePic, folderName, dateImg);
      }

      const taggedUserData = {
        user_id,
        insta_user_id,
        numeric_insta_id: insta_user_id,
        insta_image_id,
        insta_name,
        profile_pic: imageUrl || "",
        is_primary: is_primary !== "" ? true : false,
        tag_id,
        stage_id,
        thread_id,
      };
      const transaction = await sequelize.transaction();
      try {
        const record = await taggedUser.findOne({
          where: { user_id, insta_user_id },
          transaction
        });
    
        let result;
        if (record) {
          // Update the record if it exists
          result = await taggedUser.update(taggedUserData, {
            where: { user_id, insta_user_id },
            transaction
          });
        } else {
          // Create a new record if it doesn't exist
          result = await taggedUser.create({ user_id, insta_user_id, ...taggedUserData }, { transaction });
        }
    
        await transaction.commit();
        //  record = await taggedUser.findOne({
        //   where: { user_id, insta_user_id },
        // });
        res.status(200).json({ status: "success", data: result });
        // || result 
      } catch (error) {
        return res.status(422).json({ status: "error", error: error });
      }
    } else if (type === "single_get") {
      try {
        const record = await taggedUser.findAll({ where: { insta_user_id, user_id } });
        return Response.resWith202(res, "Single tagged user fetched successfully", record);
      } catch (error) {
        return Response.resWith422(res, "An error occurred while fetching.");
      }
    } else if (type === "get") {
      taggedUser
        .findAll({ where: { user_id: user_id } })
        .then(async (record) => {
          if (record) {

            const taggedUsersWithTags = await Promise.all(record.map(async (user) => {
              if (user.tag_id && typeof user.tag_id === 'string') {
                const userTagIds = user.tag_id.split(',').map(tagId => tagId.trim());
                const userTags = await tags.findAll({
                  where: {
                    id: { [Op.in]: userTagIds }
                  },
                });
                return {
                  ...user.toJSON(),
                  tags: userTags,
                };
              } else {
                return user.toJSON();
              }
            }));

            return Response.resWith202(res, "Tagged user fetched successfully", taggedUsersWithTags);
          }
        })
        .catch((error) => {
          return Response.resWith422(res, error.message);
        });
    }
  },
  getFilterTaggedUser: async (req, res) => {
    const user_id = await getAuthUser(req, res);
    const {
      ids
    } = req.body;
    let instaUserIds = [];
    ids.split(",").map((data, index) => {
      instaUserIds.push(data.trim())
    })

      taggedUser
        .findAll({
          where: {
            user_id: user_id,
            id: {
              [Sequelize.Op.in]: instaUserIds
            }
          }
        })
        .then(async (record) => {
          if (record) {

            const taggedUsersWithTags = await Promise.all(record.map(async (user) => {
              if (user.tag_id && typeof user.tag_id === 'string') {
                const userTagIds = user.tag_id.split(',').map(tagId => tagId.trim());
                const userTags = await tags.findAll({
                  where: {
                    id: { [Op.in]: userTagIds }
                  },
                });
                return {
                  ...user.toJSON(),
                  tags: userTags,
                };
              } else {
                return user.toJSON();
              }
            }));

            return Response.resWith202(res, "Tagged user fetched successfully", taggedUsersWithTags);
          }
        })
        .catch((error) => {
          return Response.resWith422(res, error.message);
        });
    }
};

module.exports = TagsController;
