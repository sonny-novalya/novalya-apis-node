const crypto = require("crypto");
const { MessageData, Section, Sequelize} = require("../../Models");
const Op = Sequelize.Op;
let self = {};
const db = require("../../Models/crm");
const Response = require("../../helpers/response");
const { checkAuthorization, Qry } = require("../../helpers/functions");
require("dotenv").config();

self.getEnckeysOld = async (req, res) => {
  try {
    const key = "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"; // Original key
    const bravoEncodedKey = Buffer.from(key).toString("base64"); // Base64 encode

    return Response.resWith202(res, "success", {"br_key": bravoEncodedKey});
  } catch (error) {

    console.error("Error occurred:", error); 
    return Response.resWith422(res, "something went wrong");
  }
};

self.getEnckeys = async (req, res) => {
  try {
    const apiKey = process.env.BRAVO_KEY;
    const secretKey = process.env.ENCRYPT_SECRET_KEY; // Must be 32 bytes (256 bits) for AES-256
    const iv = crypto.randomBytes(16); // 16 bytes IV

    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(secretKey, 'hex'), iv);
    let encrypted = cipher.update(apiKey, "utf8", "base64");
    encrypted += cipher.final("base64");

    return Response.resWith202(res, "success", {
      br_key: encrypted,
      iv: iv.toString("base64") // Send IV to frontend
    });
  } catch (error) {
    console.error("Encryption error:", error);
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

self.updateCapturePage = async (req, res) => {
  try {
    const { email, first_name, last_name, plan, plan_period, sponsor, country, plan_id } = req.body;

    if (!email || !first_name) {
      return Response.resWith422(res, "Email and First Name are required");
    }

    const emailExists = await Qry(`SELECT 1 FROM usersdata WHERE email = ? LIMIT 1`, [email]);

    if (emailExists.length > 0) {
      
      return Response.resWith422(res, "Email already exists");
    }

    //Check if user already exists in capture_page_data
    const captureData = await Qry(`SELECT sponsor FROM capture_page_data WHERE email = ? AND first_name = ? LIMIT 1`, [email, first_name]);

    if (captureData.length > 0) {
      const sponsorCode = sponsor === "NOVALYA" ? captureData[0].sponsor : sponsor;

      await Qry(
        `UPDATE capture_page_data 
         SET sponsor = ?, plan_id = ?, plan = ?, plan_period = ? 
         WHERE email = ? AND first_name = ?`,
        [sponsorCode, plan_id, plan, plan_period, email, first_name]
      );

      return Response.resWith202(res, "success");
    }

    //Insert new record
    await Qry(
      `INSERT INTO capture_page_data (first_name, last_name, email, sponsor, plan_id, plan, plan_period, country) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, email, sponsor, plan_id, plan, plan_period, country]
    );

    return Response.resWith202(res, "success");
  } catch (error) {
    console.error("Error occurred:", error); 
    return Response.resWith422(res, "something went wrong");
  }
};


module.exports = self;
