const { InstaGroup, Sequelize } = require("../../Models");
const Response = require("../../helpers/response");
const Op = Sequelize.Op;

const InstaGroupController = {
  createInstaGroup: async (req, res) => {
    try {
      const user_id = req.user.id;
      const { name, group_type, url, prospection_type } = req.body;

      // Check if a group with the same URL already exists
      const existingGroup = await InstaGroup.findOne({
        where: { user_id, url },
      });

      if (existingGroup) {
        return Response.resWith422(
          res,
          "A group with the same URL already exists."
        );
      }

      // Create the group with the provided data
      const create_data = {
        user_id,
        name,
        group_type,
        type: "",
        total_member: "",
        url,
        prospection_type,
      };

      const create = await InstaGroup.create(create_data);

      return Response.resWith202(res, "Group created successfully", create);
    } catch (error) {
      return Response.resWith422(res, error.message, error.message || error);
    }
  },
};

module.exports = InstaGroupController;
