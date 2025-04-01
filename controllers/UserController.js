const express = require("express");
const logger = require("../utils/logger"); // Adjust the path according to your file structure
const multer = require("multer");
const path = require("path");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto-js");
const fs = require("fs");
const chargebee = require("chargebee");
const he = require("he");
const { CleanHTMLData, CleanDBData } = require("../config/database/connection");
const emailTemplate = require("../helpers/emailTemplates/emailTemplates");
const transporter = require("../config/mail/mailconfig");
require("dotenv").config();
const encryptionKey = process.env.KEY;
const {
  Qry,
  checkAuthorization,
  randomToken,
  findAvailableSpace,
  binary_tree_get_users,
  binary_tree_get_users_data,
  current_month_active_referrals_function,
  current_month_organization_members_function,
  current_month_organization_points_function,
  current_month_referral_points_function,
  pre_month_active_referrals_function,
  pre_month_organization_members_function,
  pre_month_organization_points_function,
  pre_month_referral_points_function,
  sendDataToRoute,
  emptyArray,
  manualLoginAuthorization,
  currentMonthFun,
  settings_data,
  total_payment_function,
  total_payment_function1,
  newSalesFunction,
  createDefaultTagsAndMessages,
  total_payment_function_afcm_tbl,
} = require("../helpers/functions");
const { insert_affiliate_commission } = require("../helpers/affiliate_helper");
const secretKey = process.env.jwtSecretKey;
const sitename = process.env.sitename;
const sitekey = process.env.sitekey;
const debugging = process.env.debugging || "false";
//CRM
const campaignController = require("../controllers/crm/campaign.controller");
const taggedUserController = require("../controllers/crm/taggedusercontroller");
const groupController = require("../controllers/crm/group.controller");
const instagramGroupController = require("../controllers/crm/group.instagram.controller");
const messageController = require("../controllers/crm/message.controller");
const sectionController = require("../controllers/crm/section.controller");

const backoffice_link = process.env.backOfficeLink;
const weblink = process.env.webLink;
const emailImagesLink = process.env.emailImagesLink;
const noreply_email = process.env.noReplyEmail;
const company_name = process.env.companyName;
const image_base_url = process.env.image_base_url;

const noteController = require("../controllers/crm/note.controller");
const stageController = require("../controllers/crm/stage.controller");

const csv = require("csv-parser");
const { Console } = require("console");
const ProcessOldMessagesFunc = require("../utils/newMsgSchemaChange");
const ProcessBase64ImageDataFunc = require("../utils/uploadImageDataToS3");
const processL2SponsorId = require("../utils/processL2SponsorId");

exports.login = async (req, res) => {

  console.log("Login");
  const postData = req.body;
  const { website = false } = req.body;
  const username1 = CleanHTMLData(CleanDBData(postData.username));
  const password = CleanHTMLData(CleanDBData(postData.password));
  let username = unescape(encodeURIComponent(username1));

  username = username.toLowerCase();
  try {
    let selectUserQuery = `SELECT * FROM usersdata WHERE (username = ? OR email=?)`;
    let selectUserResult = await Qry(selectUserQuery, [username, username1]);

    if (selectUserResult.length === 0) {
      // logger.info(User ${username} invalid login);
      res.json({
        status: "error",
        message: "Invalid login details.",
      });
      return;
    }

    if (1 > 2 && website && website != 'app') {
      selectUserQuery = `SELECT * FROM usersdata WHERE (username = ? OR email=?) AND website=?`;
      selectUserResult = await Qry(selectUserQuery, [username, username1, website]);

      const user = selectUserResult[0];
      const decryptedPassword = crypto.AES.decrypt(
        user.password,
        encryptionKey
      ).toString(crypto.enc.Utf8);
      const passwordMatch = bcrypt.compareSync(password, decryptedPassword);


      if (!passwordMatch) {
        res.json({
          status: "error",
          message: "Invalid login details.",
        });
        return;
      } else if (user.emailstatus === "unverified") {
        res.json({
          status: "error",
          message:
            "Please verify your account first. We have sent you an email.",
        });
        return;
      } else if (
        user.subscription_status === "payment_failed" ||
        user.subscription_status === "subscription_cancelled" ||
        user.subscription_status === "payment_refunded" ||
        user.login_status === "Block"
      ) {
        return res.json({
          status: "error",
          message:
            "You are not able to logged in. Please contact with support.",
        });
      } else if ((user.username === username || user.email === username1) && passwordMatch && website == user.website) {

        if (user.usertype == 'reseller') {

          return res.json({
            status: "error",
            message: "Invalid User.",
          });
        }
        const TokenName = user.username === username ? username : username1
        logger.info(`User ${TokenName} login successfully`, { type: "user" });


        //   const insertQuery = INSERT INTO access_tokens (username, token, created_at, expire_at) VALUES (?, ?, ?, ?);
        //   const insertParams = [username, token, date, expireat];
        //   const insertResult = await Qry(insertQuery, insertParams);
        const date = new Date().toISOString().slice(0, 19).replace("T", " ");
        const updateLoginQuery = `UPDATE usersdata SET lastlogin = ?, lastip = ? WHERE  (username = ? OR email=?)`;
        const updateLoginParams = [date, req.ip, username, username1];
        const updateLoginResult = await Qry(
          updateLoginQuery,
          updateLoginParams
        );

        const userSelectQuery = `SELECT id, username, randomcode, firstname, lastname, email, picture, current_balance, status, mobile, emailstatus, address1,company, country, createdat, login_status, lastlogin,subscription_status, lastip, user_type FROM usersdata WHERE id = ?`;
        const userSelectParams = [user.id];
        const userSelectResult = await Qry(userSelectQuery, userSelectParams);
        const userdbData = userSelectResult[0];

        const token = jwt.sign({ TokenName }, secretKey, { expiresIn: "10y" });

        const expireat = new Date(date);
        expireat.setHours(expireat.getHours() + 1);

        //res.cookie('userToken', token);

        if (updateLoginResult.affectedRows > 0) {
          ProcessOldMessagesFunc([userdbData.id])
          return res.json({
            status: "success",
            message: "Login Successfully",
            token: token,
            user: userdbData,
          });
        }
      } else {
        console.log('350', website);
        return res.json({
          status: "error",
          message: "Invalid User.",
        });
      }
    } else {
      // start convert md5 to hash password

      // Function to compute MD5 hash
      function computeMD5Hash(input) {
        return crypto.MD5(input).toString();
      }

      const password_status = selectUserResult[0].password_status;

      if (password_status === 0) {
        const storedMD5PasswordHashFromPHP = selectUserResult[0].password;
        const phpenteredPasswordHash = computeMD5Hash(password);

        if (phpenteredPasswordHash === storedMD5PasswordHashFromPHP) {
          // Generate a salt for password hashing
          const saltRounds = 16; // The number of salt rounds determines the complexity of the hashing
          const salt = bcrypt.genSaltSync(saltRounds);
          const options = {
            cost: 12, // Specify the hashing cost (higher cost means more secure but slower)
            salt: salt, // Pass the generated salt
          };
          const hashedPassword = bcrypt.hashSync(password, options.cost);
          const encryptedPassword = crypto.AES.encrypt(
            hashedPassword,
            encryptionKey
          ).toString();
          const updateLoginQuery = `UPDATE usersdata SET password = ?, password_status = ? WHERE id = ?`;
          const updateLoginParams = [
            encryptedPassword,
            1,
            selectUserResult[0].id,
          ];
          const updateLoginResult = await Qry(
            updateLoginQuery,
            updateLoginParams
          );
        } else {
          res.json({
            status: "error",
            message: "Invalid login details.",
          });
          return;
        }
      }
      //  convert md5 to hash password

      selectUserQuery = `SELECT * FROM usersdata WHERE  (username = ? OR email=?)`;
      selectUserResult = await Qry(selectUserQuery, [username, username1]);

      const user = selectUserResult[0];
      const decryptedPassword = crypto.AES.decrypt(
        user.password,
        encryptionKey
      ).toString(crypto.enc.Utf8);
      const passwordMatch = bcrypt.compareSync(password, decryptedPassword);

      if (!passwordMatch) {
        return res.json({
          status: "error",
          message: "Invalid login details.",
        });
        return;
      } else if (user.emailstatus === "unverified") {
        return res.json({
          status: "error",
          message: "Please verify your account first. We have sent you an email.",
        });
      } else if (
        user.subscription_status === "payment_failed" ||
        user.subscription_status === "subscription_cancelled" ||
        user.subscription_status === "payment_refunded" ||
        user.login_status === "Block"
      ) {
        return res.json({
          status: "error",
          message:
            "You are not able to logged in. Please contact with support.",
        });
      } else if (
        // (user.website == null || user.website == "" || user.website == 0 || user.website == 'app')
        (user.username === username || user.email === username1) &&
        passwordMatch
      ) {
        const TokenName = user.username === username ? username : username1
        logger.info(`User ${TokenName} login successfully`, { type: "user" });


        const token = jwt.sign({ TokenName }, secretKey, { expiresIn: "10y" });
        const date = new Date().toISOString().slice(0, 19).replace("T", " ");
        const expireat = new Date(date);
        expireat.setHours(expireat.getHours() + 1);

        //   const insertQuery = INSERT INTO access_tokens (username, token, created_at, expire_at) VALUES (?, ?, ?, ?);
        //   const insertParams = [username, token, date, expireat];
        //   const insertResult = await Qry(insertQuery, insertParams);

        const updateLoginQuery = `UPDATE usersdata SET lastlogin = ?, lastip = ? WHERE (username = ? OR email=?)`;
        const updateLoginParams = [date, req.ip, username, username1];
        const updateLoginResult = await Qry(
          updateLoginQuery,
          updateLoginParams
        );

        const userSelectQuery = `SELECT id, username, randomcode, firstname, lastname, email, picture, current_balance, status, mobile, emailstatus, address1,company, country, createdat, login_status, lastlogin,subscription_status, lastip, user_type, website FROM usersdata WHERE id = ?`;
        const userSelectParams = [user.id];
        const userSelectResult = await Qry(userSelectQuery, userSelectParams);
        const userdbData = userSelectResult[0];

        //res.cookie('userToken', token);

        if (updateLoginResult.affectedRows > 0) {
          ProcessOldMessagesFunc([userdbData.id])
          return res.json({
            status: "success",
            message: "Login Successfully",
            token: token,
            user: userdbData,
          });
        }
      } else {
        console.log('480', website);
        return res.json({
          status: "error",
          message: "Invalid User.",
        });
      }
    }
  } catch (error) {
    console.log('login-error-486', error);
    return res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};
