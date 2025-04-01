const { SendRequestMessage, Sequelize } = require("../../Models");
const Response = require("../../helpers/response");
const Op = Sequelize.Op;

const FriendController = {
  // update connect
  updateRequest: async (req, res) => {
    try {
      const user_id = req.user.id;

      const {
        type,
        received_status,
        received_group_id,
        accept_status,
        accept_group_id,
        reject_status,
        reject_group_id,
      } = req.body;

      const existingRequest = await SendRequestMessage.findAndCountAll({
        where: { user_id: user_id },
      });

      //update request
      if (existingRequest && existingRequest.count == 1) {
        var update_data = {
          received_status: received_status,
          reject_status: reject_status,
          accept_status: accept_status,
          received_group_id: received_group_id,
          reject_group_id: reject_group_id,
          accept_group_id: accept_group_id,
        };

        const update = await SendRequestMessage.update(update_data, {
          where: { user_id: user_id },
        });

        var response = SendRequestMessage.findOne({
          where: { user_id: user_id },
        }).then(async (record) => {
          return Response.resWith202(res, "update request success.", record);
        });
      } else {
        // create request

        var create_data = {
          user_id: user_id,
          received_status: received_status,
          reject_status: reject_status,
          accept_status: accept_status,
          received_group_id: received_group_id,
          reject_group_id: reject_group_id,
          accept_group_id: accept_group_id,
        };

        const create = await SendRequestMessage.create(create_data);

        return Response.resWith202(res, "create request success.", create);
      }
    } catch (error) {
      return Response.resWith422(res, error);
    }
  },
};

module.exports = FriendController;
