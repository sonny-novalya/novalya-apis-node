const { UsersData, Sequelize } = require("../../Models");
const Response = require("../../helpers/response");
const { checkAuthorization, getAuthUser } = require("../../helpers/functions");
const Op = Sequelize.Op;
const db = require("../../Models/crm");
const message = require("../../Models/crm/message");
const taggedUser = db.instataggedusers;
const tags = db.instatag;

const TagsController = {
  getTaggedUser: async (req, res) => {
    // try {
    const user_id = await getAuthUser(req, res);
    const {
      type,
      insta_user_id,
      insta_user_alphanumeric_id,
      insta_image_id,
      insta_name,
      profile_pic,
      is_primary,
      stage_id,
    } = req.body;

    var { tag_id } = req.body;

    if (type == "add") {
      if (!insta_user_id || !insta_user_alphanumeric_id) {
        return Response.resWith422(res, "Missing or invalid parameters");
      }

      tag_id = tag_id.join(",");

      // Create a new tagged user object
      const taggedUserData = {
        user_id,
        insta_user_id,
        numeric_insta_id: insta_user_alphanumeric_id,
        insta_image_id,
        insta_name,
        profile_pic,
        is_primary: is_primary != ''  ? true : false,
        tag_id,
        stage_id,
      };

      taggedUser
        .findOne({
          where: {
            user_id: user_id,
            insta_user_id: insta_user_id,
          },
        })
        .then(async (record) => {
          if (record) {
            const newtaggedUser = await taggedUser.update(taggedUserData, {
              where: { user_id, insta_user_id },
            });
            taggedUser
              .findOne({
                where: {
                  user_id: user_id,
                  insta_user_id: insta_user_id,
                },
              })
              .then(async (record) => {
                res.status(200).json({ status: "success", data: record });
              });
          } else {
            const result = await taggedUser.create(taggedUserData);
            res.status(200).json({ status: "success", data: result });
          }
        }).catch((error) => {
          return Response.resWith422(
            res,
            error.message
          );
        });

    } else if (type == "single_get") {
      // Find the Facebook user by insta_user_id

      taggedUser
        .findAll({ where: { insta_user_id: insta_user_id, user_id: user_id } })
        .then(async (record) => {
          if (record) {
            return Response.resWith202(
              res,
              "Single tagged user fetched successfully",
              record
            );
          }
        })
        .catch((error) => {
          return Response.resWith422(
            res,
            "An error occurred while fetching."
          );
        });
    } else if (type == "bulkTagging") {
      try {
        const { members, tag_id, stage_id } = req.body;
        const membersInfo = JSON.parse(members).info;

        const promises = membersInfo.map(async (member) => {
          const {
            insta_user_id,
            insta_user_alphanumeric_id,
            instaName,
            profilePic,
            insta_image_id
          } = member;


          const existingRecord = await taggedUser.findOne({
            where: {
              user_id: user_id,
              insta_user_id: insta_user_id,
            },
          });

          if (existingRecord) {
            const taggedUserData = {
              insta_user_alphanumeric_id,
              insta_image_id, // Update with actual value if available
              insta_name: instaName,
              profile_pic: profilePic,
              is_primary: tag_id, // Update with actual value if available
              tag_id,
              stage_id
            };
            return taggedUser.update(taggedUserData, {
              where: {
                user_id: user_id,
                insta_user_id: insta_user_id,
              },
            });
          } else {
            const taggedUserData = {
              user_id,
              insta_user_id,
              insta_user_alphanumeric_id,
              insta_image_id, // Update with actual value if available
              insta_name: instaName,
              profile_pic: profilePic,
              is_primary: tag_id, // Update with actual value if available
              tag_id,
              stage_id
            };
            return taggedUser.create(taggedUserData);
          }
        });

        // await Promise.all(promises);

        return Response.resWith202(
          res,
          "Bulk tagging completed successfully",
          {}
        );
      } catch (error) {
        return Response.resWith422(res, "Error during bulk tagging");
      }
    } else if (type == "bulkTaggingnull") {
      try {
        const { members, tag_id } = req.body;
        const membersInfo = JSON.parse(members).info;

        const promises = membersInfo.map(async (member) => {
          const {
            insta_user_id,
            insta_user_alphanumeric_id,
            insta_name,
            profile_pic,
          } = member;

          const taggedUserData = {
            user_id,
            insta_user_id,
            insta_user_alphanumeric_id,
            insta_image_id: null, // Update with actual value if available
            insta_name,
            profile_pic,
            is_primary: tag_id, // Update with actual value if available
            tag_id,
          };

          const existingRecord = await taggedUser.findOne({
            where: {
              user_id: user_id,
              insta_user_id: insta_user_id,
            },
          });

          if (existingRecord) {
            return taggedUser.update(
              { tag_id: tag_id },
              {
                where: { user_id, insta_user_id },
              }
            );
          }
        });

        await Promise.all(promises);

        return Response.resWith202(
          res,
          "Bulk tagging completed successfully",
          {}
        );
      } catch (error) {
        return Response.resWith422(res, error);
      }
    } else if (type == "get") {
      var final_response = [];
      // Find the Facebook user by insta_user_id
      taggedUser
        .findAll({ where: { user_id: user_id } })
        .then(async (record) => {
          if (record) {
            for (const tags_data of record) {
              var TagsDataArray = [];

              var TagsData = {};
              //TagsData = await TagsController.fetchTagDetails(tags_data.dataValues.tag_id);
              TagsData = await TagsController.fetchTagDetails(["10", "11"]);
              TagsDataArray.push(TagsData);
              var new_response = {
                id: tags_data.dataValues.id,
                user_id: tags_data.dataValues.user_id,
                stage_id: tags_data.dataValues.stage_id,
                insta_name: tags_data.dataValues.insta_name,
                insta_image_id: tags_data.dataValues.insta_image_id,
                insta_user_id: tags_data.dataValues.insta_user_id,
                profile_pic: tags_data.dataValues.profile_pic,
                is_primary: tags_data.dataValues.is_primary,
                user_note: tags_data.dataValues.user_note,
                tag_id: tags_data.dataValues.tag_id,
                tags: TagsDataArray,
                createdAt: tags_data.dataValues.createdAt,
                updatedAt: tags_data.dataValues.updatedAt,
              };

              final_response.push(new_response);

            }

            return Response.resWith202(
              res,
              "Tagged user fetched successfully",
              final_response
            );
          }
        })
        .catch((error) => {
          return Response.resWith422(
            res,
            "An error occurred while fetching."
          );
        });
    }

  },

  fetchTagDetails: function (id) {
    return new Promise(async (resolve, reject) => {
      const data = await tags.findOne({ where: { id: id } });
      resolve(data.dataValues);
    });
  },
};

module.exports = TagsController;
