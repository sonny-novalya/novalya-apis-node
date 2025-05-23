const crypto = require("crypto");
const { MessageData, Section, Sequelize} = require("../../Models");
const Op = Sequelize.Op;
let self = {};
const db = require("../../Models/crm");
const Response = require("../../helpers/response");
const { checkAuthorization, Qry } = require("../../helpers/functions");
require("dotenv").config();
const axios = require("axios");
const brevoKey = process.env.BRAVO_KEY;

const BREVO_API_URL = "https://api.brevo.com/v3/contacts";

self.getEnckeysOld = async (req, res) => {
  try {
    const key = process.env.BRAVO_KEY; // Original key
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
    const crispKey = process.env.CRISP_KEY;
    const secretKey = process.env.ENCRYPT_SECRET_KEY; // Must be 32 bytes hex string
    const iv = crypto.randomBytes(16); // 16 bytes IV

    // Encrypt apiKey
    const cipher1 = crypto.createCipheriv("aes-256-cbc", Buffer.from(secretKey, 'hex'), iv);
    let encryptedApiKey = cipher1.update(apiKey, "utf8", "base64");
    encryptedApiKey += cipher1.final("base64");

    // Encrypt crispKey with a new cipher
    const cipher2 = crypto.createCipheriv("aes-256-cbc", Buffer.from(secretKey, 'hex'), iv);
    let encryptedCrispKey = cipher2.update(crispKey, "utf8", "base64");
    encryptedCrispKey += cipher2.final("base64");

    return Response.resWith202(res, "success", {
      // br_key: encryptedApiKey,
      crisp_key: encryptedCrispKey,
      iv: iv.toString("base64")
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

self.updateCapturePageOld = async (req, res) => {
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

self.updateCapturePage = async (req, res) => {
  try {
    const {
      email,
      first_name,
      last_name,
      plan,
      plan_period,
      sponsor,
      country,
      plan_id,
      currency = "",
      plan_status = "Lead",
      plan_amount = "",
      invoice_paid = "",
      plan_status_update_date = new Date().toISOString().split("T")[0],
      sms = "",
      username = "",
      language = "en-US",
      utm_data = {},
      reseller = "Novalya",
      affiliate_pro = ""
    } = req.body;

    if (!email || !first_name) {
      return Response.resWith422(res, "Email and First Name are required");
    }

    const emailExists = await Qry(`SELECT 1 FROM usersdata WHERE email = ? and subscription_status='Active'  LIMIT 1`, [email]);

    if (emailExists.length > 0) {
      return Response.resWith422(res, "Email already exists");
    }

    const captureData = await Qry(
      `SELECT sponsor FROM capture_page_data WHERE email = ? LIMIT 1`,
      [email]
    );

    const sponsorData = await Qry(
      `SELECT email FROM usersdata WHERE randomcode = ? LIMIT 1`,
      [sponsor]
    );

    var sponsorEmail = (sponsorData && sponsorData[0]) ? sponsorData[0].email : '';

    var sponsorCode = sponsor;

    if (captureData.length > 0) {
      if (sponsor === "NOVALYA") {
        sponsorCode = captureData[0].sponsor;
      }

      await Qry(
        `UPDATE capture_page_data 
         SET sponsor = ?, plan_id = ?, plan = ?, plan_period = ? 
         WHERE email = ? AND first_name = ?`,
        [sponsorCode, plan_id, plan, plan_period, email, first_name]
      );
    } else {
      await Qry(
        `INSERT INTO capture_page_data (first_name, last_name, email, sponsor, plan_id, plan, plan_period, country) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [first_name, last_name, email, sponsor, plan_id, plan, plan_period, country]
      );
    }

    setImmediate(() => {
      Promise.all([
        axios.post(
          BREVO_API_URL,
          {
            email,
            attributes: {
              FIRSTNAME: first_name,
              LASTNAME: last_name || "",
              SMS: sms,
              OPT_IN: "YES",
              SPONSORID: sponsorCode,
              COUNTRY: country || "",
              SPONSOR_EMAIL: sponsorEmail,
              USERNAME: username,
              LANGUAGE: language,
              NOVALYA_PLAN_NAME: plan,
              NOVALYA_PLAN_PERIOD: plan_period,
              NOVALYA_CURRENCY_CODE: currency,
              NOVALYA_PLAN_STATUS: plan_status,
              NOVALYA_PLAN_AMOUNT: plan_amount,
              NOVALYA_INVOICE_PAID: invoice_paid,
              NOVALYA_PLAN_STATUS_UPDATE_DATE: plan_status_update_date,
              UTM_CAMPAIGN: utm_data.utm_campaign || "",
              UTM_MEDIUM: utm_data.utm_medium || "",
              UTM_SOURCE: utm_data.utm_source || "",
              UTM_TERM: utm_data.utm_term || "",
              UTM_CONTENT: utm_data.utm_content || "",
              RESELLER: reseller,
              AFFILIATE_PRO: affiliate_pro
            },
            listIds: [70],
            updateEnabled: true
          },
          {
            headers: {
              accept: "application/json",
              "api-key": brevoKey,
              "content-type": "application/json"
            }
          }
        )
      ]).catch(err => {
        console.error("Brevo API error:", err?.response?.data || err.message);
      });
    });

    // // Brevo API Call
    // await axios.post(
    //   BREVO_API_URL,
    //   {
    //     email,
    //     attributes: {
    //       FIRSTNAME: first_name,
    //       LASTNAME: last_name || "",
    //       SMS: sms,
    //       OPT_IN: "YES",
    //       SPONSORID: sponsorCode,
    //       COUNTRY: country || "",
    //       SPONSOR_EMAIL: sponsorEmail,
    //       USERNAME: username,
    //       LANGUAGE: language,
    //       NOVALYA_PLAN_NAME: plan,
    //       NOVALYA_PLAN_PERIOD: plan_period,
    //       NOVALYA_CURRENCY_CODE: currency,
    //       NOVALYA_PLAN_STATUS: plan_status,
    //       NOVALYA_PLAN_AMOUNT: plan_amount,
    //       NOVALYA_INVOICE_PAID: invoice_paid,
    //       NOVALYA_PLAN_STATUS_UPDATE_DATE: plan_status_update_date,
    //       UTM_CAMPAIGN: utm_data.utm_campaign || "",
    //       UTM_MEDIUM: utm_data.utm_medium || "",
    //       UTM_SOURCE: utm_data.utm_source || "",
    //       UTM_TERM: utm_data.utm_term || "",
    //       UTM_CONTENT: utm_data.utm_content || "",
    //       RESELLER: reseller,
    //       AFFILIATE_PRO: affiliate_pro
    //     },
    //     listIds: [70], 
    //     updateEnabled: true
    //   },
    //   {
    //     headers: {
    //       accept: "application/json",
    //       "api-key": brevoKey,
    //       "content-type": "application/json"
    //     }
    //   }
    // );

    return Response.resWith202(res, "success");
  } catch (error) {

    console.error("Error occurred:", error);
    return Response.resWith422(res, "something went wrong");
  }
};



module.exports = self;
