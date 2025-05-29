const { Group, Sequelize } = require("../../Models");
const Response = require("../../helpers/response");
const Op = Sequelize.Op;
const fs = require("fs");
const path = require("path");
const UploadImageOnS3Bucket = require("../../utils/s3BucketUploadImage");

const GroupController = {
  // Create a new group
  createGroup: async (req, res) => {
    try {
      const user_id = req.user.id;

      const { name, group_type, total_member, comment_member, url, prospection_type, privacy, post_image  } =
        req.body;

      // Check if a group with the same URL already exists
      const existingGroup = await Group.findOne({
        where: { user_id: user_id, url: url },
      });

      if (existingGroup) {
        return Response.resWith202(
          res,
          "A group with the same URL already exists."
        );
      }

      // Create the group with the provided data
      var create_data = {
        user_id: user_id,
        name: name,
        group_type: group_type,
        type: "",
        total_member: total_member,
        comment_member: comment_member ?? null,
        url: url,
        prospection_type: prospection_type || null,
        privacy: privacy || null,
      };

      const create = await Group.create(create_data);

      if(post_image) {
        let folderName = "groups";
        let imageUrl = await UploadImageOnS3Bucket(post_image, folderName, create.id);
        console.log(imageUrl, "imageUrl")
        create.post_image = imageUrl;
        await create.save();
      }

      return Response.resWith202(res, "create success", create);
    } catch (error) {
      const errorMessage = error?.message || JSON.stringify(error);
      return Response.resWith422(res, errorMessage);
    }
  },

  // Create a new group
  checkGender: async (req, res) => {
    try {
      // Check if the name parameter is provided in the request
      if (!req.params.name) {
        return Response.resWith422(res, "Name parameter is missing");
      }

      // Construct the path to the JSON file
      const dataFilePath = path.join(__dirname, "data.json");

      // Read the JSON file
      fs.readFile(dataFilePath, "utf8", (err, data) => {
        if (err) {
          return Response.resWith422(res, "Internal Server Error");
        }

        // Parse JSON data
        const jsonData = JSON.parse(data);

        // Search for gender based on name
        const searchResult = jsonData.find(
          (item) => item.name === req.params.name
        );

        if (searchResult) {
          var data = {
            name: searchResult.name,
            gender: searchResult.gender,
            country: searchResult.country,
          };
          return Response.resWith202(res, "Gender found", data);
        } else {
          return Response.resWith422(res, "Name not found");
        }
      });
    } catch (error) {
      return Response.resWith422(res, "Internal Server Error");
    }
  },

  checkGroupByUrl: async (req, res) => {
    try {
      const user_id = req.user.id;

      const { url } = req.body;

      // Check if a group with the same URL exists
      const existingGroup = await Group.findOne({
        where: { user_id: user_id, url: url },
      });

      return Response.resWith202(
        res,
        existingGroup
          ? "group fetched successfully"
          : "group with this url not exists",
        existingGroup
      );
    } catch (error) {
      return Response.resWith422(res, error);
    }
  },
};

module.exports = GroupController;
