const { TargetFriendSettings, Sequelize } = require("../../Models");
const Response = require("../../helpers/response");
const Op = Sequelize.Op;

const ConnectController = {
  // update connect
  udpateConnect: async (req, res) => {
    try {
      const user_id = req.user.id;

      const {
        name,
        group_id,
        group_url,
        gender,
        interval,
        norequest,
        country,
        group,
        message,
        search_index,
      } = req.body;

      // check already exist
      const existingConnect = await TargetFriendSettings.findAndCountAll({
        where: { user_id: user_id },
      });

      if (existingConnect && existingConnect.count == 1) {
        //update connect

        var update_data = {
          group_id: group_id,
          group_url: group_url,
          gender: gender,
          interval: interval,
          norequest: norequest,
          country: country,
          group: group,
          message: message,
          search_index: search_index,
        };

        const update = await TargetFriendSettings.update(update_data, {
          where: { user_id: user_id },
        });

        return Response.resWith202(res, "update connect success.", update_data);
      } else {
        //insert

        // Create the provided data
        var create_data = {
          group_id: group_id,
          group_url: group_url,
          gender: gender,
          interval: interval,
          norequest: norequest,
          country: country,
          group: group,
          message: message,
          search_index: search_index,
        };

        const create = await TargetFriendSettings.create(create_data);

        return Response.resWith202(res, "connect create success", create);
      }
    } catch (error) {
      return Response.resWith422(res, error);
    }
  },
};

module.exports = ConnectController;
