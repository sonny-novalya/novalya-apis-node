const { UsersData, Sequelize } = require("../../Models");
const Response = require("../../helpers/response");
const { checkAuthorization, getAuthUser } = require("../../helpers/functions");
const Op = Sequelize.Op;
const db = require("../../Models/crm");
const message = require("../../Models/crm/message");
const taggedUser = db.taggedusers;
const tags = db.tag;

const TagsController = {
  getTaggedUser: async (req, res) => {
    try {
      const user_id = await getAuthUser(req, res);
      const {
        type,
        fb_user_id,
        fb_user_alphanumeric_id,
        fb_image_id,
        fb_name,
        profile_pic,
        is_primary,
        is_verified_acc,
        stage_id,
        is_e2ee = 0,
        fb_user_e2ee_id
      } = req.body;

      var { tag_id } = req.body;

      if (type == "add") {
        // if (!fb_user_id || !fb_user_alphanumeric_id) {
        //   return Response.resWith422(res, "Missing or invalid parameters");
        // }
        tag_id = tag_id.join(", ");

        let deleteWhereClause;
        if (!fb_user_id) {
          deleteWhereClause = {
            user_id: user_id,
            fb_user_e2ee_id: fb_user_e2ee_id
          };
        } else if (fb_user_id && fb_user_e2ee_id) {
          deleteWhereClause = {
            user_id: user_id,
            [Op.or]: [
              { fb_user_e2ee_id: fb_user_e2ee_id },
              { fb_user_id: fb_user_id }
            ]
          };
        } else {
          deleteWhereClause = {
            user_id: user_id,
            fb_user_id: fb_user_id
          };
        }

        const deletedCount = await taggedUser.destroy({ where: deleteWhereClause });
        // res.status(200).json({ status: "success", data: deletedCount });

        // return false;
        // Create a new tagged user object
        const taggedUserData = {
          user_id,
          fb_user_id,
          numeric_fb_id: fb_user_alphanumeric_id,
          fb_image_id,
          fb_name,
          profile_pic,
          is_primary,
          is_verified_acc: typeof is_verified_acc !== "undefined" ? Boolean(Number(is_verified_acc)) : false,
          tag_id,
          stage_id,
          is_e2ee,
          fb_user_e2ee_id
        };

        let whereClause;
        if (!fb_user_id) {
          whereClause = {
            user_id: user_id,
            fb_user_e2ee_id: fb_user_e2ee_id
          };
        } else if (fb_user_id && fb_user_e2ee_id) {
          whereClause = {
            user_id: user_id,
            [Op.or]: [
              { fb_user_e2ee_id: fb_user_e2ee_id },
              { fb_user_id: fb_user_id }
            ]
          };
        } else {
          whereClause = {
            user_id: user_id,
            fb_user_id: fb_user_id
          };
        }

        taggedUser
          .findOne({
            where: whereClause
          })
          .then(async (record) => {

            if (record) {
              const newtaggedUser = await taggedUser.update(taggedUserData, {
                where: whereClause,
              });
              taggedUser
                .findOne({
                  where: whereClause
                })
                .then(async (record) => {
                  res.status(200).json({ status: "success", data: record });
                })
                .catch((error) => {
                  return Response.resWith422(res, error.message);
                });
            } else {

              const result = await taggedUser.create(taggedUserData);
              res.status(200).json({ status: "success", data: result });
            }

            // Add the tagged user to the database
            // const newtaggedUser = await taggedUser.create(taggedUserData);
            // return Response.resWith202(res, 'Tagged user added successfully', newtaggedUser);
          })
          .catch((error) => {
            return Response.resWith422(res, error.message);
          });

      } else if (type == "single_get") {
        // Find the Facebook user by fb_user_id

        taggedUser
          .findAll({ where: { fb_user_id: fb_user_id, user_id: user_id } })
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
              fb_user_id,
              fb_user_alphanumeric_id,
              fbName,
              profilePic,
              fb_image_id,
              fb_user_e2ee_id
            } = member;

            let whereClause;
            if (!fb_user_id) {
              whereClause = {
                user_id: user_id,
                fb_user_e2ee_id: fb_user_e2ee_id,
              }
            } else if (fb_user_id && fb_user_e2ee_id) {
              whereClause = {
                user_id: user_id,
                fb_user_e2ee_id: fb_user_e2ee_id,
              }
            }
            else {
              whereClause = {
                user_id: user_id,
                fb_user_id: fb_user_id,
              }
            }

            const existingRecord = await taggedUser.findOne({
              where: whereClause
            });

            if (existingRecord) {
              const taggedUserData = {
                fb_user_alphanumeric_id,
                fb_image_id, // Update with actual value if available
                fb_name: fbName,
                profile_pic: profilePic,
                is_primary: tag_id, // Update with actual value if available
                is_verified_acc: typeof is_verified_acc !== "undefined" ? Boolean(Number(is_verified_acc)) : false,
                tag_id,
                stage_id,
                fb_user_e2ee_id
              };
              return taggedUser.update(taggedUserData, {
                where: whereClause,
              });
            } else {
              const taggedUserData = {
                user_id,
                fb_user_id,
                fb_user_alphanumeric_id,
                fb_image_id, // Update with actual value if available
                fb_name: fbName,
                profile_pic: profilePic,
                is_primary: tag_id, // Update with actual value if available
                is_verified_acc: typeof is_verified_acc !== "undefined" ? Boolean(Number(is_verified_acc)) : false,
                tag_id,
                stage_id,
                fb_user_e2ee_id,
              };
              return taggedUser.create(taggedUserData);
            }
          });

          await Promise.all(promises);

          return Response.resWith202(
            res,
            "Bulk tagging completed successfully",
            {}
          );

        } catch (error) {
          return Response.resWith422(res, error.message);
        }
      } else if (type == "bulkTaggingnull") {
        try {
          const { members, tag_id } = req.body;
          const membersInfo = JSON.parse(members).info;

          const promises = membersInfo.map(async (member) => {
            const {
              fb_user_id,
              fb_user_alphanumeric_id,
              fbName,
              profilePic,
              fb_image_id,
              fb_user_e2ee_id
            } = member;


            let whereClause;
            if (!fb_user_id) {
              whereClause = {
                user_id: user_id,
                fb_user_e2ee_id: fb_user_e2ee_id,
              }
            } else if (fb_user_id && fb_user_e2ee_id) {
              whereClause = {
                user_id: user_id,
                fb_user_e2ee_id: fb_user_e2ee_id,
              }
            }
            else {
              whereClause = {
                user_id: user_id,
                fb_user_id: fb_user_id,
              }
            }

            const taggedUserData = {
              user_id,
              fb_user_id,
              fb_user_alphanumeric_id,
              fb_image_id, // Update with actual value if available
              fb_name: fbName,
              profile_pic: profilePic,
              is_primary: tag_id, // Update with actual value if available
              is_verified_acc: typeof is_verified_acc !== "undefined" ? Boolean(Number(is_verified_acc)) : false,
              tag_id,
            };

            const existingRecord = await taggedUser.findOne({
              where: whereClause
            });

            if (existingRecord) {
              await taggedUser.update(
                { tag_id: tag_id },
                {
                  where: whereClause
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
          return Response.resWith422(res, error + " Error during bulk tagging");
        }
      } else if (type == "get") {
        var final_response = [];
        // Find the Facebook user by fb_user_id
        taggedUser
          .findAll({ where: { user_id: user_id } })
          .then(async (record) => {
            if (record) {
              const taggedUsersWithTags = await Promise.all(
                record.map(async (user) => {
                  if (user.tag_id && typeof user.tag_id === "string") {
                    const userTagIds = user.tag_id
                      .split(",")
                      .map((tagId) => tagId.trim());
                    const userTags = await tags.findAll({
                      where: {
                        id: { [Op.in]: userTagIds },
                      },
                    });
                    return {
                      ...user.toJSON(),
                      tags: userTags,
                    };
                  } else {
                    return user.toJSON();
                  }
                })
              );

              return Response.resWith202(
                res,
                "Tagged user fetched successfully",
                taggedUsersWithTags
              );
            }
          })
          .catch((error) => {
            return Response.resWith422(res, error.message);
          });
      } else if (type == "sync") {
        const { id, is_e2ee, fb_user_id } = req.body;
        const taggedUserData = {
          is_e2ee,
          fb_user_id: fb_user_id.toString(),
        };
        taggedUser
          .findOne({
            where: {
              id: id,
            },
          })
          .then(async (record) => {
            if (record) {
              const newtaggedUser = await taggedUser.update(taggedUserData, {
                where: { id: id },
              });
              taggedUser
                .findOne({
                  where: {
                    id: id,
                  },
                })
                .then(async (record) => {
                  res.status(200).json({ status: "success", data: record });
                })
                .catch((error) => {
                  return Response.resWith422(res, error.message);
                });
            } else {
              res.status(200).json({
                status: "success",
                message: "No result fount for this id",
              });
            }
          })
          .catch((error) => {
            return Response.resWith422(res, error.message);
          });
      } else if(type === "update-tagged-member-ids"){
        const { is_e2ee, fb_user_e2ee_id, fb_user_id, fb_user_alphanumeric_id } = req.body;
        let whereClause;
        if (fb_user_alphanumeric_id) {
          whereClause = {
            user_id: user_id,
            [Op.or]: [
              { fb_user_id: fb_user_alphanumeric_id },
              { numeric_fb_id: fb_user_alphanumeric_id}
            ],
          };
        } else {
          res.status(400).json({ status: "error", message: "fb_user_alphanumeric_id value can't be empty" });
        }

        const existingData = await taggedUser.findOne({ where: whereClause });

        if(existingData){
          let taggedUserData = {}
          if(fb_user_id){
            taggedUserData.fb_user_id = fb_user_id
            taggedUserData.numeric_fb_id = fb_user_alphanumeric_id
          }
          if(fb_user_e2ee_id){
            taggedUserData.fb_user_e2ee_id = fb_user_e2ee_id
            taggedUserData.is_e2ee = is_e2ee
          }
          const updatedData = await existingData.update(taggedUserData);
          res.status(200).json({status: "successs", message: "User updated successfully", data: updatedData})
        }else{
          res.status(400).json({ status: "error", message: `Data with ${fb_user_alphanumeric_id} id not found` });
        }
        

      }
    } catch (error) {
      res.status(200).json({ status: "error", message: error.message });
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
