const { MessageData, Section, Sequelize} = require("../../Models");
const Op = Sequelize.Op;
let self = {};
const db = require("../../Models/crm");
const Response = require("../../helpers/response");


self.getEnckeys = async (req, res) => {
  try {
    const key = "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"; // Original key
    const bravoEncodedKey = Buffer.from(key).toString("base64"); // Base64 encode

    return Response.resWith202(res, "success", {"br_key": bravoEncodedKey});
  } catch (error) {

    console.error("Error occurred:", error); 
    return Response.resWith422(res, "something went wrong");
  }
};

// UTM Data POST API
self.saveUtmData = async (req, res) => {
  try {
    const {
      cf_utm_email,
      cf_utm_campaign,
      cf_utm_medium,
      cf_utm_source,
      cf_utm_content,
      cf_utm_term,
    } = req.body;

    if (!cf_utm_email) {
      console.error("Error occurred:", error); 
      return Response.resWith422(res, "Email is required");
    }

    const query = `
      INSERT INTO utm_data 
      (email, campaign, medium, source, content, term, status, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    const result = await Qry(query, [
      cf_utm_email,
      cf_utm_campaign || null,
      cf_utm_medium || null,
      cf_utm_source || null,
      cf_utm_content || null,
      cf_utm_term || null,
    ]);

    return Response.resWith202(res, "success", {"id": result.insertId});
  } catch (error) {

    console.error("Error occurred:", error); 
    return Response.resWith422(res, "something went wrong");
  }
};


module.exports = self;
