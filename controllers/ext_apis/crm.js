const {
  UsersData,
  Sequelize,
  CrmTargetFriendSettings,
  CrmSegmentMessage,
} = require("../../Models");
const Response = require("../../helpers/response");
const Op = Sequelize.Op;
const { Qry } = require("../../helpers/functions");
const db = require("../../Models/crm");
const crm_section = db.section;
const CrmController = {
  getCrmStatus: async (req, res) => {
    try {
      const user_id = req.user.id;

      const findStatus = await UsersData.findOne({
        where: { id: user_id },
        attributes: ["id", "crm_status"],
      }).then(async (record) => {
        var send_obj = {
          id: record.dataValues.id,
          crm_status: record.dataValues.crm_status,
        };
        return Response.resWith202(res, "crm status success.", send_obj);
      });
    } catch (error) {
      return Response.resWith422(res, error);
    }
  },

  getCrmMessageData: async (req, res) => {
    try {
      const user_id = req.user.id;

      const settings_record = await CrmTargetFriendSettings.findOne({
        where: { user_id: user_id },
      });
      if (settings_record) {
        var label_id = settings_record.dataValues.label_id;
        var message_id = settings_record.dataValues.message;

        var query =
          "SELECT * FROM `taggedusers` where user_id = ? and FIND_IN_SET(?, tag_id)";
        const query_res = await Qry(query, [user_id, label_id]);

        const segment_msg = await CrmSegmentMessage.findOne({
          where: { id: message_id, user_id: user_id },
        });
        if (segment_msg) {
          var message_item = "";
          const sectionArray = JSON.parse(segment_msg.dataValues.section);
          for (const segment_id of sectionArray) {
            try {
              const segmentdata = await CrmController.fetchDataForSegment(
                segment_id
              );

              const varientArray = JSON.parse(segmentdata.varient);

              varientArray.forEach((data, j) => {
                if (!pass_message[j]) {
                  pass_message[j] = "";
                }
                pass_message[j] += "\n" + data;
              });

              const final = query_res.map((section) => {
                return {
                  id: section.id,
                  fb_user_id: section.fb_user_id,
                  fb_name: section.fb_name,
                };
              });

              settings_record.dataValues.tagged_user = final;
              settings_record.dataValues.message = pass_message;

              return Response.resWith202(
                res,
                "crm message data success.",
                settings_record
              );
            } catch (error) {}
          }
        }
        return Response.resWith202(res, "crm message data success.", {});
      } else {
        return Response.resWith202(res, "crm message data success.", {});
      }
    } catch (error) {
      return Response.resWith422(res, error);
    }
  },

  fetchDataForSegment: function (segment_id) {
    return new Promise(async (resolve, reject) => {
      const segmentQuery = await crm_section.findOne({
        where: { id: segment_id },
      });
      resolve(segmentQuery.dataValues);
    });
  },
};

module.exports = CrmController;
