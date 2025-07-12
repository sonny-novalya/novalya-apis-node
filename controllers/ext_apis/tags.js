const { UsersData, Sequelize } = require("../../Models");
const Response = require("../../helpers/response");
const { checkAuthorization, getAuthUser } = require("../../helpers/functions");
const Op = Sequelize.Op;
const db = require("../../Models/crm");
const message = require("../../Models/crm/message");
const UploadImageOnS3Bucket = require("../../utils/s3BucketUploadImage");
const taggedUser = db.taggedusers;
const instaTaggedUser = db.instataggedusers;
const tags = db.tag;
const instaTags = db.instatag;

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
      let folderName = "facebook-crm";
      let dateImg = Date.now()
      let imageUrl;
      let base64Str = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/

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

        if (profile_pic && base64Str.test(profile_pic) && profile_pic.includes("novalya-assets") != true) {

          imageUrl = await UploadImageOnS3Bucket(profile_pic, folderName, dateImg);
        }else{
          imageUrl = profile_pic
        }
        // return false;
        // Create a new tagged user object
        const taggedUserData = {
          user_id,
          fb_user_id,
          numeric_fb_id: fb_user_alphanumeric_id,
          fb_image_id,
          fb_name,
          profile_pic: imageUrl,
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
              profile_pic,
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

            let imageUrl = profile_pic;
            
            const existingRecord = await taggedUser.findOne({
              where: whereClause
            });

            if (profile_pic && base64Str.test(profile_pic) && profile_pic.includes("novalya-assets") != true) {
              const dateTimeStamp = Date.now();
              const randomStr = Math.random().toString(36).substring(2, 10);
              const uniqueImageId = `${dateTimeStamp}_${fb_user_id || fb_user_alphanumeric_id || randomStr}`;
              imageUrl = await UploadImageOnS3Bucket(profile_pic, folderName, uniqueImageId);
            }else{
              imageUrl = profile_pic
            }

            if (existingRecord) {
              const taggedUserData = {
                fb_user_alphanumeric_id,
                fb_image_id, // Update with actual value if available
                fb_name: fbName,
                profile_pic: imageUrl,
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
                profile_pic: imageUrl,
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

  getTaggedUserNew: async (req, res) => {
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
      let folderName = "facebook-crm";
      let dateImg = Date.now()
      let imageUrl;
      let base64Str = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/

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

        if (profile_pic && base64Str.test(profile_pic) && profile_pic.includes("novalya-assets") != true) {

          imageUrl = await UploadImageOnS3Bucket(profile_pic, folderName, dateImg);
        }else{
          imageUrl = profile_pic
        }
        // return false;
        // Create a new tagged user object
        const taggedUserData = {
          user_id,
          fb_user_id,
          numeric_fb_id: fb_user_alphanumeric_id,
          fb_image_id,
          fb_name,
          profile_pic: imageUrl,
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
              profile_pic,
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

            if (profile_pic && base64Str.test(profile_pic) && profile_pic.includes("novalya-assets") != true) {

              imageUrl = await UploadImageOnS3Bucket(profile_pic, folderName, dateImg);
            }else{
              imageUrl = profile_pic
            }

            if (existingRecord) {
              const taggedUserData = {
                fb_user_alphanumeric_id,
                fb_image_id, // Update with actual value if available
                fb_name: fbName,
                profile_pic: imageUrl,
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
                profile_pic: imageUrl,
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
        try {
          const records = await taggedUser.findAll({ where: { user_id } });

          const taggedUsersWithTags = await Promise.all(
            records.map(async (user) => {
              const payload = user.toJSON();              // plain object

              // If tag_id is a CSV string → convert to array
              if (typeof payload.tag_id === "string" && payload.tag_id.length) {
                const tagIds = payload.tag_id
                  .split(",")
                  .map((id) => id.trim())
                  .filter(Boolean);

                // Replace the string with the array
                payload.tag_id = tagIds;

                const userTags = await tags.findAll({
                  where: { id: { [Op.in]: tagIds } },
                });
                payload.tags = userTags;
              }

              return payload;
            })
          );

          return Response.resWith202(
            res,
            "Tagged user fetched successfully",
            taggedUsersWithTags
          );
        } catch (err) {
          return Response.resWith422(res, err.message);
        }
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

  updateTaggedUserStatus: async (req, res) => {
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
      let folderName = "facebook-crm";
      let dateImg = Date.now()
      let imageUrl;
      let base64Str = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/

    if (type === "add") {
      try {
        const { members, selected_tag_stage_ids, is_primary } = req.body;
        const membersInfo = JSON.parse(members).info || [];
    
        const folderName = "facebook-crm";
        // const dateImg = Date.now();
        const base64Str = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/;
    
        const taggingPromises = [];
    
        for (const member of membersInfo) {
          const {
            fb_user_id,
            fb_user_alphanumeric_id,
            fb_image_id,
            fbName,
            profile_pic,
            fb_user_e2ee_id,
            is_verified_acc,
            is_e2ee
          } = member;
    
          let imageUrl = profile_pic;
          const dateImg = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          if (profile_pic && base64Str.test(profile_pic) && !profile_pic.includes("novalya-assets")) {
            imageUrl = await UploadImageOnS3Bucket(profile_pic, folderName, dateImg);
          }          
    
          for (const { tag_id, stage_id } of selected_tag_stage_ids) {
            taggingPromises.push((async () => {
              let whereClause;
              if (!fb_user_id) {
                whereClause = {
                  user_id: user_id,
                  fb_user_e2ee_id: fb_user_e2ee_id,
                  tag_id,
                  // stage_id
                };
              } else if (fb_user_id && fb_user_e2ee_id) {
                whereClause = {
                  user_id: user_id,
                  tag_id,
                  // stage_id,
                  [Op.or]: [
                    { fb_user_id },
                    { fb_user_e2ee_id }
                  ]
                };
              } else {
                whereClause = {
                  user_id: user_id,
                  fb_user_id,
                  tag_id,
                  // stage_id
                };
              }
    
              const taggedUserData = {
                user_id,
                fb_user_id,
                numeric_fb_id: fb_user_alphanumeric_id,
                fb_image_id,
                fb_name: fbName,
                profile_pic: imageUrl,
                is_primary,
                is_verified_acc: typeof is_verified_acc !== "undefined" ? Boolean(Number(is_verified_acc)) : false,
                tag_id,
                stage_id,
                is_e2ee,
                fb_user_e2ee_id
              };
    
              const existingRecord = await taggedUser.findOne({ where: whereClause });
    
              if (existingRecord) {
                return taggedUser.update(taggedUserData, { where: whereClause });
              } else {
                return taggedUser.create(taggedUserData);
              }
            })());
          }
        }
    
        await Promise.all(taggingPromises);
    
        return Response.resWith202(res, "Bulk tagging completed successfully", {});
      } catch (error) {
        return Response.resWith422(res, error.message);
      }
    }
    
    else if (type == "get") {
        var final_response = [];
        // Find the Facebook user by fb_user_id
        try {
          const records = await taggedUser.findAll({ where: { user_id } });

          const taggedUsersWithTags = await Promise.all(
            records.map(async (user) => {
              const payload = user.toJSON();              // plain object

              // If tag_id is a CSV string → convert to array
              if (typeof payload.tag_id === "string" && payload.tag_id.length) {
                const tagIds = payload.tag_id
                  .split(",")
                  .map((id) => id.trim())
                  .filter(Boolean);

                // Replace the string with the array
                payload.tag_id = tagIds;

                const userTags = await tags.findAll({
                  where: { id: { [Op.in]: tagIds } },
                });
                payload.tags = userTags;
              }

              return payload;
            })
          );

          return Response.resWith202(
            res,
            "Tagged user fetched successfully",
            taggedUsersWithTags
          );
        } catch (err) {
          return Response.resWith422(res, err.message);
        }
    }

    else if (type === "remove") {
      try {
        const membersInfo = JSON.parse(req.body.members).info || [];
        const selectedTagStageIds = req.body.selected_tag_stage_ids || [];
    
        const removePromises = [];
    
        for (const member of membersInfo) {
          const {
            fb_user_id,
            fb_user_e2ee_id
          } = member;
    
          for (const { tag_id, stage_id } of selectedTagStageIds) {
            let whereClause;
    
            if (!fb_user_id) {
              whereClause = {
                user_id,
                fb_user_e2ee_id,
                tag_id,
                stage_id
              };
            } else if (fb_user_id && fb_user_e2ee_id) {
              whereClause = {
                user_id,
                tag_id,
                stage_id,
                [Op.or]: [
                  { fb_user_id },
                  { fb_user_e2ee_id }
                ]
              };
            } else {
              whereClause = {
                user_id,
                fb_user_id,
                tag_id,
                stage_id
              };
            }
    
            removePromises.push(taggedUser.destroy({ where: whereClause }));
          }
        }
    
        await Promise.all(removePromises);
    
        return Response.resWith202(res, "Selected tags removed from users successfully", {});
      } catch (error) {
        return Response.resWith422(res, "Error during bulk remove: " + error.message);
      }
    }

  
    } catch (error) {
      res.status(200).json({ status: "error", message: error.message });
    }
  },

  updateInstaTaggedUserStatus: async (req, res) => {
    try {
      const user_id = await getAuthUser(req, res);
      const {
        type
      } = req.body;

      let folderName = "instagram-crm";
      let dateImg = Date.now()
      let imageUrl;
      let base64Str = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/

    if (type === "add") {
      try {
        const { members, selected_tag_stage_ids, is_primary } = req.body;
        const membersInfo = JSON.parse(members).info || [];
    
        const folderName = "instagram-crm";
        // const dateImg = Date.now();
        const base64Str = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/;
    
        const taggingPromises = [];
    
        for (const member of membersInfo) {
          const {
            insta_user_id,
            numeric_insta_id,
            insta_image_id,
            insta_name,
            profile_pic,
            insta_thread_id,
            is_verified_acc,
          } = member;
    
          let imageUrl = profile_pic;
          const dateImg = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          if (profile_pic && base64Str.test(profile_pic) && !profile_pic.includes("novalya-assets")) {
            imageUrl = await UploadImageOnS3Bucket(profile_pic, folderName, dateImg);
          }          
    
          for (const { tag_id, stage_id } of selected_tag_stage_ids) {
            taggingPromises.push((async () => {
              let whereClause;

              whereClause = {
                user_id: user_id,
                insta_user_id: insta_user_id,
                tag_id
              };
    
              const taggedUserData = {
                user_id,
                insta_user_id,
                numeric_insta_id,
                insta_image_id,
                insta_name,
                profile_pic: imageUrl,
                is_primary,
                is_verified_acc: typeof is_verified_acc !== "undefined" ? Boolean(Number(is_verified_acc)) : false,
                tag_id,
                stage_id,
                thread_id: insta_thread_id
              };
    
              const existingRecord = await instaTaggedUser.findOne({ where: whereClause });
    
              if (existingRecord) {
                return instaTaggedUser.update(taggedUserData, { where: whereClause });
              } else {
                return instaTaggedUser.create(taggedUserData);
              }
            })());
          }
        }
    
        await Promise.all(taggingPromises);
    
        return Response.resWith202(res, "Insta Bulk Tagging Completed Successfully", {});
      } catch (error) {
        return Response.resWith422(res, error.message);
      }
    }
    else if (type == "get") {
        var final_response = [];
        // Find the Facebook user by fb_user_id
        try {
          const records = await instaTaggedUser.findAll({ where: { user_id } });

          const taggedUsersWithTags = await Promise.all(
            records.map(async (user) => {
              const payload = user.toJSON(); // plain object

              // If tag_id is a CSV string → convert to array
              if (typeof payload.tag_id === "string" && payload.tag_id.length) {
                const tagIds = payload.tag_id
                  .split(",")
                  .map((id) => id.trim())
                  .filter(Boolean);

                // Replace the string with the array
                payload.tag_id = tagIds;

                const userTags = await instaTags.findAll({
                  where: { id: { [Op.in]: tagIds } },
                });
                payload.tags = userTags;
              }

              return payload;
            })
          );

          return Response.resWith202(
            res,
            "Tagged user fetched successfully",
            taggedUsersWithTags
          );
        } catch (err) {
          return Response.resWith422(res, err.message);
        }
    }

    else if (type === "remove") {
      try {
        const membersInfo = JSON.parse(req.body.members).info || [];
        const selectedTagStageIds = req.body.selected_tag_stage_ids || [];
    
        const removePromises = [];
    
        for (const member of membersInfo) {
          const {
            insta_user_id
          } = member;
    
          for (const { tag_id, stage_id } of selectedTagStageIds) {
            let whereClause;
    
            whereClause = {
              user_id,
              insta_user_id,
              tag_id
            };
    
            removePromises.push(instaTaggedUser.destroy({ where: whereClause }));
          }
        }
    
        await Promise.all(removePromises);

        // ✅ After deletion, sync is_primary for remaining tags
        for (const member of membersInfo) {
          const { insta_user_id } = member;

          const remainingTags = await instaTaggedUser.findAll({
            where: {
              user_id,
              insta_user_id
            },
            order: [['id', 'DESC']] // Or createdAt if preferred
          });

          if (remainingTags.length > 0) {
            const lastRow = remainingTags[0]; // last updated/created row
            const lastTagId = lastRow.tag_id;

            // Now update all other rows with same is_primary
            const updatePromises = remainingTags.map(tag =>
              tag.update({ is_primary: lastTagId })
            );

            await Promise.all(updatePromises);
          }
        }

        return Response.resWith202(res, "Selected tags removed from users successfully", {});
      } catch (error) {
        return Response.resWith422(res, "Error during bulk remove: " + error.message);
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
