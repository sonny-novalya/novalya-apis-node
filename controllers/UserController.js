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

const Response = require("../helpers/response");

exports.login = async (req, res) => {

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
      res.status(401).json({
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
        res.status(401).json({
          status: "error",
          message: "Invalid login details.",
        });
        return;
      } else if (user.emailstatus === "unverified") {
        res.status(401).json({
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
        return res.status(401).json({
          status: "error",
          message:
            "You are not able to logged in. Please contact with support.",
        });
      } else if ((user.username === username || user.email === username1) && passwordMatch && website == user.website) {

        if (user.usertype == 'reseller') {

          return res.status(401).json({
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
          return res.status(200).json({
            status: "success",
            message: "Login Successfully",
            token: token,
            user: userdbData,
          });
        }
      } else {
        console.log('350', website);
        return res.status(401).json({
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
          res.status(401).json({
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
        return res.status(401).json({
          status: "error",
          message: "Invalid login details.",
        });
        return;
      } else if (user.emailstatus === "unverified") {
        return res.status(401).json({
          status: "error",
          message: "Please verify your account first. We have sent you an email.",
        });
      } else if (
        user.subscription_status === "payment_failed" ||
        user.subscription_status === "subscription_cancelled" ||
        user.subscription_status === "payment_refunded" ||
        user.login_status === "Block"
      ) {
        return res.status(401).json({
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
          return res.status(200).json({
            status: "success",
            message: "Login Successfully",
            token: token,
            user: userdbData,
          });
        }
      } else {
        console.log('480', website);
        return res.status(401).json({
          status: "error",
          message: "Invalid User.",
        });
      }
    }
  } catch (error) {
    console.log('login-error-486', error);
    return res.status(401).json({
      status: "error",
      message: "Server error occurred",
    });
  }
};


exports.manualSignIn = async (req, res) => {
  const postData = req.body;
  const token = CleanHTMLData(CleanDBData(postData.accesstoken));

  try {
    const date = new Date().toISOString().slice(0, 19).replace("T", " ");

    const authUser = await manualLoginAuthorization(token, res);
    const updateLoginQuery = `UPDATE usersdata SET lastlogin = ?, lastip = ? WHERE id = ?`;
    const updateLoginParams = [date, req.ip, authUser];
    const updateLoginResult = await Qry(updateLoginQuery, updateLoginParams);

    const userSelectQuery = `SELECT username, randomcode, firstname, lastname, email, picture, current_balance, status, mobile, emailstatus, address1,company, country, createdat, login_status, lastlogin,subscription_status, lastip, user_type FROM usersdata WHERE id = ?`;
    const userSelectParams = [authUser];
    const userSelectResult = await Qry(userSelectQuery, userSelectParams);
    const userdbData = userSelectResult[0];

    // logger.info(`Admin has logged in user ${userdbData.username} successfully from admin panel`, { type: 'user' });

    if (updateLoginResult.affectedRows > 0) {
      res.json({
        status: "success",
        message: "Login Successfully",
        token: token,
        user: userdbData,
      });
      return;
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.defaultTagAndMessage = async (req, res) => {
  const postData = req.body;

  const rsp = createDefaultTagsAndMessages(postData.user_id, postData.language);

  return res.json({
    status: "success",
    data: rsp,
    message: "default tags and message created",
  });
};

exports.register = async (req, res) => {
  const randomCode = randomToken(10);
  const emailToken = randomToken(90);
  const postData = req.body;

  const date = new Date().toISOString().slice(0, 19).replace("T", " ");
  const sponsorid = CleanHTMLData(CleanDBData(postData.sponsorid));
  const username = CleanHTMLData(CleanDBData(postData.email)).toLowerCase();
  const firstname = CleanHTMLData(CleanDBData(postData.firstname));
  const lastname = CleanHTMLData(CleanDBData(postData.lastname));
  const email = CleanHTMLData(CleanDBData(postData.email)).toLowerCase();
  const mobile = CleanHTMLData(CleanDBData(postData.mobile));
  const address1 = CleanHTMLData(CleanDBData(postData.address));
  const password = CleanHTMLData(CleanDBData(postData.password));
  const country = CleanHTMLData(CleanDBData(postData.country));
  const language = CleanHTMLData(CleanDBData(postData.language));
  const company = CleanHTMLData(CleanDBData(postData.company));
  const zip_code = CleanHTMLData(CleanDBData(postData.zipCode));
  const city = CleanHTMLData(CleanDBData(postData.city));
  const birthday = CleanHTMLData(CleanDBData(postData.birthday)) || "";
  const coupon_code = CleanHTMLData(CleanDBData(postData.coupon_code)) || "";
  const domain = CleanHTMLData(CleanDBData(postData.domain)) || "";

  //subscription item details
  const item_price_id = CleanHTMLData(CleanDBData(postData.item_price_id));
  const unit_price = CleanHTMLData(CleanDBData(postData.unit_price));

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

  try {
    const selectUsernameQuery = `SELECT * FROM usersdata WHERE email = ?`;
    const selectUsernameResult = await Qry(selectUsernameQuery, [email]);

    if (selectUsernameResult.length > 0) {

      var existingUserWebsite = selectUsernameResult[0].website;

      if ((existingUserWebsite == null || existingUserWebsite == '') && domain == 'app') {

        return res.json({
          status: "error",
          message: "The username you entered is already taken",
        });
      }

      if (existingUserWebsite != null && existingUserWebsite == domain) {

        return res.json({
          status: "error",
          message: "The username you entered is already taken as a reseller user",
        });
      }
    }

    if (selectUsernameResult.length > 0) {
      return res.json({
        status: "error",
        message: "The email you entered is already taken",
      });
    }

    const selectParentUserDetails = `SELECT * FROM usersdata WHERE website = ?`;
    const selectParentUserDetailsResult = await Qry(selectParentUserDetails, [
      domain,
    ]);

    var parent_id = 0;
    let reseller_website = "";

    if (selectParentUserDetailsResult &&
      selectParentUserDetailsResult[0] &&
      selectParentUserDetailsResult[0].website
    ) {
      reseller_website = selectParentUserDetailsResult[0].website;

      if (reseller_website == 'nuskin') {
        var reseler_weblink = "https://wcy-" + reseller_website + ".novalya.com/";
      } else {
        var reseler_weblink = "https://" + reseller_website + ".novalya.com/";
      }

      parent_id = selectParentUserDetailsResult[0].id;
    }

    const selectEmailQuery = `SELECT * FROM usersdata WHERE email = ?`;
    const selectEmailResult = await Qry(selectEmailQuery, [email]);

    if (selectEmailResult.length > 0) {
      var existingUserWebsiteForEmail = selectEmailResult[0].website;

      if ((existingUserWebsiteForEmail == null || existingUserWebsiteForEmail == "") &&
        domain == "app"
      ) {
        return res.json({
          status: "error",
          message: "An account with this email address already exists",
        });
      }

      if (existingUserWebsiteForEmail != null && existingUserWebsiteForEmail == domain) {
        return res.json({
          status: "error",
          message:
            "An account with this email address already exists as a reseller user",
        });
      }
    }

    const selectSponsorQuery = `SELECT * FROM usersdata WHERE randomcode = ?`;
    const selectSponsorResult = await Qry(selectSponsorQuery, [sponsorid]);

    if (
      !sponsorid ||
      !selectSponsorResult ||
      selectSponsorResult.length === 0
    ) {
      res.json({
        status: "error",
        message: "Invalid sponsor name",
      });
      return;
    }

    const createSubscription = () => {
      return new Promise((resolve, reject) => {
        chargebee.hosted_page
          .checkout_new_for_items({
            subscription_items: [
              {
                item_price_id: item_price_id,
                quantity: 1,
              },
            ],
            customer: {
              first_name: firstname,
              last_name: lastname,
              email: email,
              phone: mobile,
              locale: language,
              company: company,
              cf_sponsor_email: selectSponsorResult[0].email,
              cf_sponsor_username: selectSponsorResult[0].username,
              // cf_cguv_accepted: "True",
              cf_username: username,
              // cf_date_of_birth: birthday,
              cf_random_code: randomCode,
              cf_sponsor_random_code: sponsorid,
              cf_email_token: emailToken,
              // cf_first_name: firstname,
              // cf_last_name: lastname,
              // cf_email: email,
              // cf_mobile: mobile,
              // cf_address1: address1,
              // cf_password: password,
              // cf_country: country,
              cf_language: language,
              // cf_company: company,
              // cf_zip_code: zip_code,
              // cf_city: city,
              // cf_birthday: birthday,
              cf_cf_parent_id: parent_id ? parent_id : 0,
              cf_reseller_website: reseller_website,
            },
            billing_address: {
              first_name: firstname,
              last_name: lastname,
              line1: address1,
              city: city,
              country: country,
              zip: zip_code,
              email: email,
              phone: mobile,
              company: company,
            },
            redirect_url: reseller_website
              ? reseler_weblink
              : weblink + "registration-complete?planId=" + item_price_id,
            cancel_url: reseller_website ? reseler_weblink : weblink + "login/",
            // Conditionally include the coupon_ids parameter
            ...(coupon_code !== "empty" ? { coupon_ids: [coupon_code] } : {}),
          })
          .request(function (error, result) {
            if (error) {
              //handle error
              reject(error);
            } else {
              resolve(result);
            }
          });
      });
    };

    let subscriptionResult;
    let binaryVolume;
    try {
      subscriptionResult = await createSubscription();
      const insertResult = await Qry(
        `INSERT INTO password (randomcode, password)
                VALUES (?, ?)`,
        [randomCode, encryptedPassword]
      );
      res.json({
        status: "success",
        redirect_url: subscriptionResult.hosted_page.url,
      });
    } catch (error) {
      res.json({
        status: "error",
        message: error?.message,
      });
      return;
    }
  } catch (error) {
    res.json({
      status: "error",
      errordetails: error,
    });
  }
};

exports.loginFromAdminSetToken = async (req, res) => {
  try {
    const postData = req.body;
    const userid = CleanHTMLData(CleanDBData(postData.userid));

    const selectUserQuery = `SELECT * FROM usersdata WHERE id = ?`;
    const selectUserResult = await Qry(selectUserQuery, [userid]);

    if (selectUserResult.length === 0) {
      res.json({
        status: "error",
        message: "Invalid user details.",
      });
      return;
    }
    const user = selectUserResult[0];
    const username = user.username;
    const token = jwt.sign({ username }, secretKey, { expiresIn: "12h" });
    const date = new Date().toISOString().slice(0, 19).replace("T", " ");
    const expireat = new Date(date);
    expireat.setHours(expireat.getHours() + 1);

    const userSelectQuery = `SELECT username, randomcode, firstname, lastname, email, picture, current_balance, status, mobile, emailstatus, address1,company, country, createdat, login_status, lastlogin, lastip FROM usersdata WHERE id = ?`;
    const userSelectParams = [user.id];
    const userSelectResult = await Qry(userSelectQuery, userSelectParams);
    const userdbData = userSelectResult[0];

    res.json({
      status: "success",
      message: "Login Successfully",
      token: token,
      userdbData: userdbData,
    });
    return;
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.forgetpassword = async (req, res) => {
  const postData = req.body;
  const email = CleanHTMLData(CleanDBData(postData.email));
  const randomcode = randomToken(150);

  try {
    const selectUserQuery = `SELECT * FROM usersdata WHERE email = ?`;
    const selectUserResult = await Qry(selectUserQuery, [email]);
    const userData = selectUserResult[0];

    if (!userData || userData.email !== email) {
      res.json({
        status: "error",
        message: "No account found with this email address",
      });
      return;
    }

    const title = "Password reset requested on " + company_name;
    const username = userData.username;
    const emailimg = emailImagesLink + "passwordreset.png";
    const resetLink = `${weblink}reset-password/${randomcode}/${email}`;
    const heading = "Password Reset";
    const subheading = "";
    const body = `Hello ${username},<br>You have requested a password reset on ${company_name} App. Please click on the reset button below:<br>
      <p><a href="${resetLink}" style="padding: 10px 15px;display: inline-block;border-radius: 5px;background: #1a253a;color: #ffffff;" class="btn btn-primary">Reset Password</a></p>`;

    const mailOptions = {
      from: {
        name: "Novalya",
        address: noreply_email,
      },
      to: {
        name: username,
        address: email,
      },
      subject: "Reset password requested " + company_name,
      html: emailTemplate(title, emailimg, heading, subheading, body),
      text: "This is the plain text version of the email content",
    };

    transporter.sendMail(mailOptions, async (err, info) => {
      if (!err) {
        const updateQuery = `UPDATE usersdata SET emailtoken = ? WHERE email = ?`;
        const updateParams = [randomcode, email];
        const updateResult = await Qry(updateQuery, updateParams);

        if (updateResult.affectedRows > 0) {
          logger.info(
            `${username} has try to update its password. Email has been sent to ${email} for update user password`,
            { type: "user" }
          );

          res.json({
            status: "success",
            message: "Email sent for password reset request. Please check your email.",
          });
        } else {
          res.json({
            status: "error",
            message: "Failed to update email token",
          });
        }
      } else {
        res.json({
          status: "error",
          message: "Failed to send email",
        });
      }
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.resetpassword = async (req, res) => {
  const postData = req.body;
  const email = CleanHTMLData(CleanDBData(postData.email));
  const password = CleanHTMLData(CleanDBData(postData.password));

  try {
    const selectUserQuery = `SELECT * FROM usersdata WHERE email = ?`;
    const selectUserResult = await Qry(selectUserQuery, [email]);
    const userData = selectUserResult[0];

    if (!userData || userData.email !== email) {

      return Response.resWith422(res, "Invalid account");
    }

    // Generate a salt for password hashing
    const saltRounds = 16; // The number of salt rounds determines the complexity of the hashing
    const salt = bcrypt.genSaltSync(saltRounds);

    const options = {
      cost: 12, // Specify the hashing cost (higher cost means more secure but slower)
      salt: salt, // Pass the generated salt
    };
    const hashedPassword = bcrypt.hashSync(password, options.cost);
    const encryptedPassword = crypto.AES.encrypt(hashedPassword, encryptionKey).toString();

    const updateQuery = `UPDATE usersdata SET password = ?, emailtoken = '', password_status = ? WHERE email = ?`;
    const updateParams = [encryptedPassword, 1, email];
    const updateResult = await Qry(updateQuery, updateParams);

    logger.info(`User ${userData.username} has successfully update its password using email ${email}`,
      { type: "user" }
    );

    if (updateResult.affectedRows > 0) {

      if (userData.website == 'nuskin') {
        var website = 'wcy-' + userData.website;
      } else {
        var website = userData.website;
      }

      return Response.resWith202(res, "Password updated successfully", { 'website': website });
    } else {
      logger.info(`User ${userData.username} has failed to update its password using email ${email}`,
        { type: "user" }
      );

      return Response.resWith422(res, "Failed to update password");
    }
  } catch (error) {
    
    console.error("Error occurred:", error);  
    return Response.resWith422(res, "Something went wrong");
  }
};

exports.validatEmailToken = async (req, res) => {
  const postData = req.body;
  const email = CleanHTMLData(CleanDBData(postData.email));
  const token = CleanHTMLData(CleanDBData(postData.token));

  try {
    const selectUserQuery = `SELECT * FROM usersdata WHERE email = ? AND emailtoken = ?`;
    const selectUserResult = await Qry(selectUserQuery, [email, token]);
    const userData = selectUserResult[0];

    if (userData && userData.email === email && userData.emailtoken === token) {
      logger.info(`Email token successfully verified for user ${userData.username}`,
        { type: "user" }
      );

      return Response.resWith202(res, "Valid token");
    } else {

      logger.info(`Email token verification failed for user ${userData.username}`,
        { type: "user" }
      );
      
      return Response.resWith422(res, "Invalid token");
    }
  } catch (error) {

    console.error("Error occurred:", error);  
     return Response.resWith422(res, "Something went wrong");
  }
};

exports.verifyEmailAccount = async (req, res) => {
  const postData = req.body;
  const email = CleanHTMLData(CleanDBData(postData.email));
  const token = CleanHTMLData(CleanDBData(postData.token));

  try {
    const selectUserQuery =
      "SELECT * FROM usersdata WHERE email = ? AND emailtoken = ?";
    const selectUserResult = await Qry(selectUserQuery, [email, token]);
    const userData = selectUserResult[0];

    if (userData && userData.email === email && userData.emailtoken === token) {
      const updateQuery =
        'UPDATE usersdata SET emailtoken = "", emailstatus = "verified" WHERE email = ? AND emailtoken = ?';
      const updateParams = [email, token];
      const updateResult = await Qry(updateQuery, updateParams);

      if (updateResult.affectedRows > 0) {
        logger.info(
          `Email token successfully verified for user ${userData.username}`,
          { type: "user" }
        );
        res.json({
          status: "success",
          message: "valid token",
        });
      } else {
        logger.info(
          `Email token verification failed for user ${userData.username}`,
          { type: "user" }
        );
        res.json({
          status: "error",
          message: "server error",
        });
      }
    } else {
      res.json({
        status: "error",
        message: "Invalid token",
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.userdata = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token

    if (authUser) {
      const userSelectQuery = `SELECT parent_id, isAlreadyCharge, isAffiliate, sub_type,plan_period,plan_pkg, isChatActive,connection_type, sponsorid, username, randomcode, firstname, lastname, email, picture, admin_logo, fav_icon, current_balance, status, mobile, emailstatus, address1,company, country, createdat, login_status, lastlogin, lastip, referral_side, kyc_status, user_type, customerid, masked_number, bank_account_title, bank_account_country, bank_account_iban, bank_account_bic, wallet_address, payout_details_update_request, rank, novarank, connect_status, birthday_status, crm_status, unfollow_status, outside_bank_account_country, outside_bank_account_title, outside_bank_account_number, outside_bank_account_swift_code, outside_bank_account_routing, outside_bank_account_currency,website, outside_bank_account_address, outside_bank_account_city, outside_bank_account_zip_code, outside_bank_account_street, bank_account_address, bank_account_city, bank_account_zip_code, outside_payout_country, payout_country, subscription_status, language, language_status, currency, trial, trial_status, trial_end FROM usersdata WHERE id = ?`;

      const userSelectParams = [authUser];
      const userSelectResult = await Qry(userSelectQuery, userSelectParams);
      const userdbData = userSelectResult[0];

      userdbData.referrallink = `${weblink}signup/${userdbData.randomcode}`;

      userdbData.profilepictureurl = `${image_base_url}uploads/userprofile/${userdbData.picture}`;
      userdbData.userProfileUrl = `${image_base_url}uploads/userprofile/${userdbData.admin_logo}`;
      userdbData.favIconUrl = `${image_base_url}uploads/userprofile/${userdbData.fav_icon}`;

      const pkgSelectQuery = `SELECT * FROM new_packages WHERE userid = ? and type = ?`;
      const pkgSelectParams = [authUser, "package"];
      const pkgSelectResult = await Qry(pkgSelectQuery, pkgSelectParams);
      let planId = pkgSelectResult[0].planid;
      let subscriptionId = pkgSelectResult[0].subscriptionid;

      userdbData.subscriptionId = subscriptionId;
      userdbData.planId = planId;

      const userLimitsSelectQuery = `SELECT * FROM users_limits WHERE userid = ?`;
      const userLimitsSelectResult = await Qry(userLimitsSelectQuery, [authUser]);
      let usersLimitsData = userLimitsSelectResult[0];
      userdbData.users_limits = usersLimitsData;
      userdbData.user_id = authUser;
      
      return Response.resWith202(res, "success", userdbData);
    }
  } catch (error) {

    console.error("Error occurred:", error);  
    return Response.resWith422(res, "Something went wrong");
  }
};

exports.refferedUsers = async (req, res) => {
  try {

    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const selectReferralUsersQuery = `
      SELECT usersdata.*, 
        new_packages.pkg_name, 
        new_packages.amount, 
        new_packages.currency,
        new_packages.cancellation_date,
        new_packages.is_cancellation_scheduled,
        s.email AS sponsor_email,
        CONCAT(s.firstname, ' ', s.lastname) AS sponsor_name,
        l2.email AS l2_sponsor_email,
        CONCAT(l2.firstname, ' ', l2.lastname) AS l2_sponsor_name
      FROM usersdata
          LEFT JOIN new_packages ON usersdata.id = new_packages.userid AND usersdata.plan_pkg = new_packages.pkg_name 
          LEFT JOIN usersdata AS s ON usersdata.sponsorid = s.id
          LEFT JOIN usersdata AS l2 ON usersdata.l2_sponsorid = l2.id
        WHERE (usersdata.sponsorid = ? OR usersdata.l2_sponsorid = ?)
          AND YEAR(usersdata.createdat) = YEAR(now())
          AND MONTH(usersdata.createdat) = MONTH(now())
          AND usersdata.trial_status = 'Active'
          order by usersdata.id desc`;
      const newTrialUser = await Qry(selectReferralUsersQuery, [
        authUser,
        authUser,
      ]);

      const totalReferralCountQuery = `
         SELECT COUNT(*) AS totalCount 
         FROM usersdata 
         WHERE (sponsorid = ? OR l2_sponsorid = ?) 
         AND YEAR(createdat) = YEAR(now()) 
         AND MONTH(createdat) = MONTH(now())`;

      const totalUsersCount = await Qry(totalReferralCountQuery, [
        authUser,
        authUser,
      ]);

      //########################################
      const selectNewCustomerQuery = `
      SELECT usersdata.*, 
        new_packages.pkg_name, 
        new_packages.amount, 
        new_packages.currency,
        new_packages.cancellation_date,
        new_packages.is_cancellation_scheduled,
        s.email AS sponsor_email,
        CONCAT(s.firstname, ' ', s.lastname) AS sponsor_name,
        l2.email AS l2_sponsor_email,
        CONCAT(l2.firstname, ' ', l2.lastname) AS l2_sponsor_name
      FROM usersdata
        JOIN new_packages ON usersdata.id = new_packages.userid
          LEFT JOIN usersdata AS s ON usersdata.sponsorid = s.id
          LEFT JOIN usersdata AS l2 ON usersdata.l2_sponsorid = l2.id
          WHERE (usersdata.sponsorid = ? OR usersdata.l2_sponsorid = ?)
            AND YEAR(usersdata.createdat) = YEAR(now())
            AND MONTH(usersdata.createdat) = MONTH(now())
            AND new_packages.activatedAt < UNIX_TIMESTAMP(NOW() + INTERVAL 14 DAY)
            AND new_packages.status in ('subscription_renewed', 'Active')
            AND usersdata.trial_status = 'Inactive'
            AND new_packages.type != 'distributor'
            order by usersdata.id desc
            `;
      const newCustomer = await Qry(selectNewCustomerQuery, [
        authUser,
        authUser,
      ]);

      //########################################
      const NotPaidCustomerQuery = `
      SELECT usersdata.*, 
        new_packages.pkg_name, 
        new_packages.amount, 
        new_packages.currency,
        new_packages.cancellation_date,
        new_packages.is_cancellation_scheduled,
        s.email AS sponsor_email,
        CONCAT(s.firstname, ' ', s.lastname) AS sponsor_name,
        l2.email AS l2_sponsor_email,
        CONCAT(l2.firstname, ' ', l2.lastname) AS l2_sponsor_name
      FROM usersdata
        JOIN new_packages ON usersdata.id = new_packages.userid
          LEFT JOIN usersdata AS s ON usersdata.sponsorid = s.id
          LEFT JOIN usersdata AS l2 ON usersdata.l2_sponsorid = l2.id
          WHERE (usersdata.sponsorid = ? OR usersdata.l2_sponsorid = ?)
            AND YEAR(FROM_UNIXTIME(new_packages.cancellation_date)) = YEAR(now())
            AND MONTH(FROM_UNIXTIME(new_packages.cancellation_date)) = MONTH(now())
            AND new_packages.status = 'subscription_cancelled'
            order by usersdata.id desc
            `;
      const trialCanceledUsers = await Qry(NotPaidCustomerQuery, [
        authUser,
        authUser,
      ]);

      const paymentFailedCustomerQuery = `
      SELECT usersdata.*, 
        new_packages.pkg_name, 
        new_packages.amount, 
        new_packages.currency,
        new_packages.cancellation_date,
        new_packages.is_cancellation_scheduled,
        s.email AS sponsor_email,
        CONCAT(s.firstname, ' ', s.lastname) AS sponsor_name,
        l2.email AS l2_sponsor_email,
        CONCAT(l2.firstname, ' ', l2.lastname) AS l2_sponsor_name
      FROM usersdata
        JOIN new_packages ON usersdata.id = new_packages.userid
          LEFT JOIN usersdata AS s ON usersdata.sponsorid = s.id
          LEFT JOIN usersdata AS l2 ON usersdata.l2_sponsorid = l2.id
          WHERE (usersdata.sponsorid = ? OR usersdata.l2_sponsorid = ?)
            AND YEAR(usersdata.createdat) = YEAR(now())
            AND MONTH(usersdata.createdat) = MONTH(now())
            AND new_packages.status = 'payment_failed'
            order by usersdata.id desc
            `;
      const paymentFailedCustomer = await Qry(paymentFailedCustomerQuery, [
        authUser,
        authUser,
      ]);

      const cancelScheduledCustomerQuery = `
      SELECT usersdata.*, 
        new_packages.pkg_name, 
        new_packages.amount, 
        new_packages.currency,
        new_packages.cancellation_date,
        new_packages.is_cancellation_scheduled,
        s.email AS sponsor_email,
        CONCAT(s.firstname, ' ', s.lastname) AS sponsor_name,
        l2.email AS l2_sponsor_email,
        CONCAT(l2.firstname, ' ', l2.lastname) AS l2_sponsor_name
      FROM usersdata
        JOIN new_packages ON usersdata.id = new_packages.userid
          LEFT JOIN usersdata AS s ON usersdata.sponsorid = s.id
          LEFT JOIN usersdata AS l2 ON usersdata.l2_sponsorid = l2.id
          WHERE (usersdata.sponsorid = ? OR usersdata.l2_sponsorid = ?)
            AND new_packages.is_cancellation_scheduled = '1'
            AND FROM_UNIXTIME(new_packages.cancellation_date) >= NOW()
            order by usersdata.id desc
            `;
      /*
      AND MONTH(FROM_UNIXTIME(new_packages.cancellation_date)) = MONTH(CURDATE())
      AND YEAR(FROM_UNIXTIME(new_packages.cancellation_date)) = YEAR(CURDATE())
      */
      const cancelScheduledCustomer = await Qry(cancelScheduledCustomerQuery, [
        authUser,
        authUser,
      ]);

      res.status(200).json({
        status: "success",
        data: { refferedUsers: newTrialUser, totalUsersCount, refferedCustomer: newCustomer, trialCanceledUsers, "payment_due": paymentFailedCustomer, cancelScheduledCustomer },
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.affiliateCustomers = async (req, res) => {
  try {

    const postData = req.body;
    const month = postData?.month;
    const year = postData?.year;

    const authUser = await checkAuthorization(req, res);
    if (authUser) {

      //new trial customers
      let selectNewTrialUsersQuery = `
      SELECT usersdata.*, 
        new_packages.pkg_name, 
        new_packages.amount, 
        new_packages.currency,
        new_packages.cancellation_date,
        new_packages.is_cancellation_scheduled,
        s.email AS sponsor_email,
        CONCAT(s.firstname, ' ', s.lastname) AS sponsor_name,
        l2.email AS l2_sponsor_email,
        CONCAT(l2.firstname, ' ', l2.lastname) AS l2_sponsor_name
      FROM usersdata
        JOIN new_packages ON usersdata.id = new_packages.userid 
          LEFT JOIN usersdata AS s ON usersdata.sponsorid = s.id
          LEFT JOIN usersdata AS l2 ON usersdata.l2_sponsorid = l2.id
        WHERE (usersdata.sponsorid = ? OR usersdata.l2_sponsorid = ?)
          AND usersdata.createdat >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
          AND usersdata.subscription_status in ('Active','payment_failed', 'subscription_cancelled', 'subscription_reactivated')
          AND usersdata.trial_status = 'Active' and new_packages.pkg_name not in ('Affiliate Fee')`;

      if (month && year) {
        selectNewTrialUsersQuery += `AND MONTH(usersdata.createdat) = ? 
            AND YEAR(usersdata.createdat) = ?`;
      } else {
        selectNewTrialUsersQuery += `AND (? IS NULL OR ? IS NULL)`;
      }

      selectNewTrialUsersQuery += ` ORDER BY usersdata.id DESC`;
      const params1 = month && year ? [authUser, authUser, month, year] : [authUser, authUser, null, null];
      const newTrialUser = await Qry(selectNewTrialUsersQuery, params1);

      //select active customer
      let selectActiveCustomerQuery = `
      SELECT usersdata.*, 
        new_packages.pkg_name, 
        new_packages.amount, 
        new_packages.currency,
        new_packages.cancellation_date,
        new_packages.activatedAt,
        new_packages.nextBillingAt,
        new_packages.is_cancellation_scheduled,
        s.email AS sponsor_email,
        CONCAT(s.firstname, ' ', s.lastname) AS sponsor_name,
        l2.email AS l2_sponsor_email,
        CONCAT(l2.firstname, ' ', l2.lastname) AS l2_sponsor_name
      FROM usersdata
        JOIN new_packages ON usersdata.id = new_packages.userid AND usersdata.subscription_status = new_packages.status
          LEFT JOIN usersdata AS s ON usersdata.sponsorid = s.id
          LEFT JOIN usersdata AS l2 ON usersdata.l2_sponsorid = l2.id
          WHERE (usersdata.sponsorid = ? OR usersdata.l2_sponsorid = ?)
             AND usersdata.subscription_status in ('subscription_renewed', 'Active', 'subscription_changed', 'subscription_created', 'subscription_activated', 'payment_failed', 'subscription_reactivated', 'subscription_resumed')
            AND usersdata.trial_status = 'Inactive' and new_packages.pkg_name not in ('Affiliate Fee')`;

      if (month && year) {
        // selectActiveCustomerQuery += `AND MONTH(usersdata.createdat) = ? AND YEAR(usersdata.createdat) = ?`;
        selectActiveCustomerQuery += `AND usersdata.createdat <= LAST_DAY(STR_TO_DATE(CONCAT(?, '-', ?), '%Y-%m'))`;
      } else {
        selectActiveCustomerQuery += `AND (? IS NULL OR ? IS NULL)`;
      }

      selectActiveCustomerQuery += ` ORDER BY usersdata.id DESC`;
      const params2 = month && year ? [authUser, authUser, year, month] : [authUser, authUser, null, null];
      const activeCustomers = await Qry(selectActiveCustomerQuery, params2);

      // AND YEAR(usersdata.createdat) = YEAR(now())
      // AND usersdata.createdat >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)


      //trial cancelled user
      let trialCancelledCustomerQuery = `
      SELECT usersdata.*, 
        new_packages.pkg_name, 
        new_packages.amount, 
        new_packages.currency,
        new_packages.cancellation_date,
        new_packages.is_cancellation_scheduled,
        s.email AS sponsor_email,
        CONCAT(s.firstname, ' ', s.lastname) AS sponsor_name,
        l2.email AS l2_sponsor_email,
        CONCAT(l2.firstname, ' ', l2.lastname) AS l2_sponsor_name
      FROM usersdata
        JOIN new_packages ON usersdata.id = new_packages.userid
          LEFT JOIN usersdata AS s ON usersdata.sponsorid = s.id
          LEFT JOIN usersdata AS l2 ON usersdata.l2_sponsorid = l2.id
          WHERE (usersdata.sponsorid = ? OR usersdata.l2_sponsorid = ?)
            AND usersdata.subscription_status = 'subscription_cancelled'
            AND usersdata.trial_status = 'Active'`;

      if (month && year) {
        // trialCancelledCustomerQuery += `AND MONTH(usersdata.createdat) = ? AND YEAR(usersdata.createdat) = ?`;
        // trialCancelledCustomerQuery += `AND new_packages.cancellation_date <= LAST_DAY(STR_TO_DATE(CONCAT(?, '-', ?), '%Y-%m'))`;
        trialCancelledCustomerQuery += `AND YEAR(usersdata.createdat) <= ? AND MONTH(usersdata.createdat) <= ?`;
      } else {
        trialCancelledCustomerQuery += `AND (? IS NULL OR ? IS NULL)`;
      }

      trialCancelledCustomerQuery += ` ORDER BY usersdata.id DESC`;
      const params3 = month && year ? [authUser, authUser, year, month] : [authUser, authUser, null, null];
      const trialCancelledCustomers = await Qry(trialCancelledCustomerQuery, params3);

      // AND YEAR(FROM_UNIXTIME(new_packages.cancellation_date)) = YEAR(now())
      // AND new_packages.cancellation_date >= UNIX_TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 30 DAY))


      //customer cancelled subscription
      let customerCancelledQuery = `
      SELECT usersdata.*, 
        new_packages.pkg_name, 
        new_packages.amount, 
        new_packages.currency,
        new_packages.cancellation_date,
        new_packages.is_cancellation_scheduled,
        s.email AS sponsor_email,
        CONCAT(s.firstname, ' ', s.lastname) AS sponsor_name,
        l2.email AS l2_sponsor_email,
        CONCAT(l2.firstname, ' ', l2.lastname) AS l2_sponsor_name
      FROM usersdata
        JOIN new_packages ON usersdata.id = new_packages.userid
          LEFT JOIN usersdata AS s ON usersdata.sponsorid = s.id
          LEFT JOIN usersdata AS l2 ON usersdata.l2_sponsorid = l2.id
          WHERE (usersdata.sponsorid = ? OR usersdata.l2_sponsorid = ?)
          AND usersdata.subscription_status in ('subscription_cancelled', 'subscription_paused')
          AND usersdata.trial_status = 'Inactive'`;

      if (month && year) {
        // customerCancelledQuery += `AND MONTH(usersdata.createdat) = ? AND YEAR(usersdata.createdat) = ?`;
        // customerCancelledQuery += `AND new_packages.cancellation_date <= LAST_DAY(STR_TO_DATE(CONCAT(?, '-', ?), '%Y-%m'))`;
        customerCancelledQuery += `AND YEAR(usersdata.createdat) <= ? AND MONTH(usersdata.createdat) <= ?`;
      } else {
        customerCancelledQuery += `AND (? IS NULL OR ? IS NULL)`;
      }

      customerCancelledQuery += ` ORDER BY usersdata.id DESC`;
      const params4 = month && year ? [authUser, authUser, year, month] : [authUser, authUser, null, null];
      const customerCancelledSelect = await Qry(customerCancelledQuery, params4);

      // AND new_packages.cancellation_date >= UNIX_TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 30 DAY))          
      // AND YEAR(FROM_UNIXTIME(new_packages.cancellation_date)) = YEAR(now())
      // AND MONTH(FROM_UNIXTIME(new_packages.cancellation_date)) = MONTH(now())

      //select active customer
      let selectAllCustomerQuery = `
        SELECT usersdata.*, 
            new_packages.pkg_name, 
            new_packages.amount, 
            new_packages.currency,
            new_packages.cancellation_date,
            new_packages.activatedAt,
            new_packages.nextBillingAt,
            new_packages.is_cancellation_scheduled,
            s.email AS sponsor_email,
            CONCAT(s.firstname, ' ', s.lastname) AS sponsor_name,
            l2.email AS l2_sponsor_email,
            CONCAT(l2.firstname, ' ', l2.lastname) AS l2_sponsor_name
        FROM usersdata
        JOIN new_packages ON usersdata.id = new_packages.userid
        LEFT JOIN usersdata AS s ON usersdata.sponsorid = s.id
        LEFT JOIN usersdata AS l2 ON usersdata.l2_sponsorid = l2.id
        WHERE (usersdata.sponsorid = ? OR usersdata.l2_sponsorid = ?)`;

      if (month && year) {
        // selectAllCustomerQuery += `AND MONTH(usersdata.createdat) = ? AND YEAR(usersdata.createdat) = ?`;
        selectAllCustomerQuery += `AND usersdata.createdat <= LAST_DAY(STR_TO_DATE(CONCAT(?, '-', ?), '%Y-%m'))`;
      } else {
        selectAllCustomerQuery += `AND (? IS NULL OR ? IS NULL)`;
      }

      selectAllCustomerQuery += ` ORDER BY usersdata.id DESC`;

      const params = month && year ? [authUser, authUser, year, month] : [authUser, authUser, null, null];

      const allCustomers = await Qry(selectAllCustomerQuery, params);

      const totalActiveCustomerQuery = `
        SELECT COUNT(*) AS totalCount 
        FROM usersdata 
        WHERE (sponsorid = ? OR l2_sponsorid = ?)
        AND subscription_status NOT IN ('subscription_cancelled', 'payment_failed', 'subscription_paused')`;

      const totalActiveUsersCount = await Qry(totalActiveCustomerQuery, [
        authUser,
        authUser,
      ]);

      return res.status(200).json({
        status: "success",
        data: {
          new_trails: newTrialUser,
          active_customers: activeCustomers,
          trial_cancelled: trialCancelledCustomers,
          customer_cancelled: customerCancelledSelect,
          all_customers: allCustomers,
          totalUsersCount: totalActiveUsersCount,
        },
      });
    }
  } catch (e) {
    return res.status(500).json({ status: "error", message: e });
  }
};

exports.ticketCount = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token

    if (authUser) {
      const getTicketQry = `SELECT total_tickets_sold  FROM ticket_count WHERE id = ?`
      const getTicketResult = await Qry(getTicketQry, 1);
      res.json({
        status: "success",
        data: getTicketResult,
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred in query",
    });
  }
};

exports.singleUserData = async (req, res) => {
  const postData = req.body;
  const randomcode = CleanHTMLData(CleanDBData(postData.randomcode));

  try {
    const userSelectQuery = `SELECT sponsorid,username, randomcode, firstname, lastname, email, picture, current_balance,referral_side,  status, mobile, emailstatus, address1,company, country, createdat, login_status, lastlogin, lastip, customerid,kyc_status FROM usersdata WHERE randomcode = ?`;

    const userSelectParams = [randomcode];
    const userSelectResult = await Qry(userSelectQuery, userSelectParams);
    const userdbData = userSelectResult[0];

    let sponsordbData;
    if (userdbData.sponsorid === "") {
      userdbData.sponsorusername = "admin";
    } else {
      const sponsorSelectQuery = `SELECT username AS sponsorusername FROM usersdata WHERE id = ?`;
      const sponsorSelectParams = [userdbData.sponsorid];
      const sponsorSelectResult = await Qry(
        sponsorSelectQuery,
        sponsorSelectParams
      );
      sponsordbData = sponsorSelectResult[0];
      userdbData.sponsorusername = sponsordbData.sponsorusername;
    }

    res.json({
      status: "success",
      data: userdbData,
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.getMessagesList = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const messagesSelect = await Qry(
        `SELECT * FROM messages WHERE userid = '${authUser}' OR userid = 'all' ORDER BY id DESC LIMIT 20`
      );

      if (messagesSelect.length > 0) {
        const messagesArray = { enteries: messagesSelect };
        res.status(200).json({ status: "success", data: messagesArray });
      } else {
        const messagesArray = {
          enteries: [{ id: 1, type: "empty", details: "no new message" }],
        };
        res.status(200).json({ status: "success", data: messagesArray });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.getSingleMessage = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const { messageid } = req.body;

      const messagesSelect = await Qry(`
      SELECT *
      FROM messages
      WHERE randomcode = '${messageid}' AND (userid = 'all' OR userid = '${authUser}')
    `);

      const messagesdbData = messagesSelect;

      if (messagesdbData.length > 0) {
        res.status(200).json({ status: "success", data: messagesdbData });
      } else {
        res.status(200).json({ status: "error", data: "no data found" });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const notificationsSelect = await Qry(`
      SELECT id, type, seen, details, createdat AS date
      FROM transactions
      WHERE (senderid = '${authUser}' OR receiverid = '${authUser}')
      AND type = 'Update Balance'
      ORDER BY id DESC LIMIT 5
    `);

      if (notificationsSelect.length > 0) {
        const notificationsArray = { enteries: notificationsSelect };
        res.status(200).json({ status: "success", data: notificationsArray });
      } else {
        const notificationsArray = {
          enteries: [{ id: 1, type: "empty", details: "no new notifications" }],
        };
        res.status(200).json({ status: "success", data: notificationsArray });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.lastWeekTransactions = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const transactionSelect = await Qry(`
      SELECT * 
      FROM transactions
      WHERE createdat > DATE(NOW() - INTERVAL 7 DAY) AND (senderid = '${authUser}' OR receiverid = '${authUser}')
      ORDER BY id DESC
    `);

      const transactiondbData = transactionSelect;
      const transactionarray = { enteries: transactiondbData };

      if (transactiondbData.length > 0) {
        res.status(200).json({ status: "success", data: transactionarray });
      } else {
        transactionarray.enteries = [];
        res.status(200).json({ status: "success", data: transactionarray });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.updateProfileData = async (req, res) => {
  const postData = req.body;
  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const updates = [];
      const date = new Date().toISOString();
      postData.updatedat = date;

      for (const [key, value] of Object.entries(postData)) {
        const sanitizedValue = CleanHTMLData(CleanDBData(value));
        updates.push(`${key} = '${sanitizedValue}'`);
      }

      const updateQuery = `UPDATE usersdata SET ${updates.join(
        ", "
      )} WHERE id = '${authUser}'`;
      const updateResult = await Qry(updateQuery);

      const selectUserQuery = "SELECT * FROM usersdata WHERE id = ?";
      const selectUserResult = await Qry(selectUserQuery, [authUser]);
      const userData = selectUserResult[0];

      logger.info(`User ${userData.username} has update profile information`, {
        type: "user",
      });

      if (updateResult) {
        res.status(200).json({
          status: "success",
          message: "Profile Data updated successfully",
        });
      } else {
        res.status(500).json({
          status: "error",
          message: "Something went wrong. Please try again later.",
        });
      }
      await emptyArray(updates);
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.updatePassword = async (req, res) => {
  const postData = req.body;

  try {

    const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    const oldpassword = CleanHTMLData(CleanDBData(postData.oldpassword));
    const newpassword = CleanHTMLData(CleanDBData(postData.newpassword));
    if (authUser) {

      const selectUserQuery = "SELECT * FROM usersdata WHERE id = ?";
      const selectUserResult = await Qry(selectUserQuery, [authUser]);
      const userData = selectUserResult[0];

      if (!userData || userData.id !== authUser) {

        return Response.resWith422(res, "Invalid data contact support for this issue");
      }

      // Generate a salt for password hashing
      const saltRounds = 16; // The number of salt rounds determines the complexity of the hashing
      const salt = bcrypt.genSaltSync(saltRounds);

      const options = {
        cost: 12, // Specify the hashing cost (higher cost means more secure but slower)
        salt: salt, // Pass the generated salt
      };
      const hashedPassword = bcrypt.hashSync(newpassword, options.cost);
     
      const encryptedPassword = crypto.AES.encrypt(hashedPassword, encryptionKey).toString();
      const decryptedPassword = crypto.AES.decrypt(userData.password,encryptionKey).toString(crypto.enc.Utf8);
      const passwordMatch = bcrypt.compareSync(oldpassword, decryptedPassword);

      if (!passwordMatch) {

        return Response.resWith422(res, "Incorrect Old Password");
      }

      const updateQuery = "UPDATE usersdata SET password = ? WHERE id = ?";
      const updateParams = [encryptedPassword, authUser];
      const updateResult = await Qry(updateQuery, updateParams);

      logger.info(`User ${userData.username} has update password from manage profile`,{ type: "user" });

      if (updateResult.affectedRows > 0) {

        return Response.resWith202(res, "Password updated successfully");
      }
    }
  } catch (error) {

    console.error("Error occurred:", error);  
    return Response.resWith422(res, "Something went wrong");
  }
};

exports.getSubscriptionItems = async (req, res) => {
  const postData = req.body;
  try {
    let trial = "No";

    const today = new Date();
    let dayNumber = today.getDate();
    // dayNumber = 15

    if (postData.subdomain === "app" && dayNumber <= 31) {
      trial = "Yes";
    }

    if (postData.subdomain === "lyriange") {
      trial = "Yes";
    }

    const selectPlanQuery =
      "SELECT * FROM plans WHERE subdomain = ? and currency_code = ? and  plan_type = ? and period_unit = ? and trial = ?";
    const selectPlanResult = await Qry(selectPlanQuery, [
      postData.subdomain,
      postData.country,
      postData.plan_type,
      postData.period_unit,
      trial,
    ]);

    res.json({
      status: "success",
      data: selectPlanResult,
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.getUpgradeSubscriptionItems = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    const postData = req.body;
    if (authUser) {
      const selectUsernameQuery = `SELECT * FROM new_packages WHERE userid = ?`;
      const selectUserResult = await Qry(selectUsernameQuery, [authUser]);
      let amount = selectUserResult[0].amount;
      let planId = selectUserResult[0].pkg_name;

      chargebee.item_price
        .list({
          limit: 50,
          "status[is]": "active",
          "currency_code[is]": postData.country,
          "sort_by[asc]": "id",
          "period_unit[is]": postData.period_unit,
        })
        .request(function (error, result) {
          if (error) {
          } else {
            let planData = {
              amount: amount,
              planid: planId,
            };
            res.json({
              status: "success",
              data: result,
              planData: planData,
            });
          }
        });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.getSingleItem = async (req, res) => {
  const postData = req.body;
  const itemid = CleanHTMLData(CleanDBData(postData.itemid));
  try {
    chargebee.item_price.retrieve(itemid).request(function (error, result) {
      if (error) {
        //handle error
      } else {
        res.json({
          status: "success",
          data: result,
        });
      }
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.updateSubscription = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    const postData = req.body;
    const date = new Date().toISOString().slice(0, 19).replace("T", " ");
    //subscription item details
    const item_price_id = CleanHTMLData(CleanDBData(postData.item_price_id));
    const subscription_id = CleanHTMLData(
      CleanDBData(postData.subscription_id)
    );

    const selectUsernameQuery = `SELECT * FROM usersdata WHERE id = ?`;
    const selectUsernameResult = await Qry(selectUsernameQuery, [authUser]);

    var website = selectUsernameResult[0].website;

    if (website && website != null && website == 'nuskin') {

      var redirect_url = 'https://wcy-nuskin.novalya.com/';
      var cancel_url = 'https://wcy-nuskin.novalya.com/';
    } else {

      var redirect_url = weblink + "affiliate/";
      var cancel_url = weblink + "affiliate/";
    }
    const updateSubscription = () => {
      return new Promise((resolve, reject) => {
        chargebee.hosted_page.checkout_existing_for_items({
          subscription: {
            id: subscription_id,
          },
          subscription_items: [
            {
              item_price_id: item_price_id,
            },
          ],
          redirect_url: redirect_url,
          cancel_url: cancel_url,
        })
          .request(function (error, result) {
            if (error) {
              //handle error
              reject(error);
            } else {
              resolve(result);
            }
          });
      });
    };

    let subscriptionResult;
    try {
      subscriptionResult = await updateSubscription();
      res.json({
        status: "success",
        data: subscriptionResult,
      });
    } catch (error) {
      res.json({
        status: "error",
        message: error?.message,
      });
      return;
    }
  } catch (error) {
    res.json({
      status: "error",
      errordetails: error,
    });
  }
};

exports.createAffiliateUser = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    const postData = req.body;
    //subscription item details
    const customerid = CleanHTMLData(CleanDBData(postData.customerid));

    const selectUsernameQuery = `SELECT * FROM usersdata WHERE id = ?`;
    const selectUsernameResult = await Qry(selectUsernameQuery, [authUser]);

    let currency = selectUsernameResult[0].currency;
    let item_price_id = `Affiliate-Fee-${currency}-Yearly`;

    const affiliateSubscription = () => {
      return new Promise((resolve, reject) => {
        chargebee.hosted_page
          .checkout_new_for_items({
            subscription_items: [
              {
                item_price_id: item_price_id,
                quantity: 1,
              },
            ],
            customer: {
              id: customerid,
            },
            redirect_url: weblink + "dashboard/",
            cancel_url: weblink + "dashboard/",
          })
          .request(function (error, result) {
            if (error) {
              //handle error
              reject(error);
            } else {
              resolve(result);
            }
          });
      });
    };

    let subscriptionResult;
    try {
      subscriptionResult = await affiliateSubscription();
      res.json({
        status: "success",
        data: subscriptionResult,
      });
    } catch (error) {
      res.json({
        status: "error",
        message: error?.message,
      });
      return;
    }
  } catch (error) {
    res.json({
      status: "error",
      errordetails: error,
    });
  }
};

exports.createPortalSession = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res); 
    const postData = req.body;
    const customerid = CleanHTMLData(CleanDBData(postData.customerid));

    const createSession = () => {
      return new Promise((resolve, reject) => {
        chargebee.portal_session
          .create({
            redirect_url: "https://app.novalya.com/profile",
            customer: {
              id: customerid,
            },
          })
          .request(function (error, result) {
            if (error) {

              reject(error);
            } else {
              resolve(result);
            }
          });
      });
    };

    let sessionResult;
    try {

      sessionResult = await createSession();

      return Response.resWith202(res, "success", sessionResult);
    } catch (error) {
      console.error("Error occurred:", error);  
      return Response.resWith422(res, "Something went wrong");
    }
  } catch (error) {

    console.error("Error occurred:", error);  
    return Response.resWith422(res, "Something went wrong");
  }
};

exports.checkcoupon = async (req, res) => {
  const postData = req.body;
  try {
    const couponcode = CleanHTMLData(CleanDBData(postData?.couponcode));
    chargebee.coupon.retrieve(couponcode).request(function (error, result) {
      if (error) {
        
        return Response.resWith422(res, "invalid coupon code");
      } else {
        var coupon = result.coupon;
        
        return Response.resWith202(res, "success", {coupondata: coupon});
      }
    });
  } catch (error) {
    console.error("Error occurred:", error);  
    return Response.resWith422(res, "Something went wrong");
  }
};

exports.getChargebeeCustomer = async (req, res) => {
  const postData = req.body;
  try {
    const authUser = await checkAuthorization(req, res);
    const customerid = CleanHTMLData(CleanDBData(postData.customerid));
    if (authUser) {
      chargebee.customer.retrieve(customerid).request(function (error, result) {
        if (error) {
          //handle error

          res.json({
            status: "error",
            message: "invalid customer id",
          });
        } else {
          var customer = result.customer;
          var card = result.card;
          res.json({
            status: "error",
            message: "customer validated successfully",
            customerdata: customer,
            carddata: card,
          });
        }
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.checkaffiliatehostedpage = async (req, res) => {
  const postData = req.body;
  try {
    const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    const hostedId = CleanHTMLData(CleanDBData(postData?.hostedId));
    const checkHostedId = () => {
      return new Promise((resolve, reject) => {
        chargebee.hosted_page
          .retrieve(hostedId)
          .request(function (error, result) {
            if (error) {
              reject(error);
            } else {
              resolve(result.hosted_page);
            }
          });
      });
    };

    if (authUser) {
      var subscriptionResult = await checkHostedId();

      const hostedStatus = subscriptionResult.state;
      const invoiceStatus = subscriptionResult.content.invoice.status;
      const amount =
        subscriptionResult.content.subscription.subscription_items[0].amount /
        100;
      const planId =
        subscriptionResult.content.subscription.subscription_items[0]
          .item_price_id;
      const subscriptionId = subscriptionResult.content.subscription.id;
      const customerId = subscriptionResult.content.customer.id;
      const currencyCode =
        subscriptionResult.content.subscription.currency_code;
      const couponCode = "";
      const activatedAt = subscriptionResult.content.subscription.created_at;
      const nextBillingAt =
        subscriptionResult.content.subscription.next_billing_at;
      const subscriptionStatus = "Active";
      const pkgName =
        subscriptionResult.content.invoice.line_items[0].description;
      const binaryVolume = Math.ceil(amount);
      const subscriptionType =
        subscriptionResult.content.subscription.billing_period_unit;
      const maskedNumber = subscriptionResult.content.card.masked_number;
      if (hostedStatus === "succeeded" && invoiceStatus === "paid") {
        selectPackageQry =
          "SELECT * FROM new_packages WHERE customerid = ? and planid = ?";
        const selectPackage = await Qry(selectPackageQry, [customerId, planId]);
        const packageData = selectPackage[0];

        if (
          selectPackage.length > 0 &&
          packageData.customerid === customerId &&
          packageData.planid === planId
        ) {
          res.json({
            status: "error",
            message: "You are already subscribed as Affiliate.",
          });
        } else {
          const insertPackageQuery = `INSERT INTO new_packages(userid, amount, subscriptionid, customerid, currency, planid,  coupon, activatedAt, nextBillingAt, status, pkg_name, binary_volume, sub_type,type) VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
          const insertPackageParams = [
            authUser,
            amount,
            subscriptionId,
            customerId,
            currencyCode,
            planId,
            couponCode,
            activatedAt,
            nextBillingAt,
            subscriptionStatus,
            pkgName,
            binaryVolume,
            subscriptionType,
            "distributor",
          ];
          const insertPackageResult = await Qry(
            insertPackageQuery,
            insertPackageParams
          );

          const updateUser = await Qry(
            "update usersdata set masked_number = ? , user_type = ? where id = ?",
            [maskedNumber, "Distributor", authUser]
          );

          if (
            updateUser.affectedRows > 0 &&
            insertPackageResult.affectedRows > 0
          ) {
            const selectUserQuery = `SELECT * FROM usersdata where id = ?`;
            const selectUserResult = await Qry(selectUserQuery, [authUser]);

            logger.info(
              `User ${selectUserResult[0].username} has become an affiliate`,
              { type: "user" }
            );

            res.json({
              status: "success",
              message: "You have become affiliate successfully",
            });
          }
        }
      } else {
        res.json({
          status: "error",
          message:
            "There is a payment issue with your subscription. Please contact support.",
        });
      }
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.dashboarddata = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      function getMonthName(monthNumber) {
        const monthNames = [
          "Jan",
          "Feb",
          "March",
          "April",
          "May",
          "June",
          "July",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];

        if (monthNumber >= 1 && monthNumber <= 12) {
          return monthNames[monthNumber - 1];
        } else {
          return "Invalid Month";
        }
      }

      function getLastMonthNumber() {
        var currentDate = new Date();
        var lastMonth = currentDate.getMonth(); // Get current month
        lastMonth = lastMonth === 0 ? 12 : lastMonth; // If January, set to December
        return lastMonth;
      }

      const selectUsersData = `SELECT * FROM usersdata WHERE id = ?`;
      let resultUserData = await Qry(selectUsersData, [authUser]);

      let userCurrency = resultUserData[0].currency;
      let cSymbol;
      let eurBankTitle = resultUserData[0].bank_account_title;
      let usdBankTitle = resultUserData[0].outside_bank_account_title;
      let userWalletAddress = resultUserData[0].wallet_address;

      if (eurBankTitle) {
        userCurrency = "EUR";
      } else if (usdBankTitle) {
        userCurrency = "USD";
      } else if (userWalletAddress) {
        userCurrency = "USD";
      } else {
        userCurrency = userCurrency;
      }

      let settingsData;

      if (userCurrency === "EUR") {
        settingsData = await Qry(
          "SELECT * FROM `setting` WHERE keyname IN (?)",
          ["conversion1"]
        );
        cSymbol = "€";
      } else {
        settingsData = await Qry(
          "SELECT * FROM `setting` WHERE keyname IN (?)",
          ["conversion"]
        );
        cSymbol = "$";
      }

      let conversionRate = {
        rate: parseFloat(settingsData[0].keyvalue),
      };

      // start life time earning
      let lifeTimeEarningEUR = 0;
      let lifeTimeEarningUSD = 0;

      const selectUsersDataTotalEarningEUR = `SELECT SUM(amount) as total FROM transactions WHERE receiverid = ? and type = ? and (currency = ? or currency = ?)`;
      let resultUserDataTotalEarningEUR = await Qry(
        selectUsersDataTotalEarningEUR,
        [authUser, "Payout", "EUR", ""]
      );

      if (
        resultUserDataTotalEarningEUR[0].total === "" ||
        resultUserDataTotalEarningEUR[0].total === null
      ) {
        resultUserDataTotalEarningEUR[0].total = 0;
      }

      const selectUsersDataTotalEarningUSD = `SELECT SUM(amount) as total FROM transactions WHERE receiverid = ? and type = ? and (currency = ?)`;
      let resultUserDataTotalEarningUSD = await Qry(
        selectUsersDataTotalEarningUSD,
        [authUser, "Payout", "USD"]
      );

      if (
        resultUserDataTotalEarningUSD[0].total === "" ||
        resultUserDataTotalEarningUSD[0].total === null
      ) {
        resultUserDataTotalEarningUSD[0].total = 0;
      }

      lifeTimeEarningEUR =
        lifeTimeEarningEUR + resultUserDataTotalEarningEUR[0].total;
      lifeTimeEarningUSD =
        lifeTimeEarningUSD + resultUserDataTotalEarningUSD[0].total;

      let lifeTImeEarning = 0;

      if (userCurrency === "EUR") {
        lifeTImeEarning =
          lifeTimeEarningEUR + lifeTimeEarningUSD * conversionRate.rate;
      } else {
        lifeTImeEarning =
          lifeTimeEarningUSD + lifeTimeEarningEUR * conversionRate.rate;
      }

      let lastMonthEur = resultUserData[0].current_balance_eur_lastmonth;
      let lastMonthUSD = resultUserData[0].current_balance_usd_lastmonth;

      const selectPoolBonusApproved = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND type IN ('Pool 1 Bonus', 'Pool 2 Bonus', 'Pool 3 Bonus') AND MONTH(approvedat) = MONTH(now()) AND YEAR(approvedat) = YEAR(now()) AND status = ?`;
      let resultPoolBonusApproved = await Qry(selectPoolBonusApproved, [
        authUser,
        "Approved",
      ]);

      if (resultPoolBonusApproved[0].totalAmount === null) {
        resultPoolBonusApproved[0].totalAmount = 0;
      }

      lastMonthUSD = lastMonthUSD + resultPoolBonusApproved[0].totalAmount;

      // let lastMonthEarning = {
      //   eur: lastMonthEur,
      //   usd: lastMonthUSD
      // }

      let lastMonthEarning = 0;

      if (userCurrency === "EUR") {
        lastMonthEarning = lastMonthEur + lastMonthUSD * conversionRate.rate;
      } else {
        lastMonthEarning = lastMonthUSD + lastMonthEur * conversionRate.rate;
      }

      // end last month earning

      // start total payment
      let currentMonthNumber = currentMonthFun();
      let commissionData = await total_payment_function(
        authUser,
        currentMonthNumber
      );

      // let totalPayment = {
      //   eur: commissionData.totalPaymentEUR,
      //   usd: commissionData.totalPaymentUSD
      // };

      let totalPayment = 0;

      if (userCurrency === "EUR") {
        totalPayment =
          commissionData?.totalPaymentEUR +
          commissionData?.totalPaymentUSD * conversionRate?.rate;
      } else {
        totalPayment =
          commissionData?.totalPaymentUSD +
          commissionData?.totalPaymentEUR * conversionRate?.rate;
      }

      // end total payment

      // start total earning
      let level1 = 0;
      let level2 = 0;
      let bonus = 0;
      let otherBonus = 0;
      if (userCurrency === "EUR") {
        level1 =
          commissionData?.level1EUR +
          commissionData?.level1USD * conversionRate?.rate;
        level2 =
          commissionData?.level2EUR +
          commissionData?.level2USD * conversionRate?.rate;
        bonus = commissionData?.bonusUSD * conversionRate?.rate;
        otherBonus =
          commissionData?.eurOthers +
          commissionData?.usdOthers * conversionRate?.rate;
      } else {
        level1 =
          commissionData?.level1USD +
          commissionData?.level1EUR * conversionRate?.rate;
        level2 =
          commissionData?.level2USD +
          commissionData?.level2EUR * conversionRate?.rate;
        bonus = commissionData?.bonusUSD;
        otherBonus =
          commissionData?.usdOthers +
          commissionData?.eurOthers * conversionRate?.rate;
      }

      let totalEarning = {
        l1: level1,
        l2: level2,
        bonus: bonus,
        others: otherBonus,
      };
      // end total earning
      // start current payout percentages
      let totalUser = commissionData?.totalUser;

      let unilevelData;
      unilevelData = await Qry(
        "SELECT * FROM unilevels WHERE `number_of_users` <= ? ORDER BY `id` DESC LIMIT 1",
        [totalUser]
      );

      if (unilevelData.length === 0) {
        unilevelData = await Qry("SELECT * FROM unilevels WHERE id = ?", [0]);
      }

      let nextUnilevelData = await Qry("SELECT * FROM unilevels WHERE id = ?", [
        (unilevelData[0].id < 6 ? unilevelData[0].id + 1 : 6),
      ]);

      function updateProgressBar(value) {
        if (value <= 50) {
          return (value / 50) * 100;
        } else {
          return 100;
        }
      }
      let progressBar = updateProgressBar(totalUser);

      let currentPayoutPer = {
        l1: unilevelData[0]?.level1,
        l2: unilevelData[0]?.level2,
      };

      let nextPayoutPer = {
        l1: nextUnilevelData[0]?.level1,
        l2: nextUnilevelData[0]?.level2,
        numberOfUsers: nextUnilevelData[0]?.number_of_users,
      };

      // end current payout percentages

      //start active sales
      let personalActiveSale = {
        activeSale: totalUser,
      };
      // end active sales

      // start level bonus data
      const selectLevelBonus = `SELECT * FROM unilevels WHERE id != ?`;
      const levelBonusData = await Qry(selectLevelBonus, [0]);

      let uniLevelData = {
        unilevel: levelBonusData,
      };
      // end level bonus data

      // start Qualification Criteria

      let totalActiveUser = await newSalesFunction(
        authUser,
        currentMonthNumber
      );

      // totalActiveUser = 19

      let poolData;
      poolData = await Qry(
        "SELECT * FROM pool WHERE `number_of_users` <= ? ORDER BY `id` DESC LIMIT 1",
        [totalActiveUser]
      );

      if (poolData.length === 0) {
        poolData = await Qry("SELECT * FROM pool WHERE id = ?", [0]);
      }

      let pool = await Qry("SELECT * FROM pool WHERE id != ?", [0]);

      let requiredUsers = 0;

      if (poolData[0].id === 0) {
        requiredUsers = pool[poolData[0].id]?.number_of_users - totalActiveUser;
      } else {
        requiredUsers = pool[poolData[0].id]?.number_of_users - totalActiveUser;
      }

      let qualificationCriteria = {
        requiredUsers: requiredUsers,
        userPool: poolData,
        pool: pool,
      };

      // end Qualification Criteria

      // start total new sale
      let totalNewSale = {
        sale: totalActiveUser,
      };
      // end total new sale

      //start referral user data
      // const selectReferralUserData = `SELECT usersdata.*, new_packages.pkg_name, new_packages.amount, new_packages.currency FROM usersdata JOIN new_packages ON usersdata.id = new_packages.userid WHERE usersdata.sponsorid = ? AND YEAR(usersdata.createdat) = YEAR(now()) AND MONTH(usersdata.createdat) = MONTH(now()) AND new_packages.type = ? LIMIT 5`;
      // const referralUserData = await Qry(selectReferralUserData, [
      //   authUser,
      //   "package",
      // ]);
      // const pictureUrl = `${backoffice_link}uploads/userprofile/`;

      // let referralNewUserData = {
      //   referralUserData: referralUserData,
      //   pictureUrl: pictureUrl,
      // };
      //end referral user data

      // start monthly graph
      let monthNameArray = [];

      let saleEurArray = [];
      let saleUsdArray = [];

      let activeCustomersArray = [];
      let renewedCustomersArray = [];

      for (let i = 1; i <= 5; i++) {
        let monthName = getMonthName(i);
        monthNameArray.push(monthName);

        // start monthly new sale graph
        const selectNewSaleEur = `SELECT SUM(plan_amount) as total FROM usersdata WHERE sponsorid = ? and currency = ? and subscription_status = ? and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())`;
        let resultNewSaleEur = await Qry(selectNewSaleEur, [
          authUser,
          "EUR",
          "Active",
          i,
        ]);

        if (resultNewSaleEur[0].total === null) {
          resultNewSaleEur[0].total = 0;
        }

        const selectNewSaleUsd = `SELECT SUM(plan_amount) as total FROM usersdata WHERE sponsorid = ? and currency = ? and subscription_status = ? and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())`;
        let resultNewSaleUsd = await Qry(selectNewSaleUsd, [
          authUser,
          "USD",
          "Active",
          i,
        ]);

        if (resultNewSaleUsd[0].total === null) {
          resultNewSaleUsd[0].total = 0;
        }

        saleEurArray.push(resultNewSaleEur[0].total);
        saleUsdArray.push(resultNewSaleUsd[0].total);
        // end monthly new sale graph

        // start monthly active customers
        const selectActiveCustomers = `SELECT COUNT(*) as total FROM transactions WHERE receiverid = ? and event_type = ? and type = ? and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())`;
        let resultActiveCustomers = await Qry(selectActiveCustomers, [
          authUser,
          "subscription_created",
          "Level 1 Bonus",
          i,
        ]);

        const selectRenewedCustomers = `SELECT COUNT(*) as total FROM transactions WHERE receiverid = ? and (event_type = ? or event_type = ?) and type = ? and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())`;
        let resultRenewedCustomers = await Qry(selectRenewedCustomers, [
          authUser,
          "subscription_renewed",
          "payment_succeeded",
          "Level 1 Bonus",
          i,
        ]);

        const selectRfundedCustomers = `SELECT COUNT(*) as total FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())`;
        let resultRfundedCustomers = await Qry(selectRfundedCustomers, [
          authUser,
          "Level 1 Bonus Deducted",
          i,
        ]);

        activeCustomersArray.push(
          resultActiveCustomers[0].total - resultRfundedCustomers[0].total
        );
        renewedCustomersArray.push(
          resultRenewedCustomers[0].total - resultRfundedCustomers[0].total
        );
        // end monthly active customers
      }
      let newSaleGraph = {
        usd: saleUsdArray,
        eur: saleEurArray,
        month: monthNameArray,
      };

      let activeCustomersGraph = {
        active: activeCustomersArray,
        renewed: renewedCustomersArray,
        month: monthNameArray,
      };
      // end monthly graph

      // start monthly graph
      let monthNameArray1 = [];

      let earningEurArray = [];
      let earningUsdArray = [];

      for (let i = 1; i <= 12; i++) {
        let monthName = getMonthName(i);
        monthNameArray1.push(monthName);

        const selectEarningEUR = `SELECT SUM(amount) as total FROM transactions WHERE receiverid = ? and currency = ? and (type = ? or type = ?) and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())`;
        let resultEarningEUR = await Qry(selectEarningEUR, [
          authUser,
          "EUR",
          "Level 1 Bonus",
          "Level 2 Bonus",
          i,
        ]);

        if (resultEarningEUR[0].total === null) {
          resultEarningEUR[0].total = 0;
        }

        const selectRefundedEUR = `SELECT SUM(amount) as total FROM transactions WHERE receiverid = ? and currency = ? and (type = ? or type = ?) and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())`;
        let resultRefundedEUR = await Qry(selectRefundedEUR, [
          authUser,
          "EUR",
          "Level 1 Bonus Deducted",
          "Level 2 Bonus Deducted",
          i,
        ]);

        if (resultRefundedEUR[0].total === null) {
          resultRefundedEUR[0].total = 0;
        }

        const selectEarningUSD = `SELECT SUM(amount) as total FROM transactions WHERE receiverid = ? and currency = ? and (type = ? or type = ?) and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())`;
        let resultEarningUSD = await Qry(selectEarningUSD, [
          authUser,
          "USD",
          "Level 1 Bonus",
          "Level 2 Bonus",
          i,
        ]);

        if (resultEarningUSD[0].total === null) {
          resultEarningUSD[0].total = 0;
        }

        const selectRefundedUSD = `SELECT SUM(amount) as total FROM transactions WHERE receiverid = ? and currency = ? and (type = ? or type = ?) and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())`;
        let resultRefundedUSD = await Qry(selectRefundedUSD, [
          authUser,
          "USD",
          "Level 1 Bonus Deducted",
          "Level 2 Bonus Deducted",
          i,
        ]);

        if (resultRefundedUSD[0].total === null) {
          resultRefundedUSD[0].total = 0;
        }

        earningEurArray.push(
          resultEarningEUR[0].total - resultRefundedUSD[0].total
        );
        earningUsdArray.push(
          resultEarningUSD[0].total - resultRefundedEUR[0].total
        );
      }

      let earningGraph = {
        eur: earningEurArray,
        usd: earningUsdArray,
        month: monthNameArray1,
      };
      // end monthly graph

      let dashboardData = {
        lifeTImeEarning: lifeTImeEarning,
        lastMonthEarning: lastMonthEarning,
        totalPayment: totalPayment,
        totalEarning: totalEarning,
        currentPayoutPer: currentPayoutPer,
        nextPayoutPer: nextPayoutPer,
        personalActiveSale: personalActiveSale,
        uniLevelData: uniLevelData,
        qualificationCriteria: qualificationCriteria,
        totalNewSale: totalNewSale,
        // referralNewUserData: referralNewUserData,
        newSaleGraph: newSaleGraph,
        activeCustomersGraph: activeCustomersGraph,
        earningGraph: earningGraph,
        conversionRate: conversionRate,
        progressBar: progressBar,
        cSymbol: cSymbol,

      };

      res.status(200).json({
        status: "success",
        dashboardData: dashboardData,
      });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({ status: "error", message: e.message });
  }
};

exports.teamusers = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const selectTreeQuery = `SELECT * FROM binarytree where userid = ?`;
      const selectTreeResult = await Qry(selectTreeQuery, [authUser]);
      let binaryTeam = selectTreeResult[0].binary_team;
      let binaryTeamArray = binaryTeam.split(",").map(Number);
      let data = [];

      for (const user of binaryTeamArray) {
        const selectUserQuery = `SELECT id, username, randomcode FROM usersdata where id = ?`;
        const selectUserResult = await Qry(selectUserQuery, [user]);
        data.push(selectUserResult[0]);
      }

      res.status(200).json({
        status: "success",
        data: data,
      });
      await emptyArray(data);
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.updatelanguage = async (req, res) => {  
  try {

    const authUser = await checkAuthorization(req, res);
    if (authUser) {

      const postData = req.body;
      let language = postData.language;

      const selectUserQuery = `SELECT * FROM usersdata where id = ?`;
      const selectUserResult = await Qry(selectUserQuery, [authUser]);

      let data = {
        language: language,
      };

      const updateData = await updateCustomer(selectUserResult[0].customerid, data);
      
      const updateUser = await Qry(
        "update usersdata set language = ?, language_status = ? where id = ?",
        [language, 1, authUser]
      );

      return Response.resWith202(res, 'Language has been updated successfully.');
    }
  } catch (error) {
    
    console.error("Error:", error);  
    return Response.resWith422(res, "Something went wrong");
  }
};

exports.news = async (req, res) => {
  try {

    const authUser = await checkAuthorization(req, res);
    if (authUser) {

      const selectnewsQuery = `SELECT * FROM news ORDER BY id DESC`;
      const selectnewsResult = await Qry(selectnewsQuery);

      let imageUrl = backoffice_link + "uploads/news/";

      var final_response = {
        news: selectnewsResult,
        imageUrl: imageUrl
      };
      return Response.resWith202(res, 'success.', final_response);
    }
  } catch (error) {
    
    console.error("Error:", error);  
    return Response.resWith422(res, "Something went wrong");
  }
};

exports.singlenews = async (req, res) => {
  try {
    const postData = req.body;
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      let id = postData.newsid;
      const selectnewsQuery = `SELECT * FROM news where id = ?`;
      const selectnewsResult = await Qry(selectnewsQuery, [id]);

      return Response.resWith202(res, 'success.', {news: selectnewsResult});
    }
  } catch (error) {
    console.error("Error:", error);  
    return Response.resWith422(res, "Something went wrong");
  }
};

exports.binarypointsreport = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const pointsSelect = await Qry(`
      SELECT p.*, ud.username 
      FROM points p
      left join usersdata ud on p.sender_id = ud.id
      WHERE JSON_SEARCH(p.receiver_ids, 'one', '${authUser}', NULL, '$.receiver_ids')
      IS NOT NULL
      ORDER BY id DESC
    `);

      const pointsdbData = pointsSelect;
      const pointsarray = { enteries: pointsdbData };

      if (pointsdbData.length > 0) {
        res.status(200).json({ status: "success", data: pointsarray });
      } else {
        pointsarray.enteries = [];
        res.status(200).json({ status: "success", data: pointsarray });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.subscriptionreport = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const subscriptionSelect = await Qry(`
      SELECT * 
      FROM new_packages
      WHERE userid = '${authUser}'
    `);

      const subscriptiondbData = subscriptionSelect;
      const subscriptionarray = { enteries: subscriptiondbData };

      if (subscriptiondbData.length > 0) {
        res.status(200).json({ status: "success", data: subscriptionarray });
      } else {
        subscriptionarray.enteries = [];
        res.status(200).json({ status: "success", data: subscriptionarray });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.personalreferrals = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const referralSelect = await Qry(`
      SELECT ud.username, ud.firstname, ud.lastname, ud.status, ud.country, ud.mobile, ud.email, ud.leg_position, ud.picture, ud.subscription_status, 
      np.pkg_name, np.nextBillingAt 
      FROM usersdata ud
      left join new_packages np on ud.id = np.userid
      WHERE sponsorid = '${authUser}'
      ORDER BY ud.id DESC
    `);

      const referraldbData = referralSelect;
      const referralArray = { enteries: referraldbData };

      if (referraldbData.length > 0) {
        referralArray.picturelink = `${backoffice_link}uploads/userprofile/`;
        res.status(200).json({ status: "success", data: referralArray });
      } else {
        const referralArray = { enteries: [] };
        res.status(200).json({
          status: "error",
          data: referralArray,
          message: "no referral found",
        });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.residuelreport = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const residuelSelect = await Qry(`
      SELECT tr.*, ra.name 
      FROM transactions tr
      left join rank ra on tr.rankid = ra.id
      WHERE receiverid = '${authUser}' and
      type = 'Binary Bonus'
      ORDER BY id DESC
    `);

      const residueldbData = residuelSelect;
      const residuelArray = { enteries: residueldbData };

      if (residueldbData.length > 0) {
        res.status(200).json({ status: "success", data: residuelArray });
      } else {
        const residuelArray = { enteries: [] };
        res.status(200).json({
          status: "error",
          data: residuelArray,
          message: "no referral found",
        });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.previuosmonthrecord = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const selectPreviousRecordQuery = `
      SELECT pre.*, ud.username
      FROM previous_record pre
      left join usersdata ud on pre.userid = ud.id
      WHERE userid = ? ORDER BY id DESC`;
      const selectPreviousRecordResult = await Qry(selectPreviousRecordQuery, [
        authUser,
      ]);

      res.status(200).json({
        status: "success",
        data: selectPreviousRecordResult,
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.payout = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const selectPreviousRecordQuery = `
      SELECT tr.*, ud.username, ud.email
      FROM transactions tr
      left join usersdata ud on tr.receiverid = ud.id
      WHERE receiverid = ? and type = ? ORDER BY id DESC`;
      let selectPreviousRecordResult = await Qry(selectPreviousRecordQuery, [
        authUser,
        "Payout",
      ]);

      const selectSumDataQuery = `SELECT SUM(final_amount) as total FROM transactions WHERE receiverid = ? and type = ?`;
      const selectSumDataResult = await Qry(selectSumDataQuery, [
        authUser,
        "Payout",
      ]);

      let allTimePayout = selectSumDataResult[0].total;

      if (allTimePayout === null || allTimePayout === "") {
        allTimePayout = 0;
      }

      let obj = {
        allTimePayout: allTimePayout,
      };

      const selectUserDataQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectUserDataResult = await Qry(selectUserDataQuery, [authUser]);


      let usdBalance = selectUserDataResult[0].current_balance_usd_lastmonth;
      let eurBalance = selectUserDataResult[0].current_balance_eur_lastmonth;

      let conversion_usd_to_eur = await settings_data("conversion1");
      let conversion_eur_to_usd = await settings_data("conversion");

      let totalUsdBalance =
        usdBalance + eurBalance * parseFloat(conversion_eur_to_usd[0].keyvalue);
      let totalEurBalance =
        eurBalance + usdBalance * parseFloat(conversion_usd_to_eur[0].keyvalue);

      let payoutAmountTocheck = 0;
      let final_amount = 0;
      let flatFee = await settings_data("payout_flat_fee");
      let per = await settings_data("payout_percentage_fee");
      let payout_fee = "";
      let payoutmethod = "";
      let status = "";
      let currency = "";

      if (
        selectUserDataResult[0].bank_account_title !== null &&
        selectUserDataResult[0].wallet_address === null &&
        selectUserDataResult[0].outside_bank_account_title === null &&
        selectUserDataResult[0].bank_account_iban === null
      ) {
        payoutAmountTocheck = totalEurBalance;
        final_amount = payoutAmountTocheck - parseInt(flatFee[0].keyvalue);
        payout_fee = flatFee[0].keyvalue;
        payoutmethod = "Bank";
        currency = "EUR";
      } else if (
        selectUserDataResult[0].wallet_address !== null &&
        selectUserDataResult[0].bank_account_title === null &&
        selectUserDataResult[0].outside_bank_account_title === null
      ) {
        payoutAmountTocheck = totalUsdBalance;
        final_amount =
          payoutAmountTocheck -
          (payoutAmountTocheck * parseFloat(per[0].keyvalue)) / 100;
        payout_fee = per[0].keyvalue;
        payoutmethod = "Crypto";
        currency = "USD";
      }

      if (
        selectUserDataResult[0].bank_account_title === null &&
        selectUserDataResult[0].wallet_address === null &&
        selectUserDataResult[0].outside_bank_account_title !== null &&
        selectUserDataResult[0].outside_bank_account_number === null
      ) {
        payoutAmountTocheck = totalUsdBalance;
        final_amount = payoutAmountTocheck - parseInt(flatFee[0].keyvalue);
        payout_fee = flatFee[0].keyvalue;
        payoutmethod = "Bank";
        currency = "USD";
      }

      if (selectUserDataResult[0]?.current_balance_usd_payout || selectUserDataResult[0]?.current_balance_eur_payout) {
        payoutAmountTocheck = (selectUserDataResult[0]?.current_balance_usd_payout * 0.88) + (selectUserDataResult[0]?.current_balance_eur_payout)
        final_amount = payoutAmountTocheck - parseInt(flatFee[0].keyvalue);
        currency = "EUR";
        status = "Pending";
      } else if (payoutAmountTocheck < 30) {
        status = "Unpaid";
      } else {
        status = "Pending";
      }
      if (selectPreviousRecordResult?.length < 1) {
        selectPreviousRecordResult = []
      }
      if (payoutAmountTocheck !== 0) {
        const currentDate = new Date();
        const isoString = currentDate.toISOString();

        let obj1 = {
          id: 0,
          approvedat: isoString,
          amount: payoutAmountTocheck,
          final_amount: final_amount,
          payoutmethod: payoutmethod,
          payout_fee: payout_fee,
          fee: payout_fee,
          bank_account_title: "*******",
          bank_account_iban: "*******",
          bank_account_bic: "*******",
          bank_account_country: "*******",
          status: status,
          createdat: "2024-04-15T07:27:49.000Z",
          currency: currency,
        };
        selectPreviousRecordResult.unshift(obj1);

      }

      res.status(200).json({
        status: "success",
        data: selectPreviousRecordResult,
        obj: obj,
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.updatereferralside = async (req, res) => {
  const postData = req.body;
  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      let side = postData.referral_side;

      if (side === "L" || side === "R") {
        const updateUserQuery = `UPDATE usersdata SET referral_side = ? WHERE id = ?`;
        const updateUserParams = [side, authUser];
        const updateUserResult = await Qry(updateUserQuery, updateUserParams);

        if (updateUserResult.affectedRows > 0) {
          const selectUserQuery = `select * from usersdata where id = ?`;
          const selectUserResult = await Qry(selectUserQuery, [authUser]);

          let side1;
          let side2;
          if (selectUserResult[0].referral_side === "L") {
            side1 = "Right";
            side2 = "Left";
          } else {
            side2 = "Right";
            side1 = "Left";
          }

          logger.info(
            `User ${selectUserResult[0].username} has updated referral side from ${side1} to ${side2} successfully`,
            { type: "user" }
          );

          res.status(200).json({
            status: "success",
            message: "Referral side has been updated successfully",
          });
        } else {
          res.status(500).json({
            status: "error",
            message: "Something went wrong. Please try again later.",
          });
        }
      } else {
        res
          .status(200)
          .json({ status: "error", message: "Invalid referral side." });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.updatepayoutdetails = async (req, res) => {
  const postData = req.body;
  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const payoutType = postData.type;

      if (payoutType === "Bank") {
        const country = postData.country;
        const bankAccountName = postData.bank_account_name;
        const bankAccountBIC = postData.bank_account_bic;
        const bankAccountIBAN = postData.bank_account_iban;
        const bankAccountAddress = postData.bank_account_address;
        const bankAccountCity = postData.bank_account_city;
        const bankAccountZipCode = postData.bank_account_zip_code;
        const paymentCountry = postData.payment_country;

        const selectUserQuery = `select * from usersdata where id = ?`;
        const selectUserResult = await Qry(selectUserQuery, [authUser]);

        const insertPayoutRequest = await Qry(
          "INSERT INTO `payout_information_request` (`userid`, `bank_account_title`, `bank_account_country`, `bank_account_iban`, `bank_account_bic`, `bank_account_address`, `bank_account_city`, `bank_account_zip_code`, `payout_country`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            authUser,
            bankAccountName,
            country,
            bankAccountIBAN,
            bankAccountBIC,
            bankAccountAddress,
            bankAccountCity,
            bankAccountZipCode,
            paymentCountry,
          ]
        );
        if (insertPayoutRequest.affectedRows > 0) {
          logger.info(
            `User ${selectUserResult[0].username} has updated payout details Account Title from ${selectUserResult[0].bank_account_title} to ${bankAccountName}, IBAN from ${selectUserResult[0].bank_account_iban} to ${bankAccountIBAN}, BIC from ${selectUserResult[0].bank_account_bic} to ${bankAccountBIC} and Country from ${selectUserResult[0].bank_account_country} to ${country}`,
            { type: "user" }
          );

          res.status(200).json({
            status: "success",
            message:
              "Your request has been submitted successfully to admin, it will be verify soon.",
          });
        }
      } else if (payoutType === "Crypto") {
        const address = postData.wallet_address;

        const selectUserQuery = `select * from usersdata where id = ?`;
        const selectUserResult = await Qry(selectUserQuery, [authUser]);

        const insertPayoutRequest = await Qry(
          "INSERT INTO `payout_information_request` (`userid`, `wallet_address`) VALUES (?, ?)",
          [authUser, address]
        );
        if (insertPayoutRequest.affectedRows > 0) {
          logger.info(
            `User ${selectUserResult[0].username} has updated wallet address from ${selectUserResult[0].wallet_address} to ${address}`,
            { type: "user" }
          );

          res.status(200).json({
            status: "success",
            message:
              "Your payout detail request has been submit to admin successfully. It will be verify soon.",
          });
        }
      } else if (payoutType === "Bank_out_ue") {
        const country = postData.country;
        const bankAccountName = postData.bank_account_name;
        const bankAccountNumber = postData.bank_account_number;
        const bankAccountSwiftCode = postData.bank_account_swift_code;
        const bankAccountRouting = postData.bank_account_routing;
        const bankAccountAddress = postData.bank_account_address;
        const bankAccountCity = postData.bank_account_city;
        const bankAccountZipCode = postData.bank_account_zip_code;
        const paymentCountry = postData.payment_country;

        const selectUserQuery = `select * from usersdata where id = ?`;
        const selectUserResult = await Qry(selectUserQuery, [authUser]);

        const insertPayoutRequest = await Qry(
          "INSERT INTO `payout_information_request` (`userid`, `outside_bank_account_title`, `outside_bank_account_country`, `outside_bank_account_number`, `outside_bank_account_swift_code`, `outside_bank_account_routing`, `outside_bank_account_address`, `outside_bank_account_city`, `outside_bank_account_zip_code`, `outside_payout_country`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            authUser,
            bankAccountName,
            country,
            bankAccountNumber,
            bankAccountSwiftCode,
            bankAccountRouting,
            bankAccountAddress,
            bankAccountCity,
            bankAccountZipCode,
            paymentCountry,
          ]
        );
        if (insertPayoutRequest.affectedRows > 0) {
          logger.info(
            `User ${selectUserResult[0].username} has updated payout details Account Title from ${selectUserResult[0].outside_bank_account_title} to ${bankAccountName}, Account Number from ${selectUserResult[0].outside_bank_account_number} to ${bankAccountNumber}, Swift Code from ${selectUserResult[0].outside_bank_account_swift_code} to ${bankAccountSwiftCode}, Account Routing from ${selectUserResult[0].outside_bank_account_routing} to ${bankAccountRouting}, Address from ${selectUserResult[0].outside_bank_account_address} to ${bankAccountAddress}, City from ${selectUserResult[0].outside_bank_account_city} to ${bankAccountCity}, Zip Code from ${selectUserResult[0].outside_bank_account_zip_code} to ${bankAccountZipCode} and Country from ${selectUserResult[0].outside_bank_account_country} to ${country}`,
            { type: "user" }
          );

          res.status(200).json({
            status: "success",
            message:
              "Your request has been submitted successfully to admin, it will be verify soon.",
          });
        }
      } else {
        res
          .status(400)
          .json({ status: "error", message: "Invalid payout type selected." });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.payoutupdaterequest = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const updateUser = await Qry(
        "update usersdata set payout_details_update_request = ? where id = ?",
        [1, authUser]
      );

      const insertPayoutRequestResult = await Qry(
        "INSERT INTO `payout_information_request`(`userid`) VALUES (?)",
        [authUser]
      );

      if (insertPayoutRequestResult.affectedRows > 0) {
        const selectUserQuery = `select * from usersdata where id = ?`;
        const selectUserResult = await Qry(selectUserQuery, [authUser]);

        logger.info(
          `User ${selectUserResult[0].username} has requested to update its payout details`,
          { type: "user" }
        );

        res.status(200).json({
          status: "success",
          message:
            "Your request has been submitted successfully to admin, it will be veriy soon. Then you can update your payout details. Thank You",
        });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.binarytree = async (req, res) => {
  try {
    const postData = req.body;
    let userrandomcode = postData.userrandomcode;
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const selectUserDataQuery = `SELECT * FROM usersdata WHERE randomcode = ?`;
      const selectUsersDataResult = await Qry(selectUserDataQuery, [
        userrandomcode,
      ]);

      // start user1 data
      let user1_data = await binary_tree_get_users_data(
        authUser,
        selectUsersDataResult[0].id
      );
      let level1_users = await binary_tree_get_users(
        selectUsersDataResult[0].id
      );
      // end user1 data

      // start user2 data
      let user2_id = level1_users[0]?.userid;
      let user2_data = await binary_tree_get_users_data(authUser, user2_id);
      // end user2 data

      // start user3 data
      let user3_id = level1_users[1]?.userid;
      let user3_data = await binary_tree_get_users_data(authUser, user3_id);
      // end user3 data

      let level2_leg1_users = await binary_tree_get_users(user2_id);

      // start user4 data
      let user4_id = level2_leg1_users[0]?.userid;
      let user4_data = await binary_tree_get_users_data(authUser, user4_id);
      // end user4 data

      // start user5 data
      let user5_id = level2_leg1_users[1]?.userid;
      let user5_data = await binary_tree_get_users_data(authUser, user5_id);
      // end user5 data

      let level2_leg2_users = await binary_tree_get_users(user3_id);

      // start user6 data
      let user6_id = level2_leg2_users[0]?.userid;
      let user6_data = await binary_tree_get_users_data(authUser, user6_id);
      // end user6 data

      // start user7 data
      let user7_id = level2_leg2_users[1]?.userid;
      let user7_data = await binary_tree_get_users_data(authUser, user7_id);
      // end user7 data

      data = {
        user1: user1_data,
        user2: user2_data,
        user3: user3_data,
        user4: user4_data,
        user5: user5_data,
        user6: user6_data,
        user7: user7_data,
        imageUrl: backoffice_link + "uploads/userprofile/",
      };

      res.status(200).json({
        status: "success",
        data: data,
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.singleuserbinarytreedata = async (req, res) => {
  try {
    const postData = req.body;
    let treeuserid = postData.id;
    let topuserid = postData.topid;
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const selectUserDataQuery = `SELECT COUNT(*) as total FROM usersdata WHERE id = ? and sponsorid = ?`;
      const selectUserDataResult = await Qry(selectUserDataQuery, [
        treeuserid,
        topuserid,
      ]);
      let countResult = selectUserDataResult[0].total;

      // start rank data and user data
      let userRankSponsorData = null;
      let crown = false;

      if (countResult > 0) {
        crown = true;
      }

      const userSelectQuery = `
        SELECT ud.id, ud.username, ud.rank, ud.novarank, ud.firstname, ud.lastname, ud.user_type, ud.sponsorid, ud.email, ud.mobile, ud.randomcode,
        rn.name AS rank_name,
        ltr.name AS life_time_rank_name,
        nrn.name AS nova_rank_name
        FROM usersdata ud
        LEFT JOIN rank rn ON ud.rank = rn.id
        LEFT JOIN rank ltr ON ud.life_time_rank = ltr.id
        LEFT JOIN novafree_rank nrn ON ud.novarank = nrn.id
        WHERE ud.id = ?
    `;
      const userRanksResult = await Qry(userSelectQuery, [treeuserid]);
      userRankSponsorData = userRanksResult[0];
      if (userRanksResult[0]?.sponsorid !== "") {
        const selectSponsorDataQuery = `SELECT username FROM usersdata WHERE id = ?`;
        const selectSponsorDataResult = await Qry(selectSponsorDataQuery, [
          userRanksResult[0]?.sponsorid,
        ]);
        userRankSponsorData.sponsor_name = selectSponsorDataResult[0].username;

        const selectTreeDataQuery = `SELECT pid FROM binarytree WHERE userid = ?`;
        const selectTreeDataResult = await Qry(selectTreeDataQuery, [
          treeuserid,
        ]);

        const selectUserDataRandomCodeQuery = `SELECT randomcode FROM usersdata WHERE id = ?`;
        const selectUserDataRandomCodeResult = await Qry(
          selectUserDataRandomCodeQuery,
          [selectTreeDataResult[0].pid]
        );
        userRankSponsorData.levelUpRandomCode =
          selectUserDataRandomCodeResult[0].randomcode;
      }

      // start sum of left and right points of current month
      let obj_org_points = await current_month_organization_points_function(
        treeuserid
      );
      let organizationLeftPointsCount = obj_org_points.leftOrganizationPoints;
      let organizationRightPointsCount = obj_org_points.rightOrganizationPoints;
      // end sum of left and right points of current month

      // start sum of left and right personal active of current month
      let obj_direct_active = await current_month_active_referrals_function(
        treeuserid
      );
      let personalActiveLeftCount = obj_direct_active.leftPersonalActiveMembers;
      let personalActiveRightCount =
        obj_direct_active.rightPersonalActiveMembers;
      // end sum of left and right personal active of current month

      res.status(200).json({
        status: "success",
        data: {
          userRankSponsorData: userRankSponsorData,
          binaryPoints: {
            organizationLeftPointsCount: organizationLeftPointsCount,
            organizationRightPointsCount: organizationRightPointsCount,
          },
          activeReferrals: {
            personalActiveLeftCount: personalActiveLeftCount,
            personalActiveRightCount: personalActiveRightCount,
          },
          crown: crown,
        },
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.eventregistration = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      res.status(200).json({
        status: "success",
        message: "ok",
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.csvupgradelimits = async (req, res) => {
  try {
    const csvFilePath = "routes/csvfiles/upgrade_limits.csv"; // Replace with your CSV file path

    // Create an array to store the parsed CSV data
    const data = [];

    // Read and parse the CSV file
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => {
        data.push(row);
      })
      .on("end", async () => {
        // The CSV file has been fully parsed. You can now work with the data array.

        let x = 1;
        let j = 1;
        for (const limitsData of data) {
          let plan_id = limitsData.plan_id;
          let email = limitsData.email;
          let connexion = parseInt(limitsData.connexion);
          let limits = limitsData.limits;
          let sid = limitsData.sid;

          const selectUser = await Qry(
            "select * from usersdata where email = ?",
            [email]
          );

          const selectPkg = await Qry(
            "select * from new_packages where userid = ?",
            [selectUser[0].id]
          );

          const selectUserLimits = await Qry(
            "select * from users_limits where userid = ?",
            [selectUser[0].id]
          );

          const selectLimits = await Qry(
            "select * from chargbee_packages_limits where pkg_id = ?",
            [limits]
          );

          const updateUser = await Qry(
            "update usersdata set connection_type = ? where id = ?",
            [connexion, selectUser[0].id]
          );
          const updatePkg = await Qry(
            "update new_packages set planid = ? where userid = ? and type != ?",
            [plan_id, selectUser[0].id, "distributor"]
          );
          const updateUsersLimits = await Qry(
            "update users_limits set fb_no_crm_group = ?, fb_no_stages_group = ?, fb_no_friend_request = ?, fb_no_crm_message = ?, fb_no_ai_comment = ?, fb_advanced_novadata = ?, fb_no_friend_requests_received = ?, fb_no_of_birthday_wishes = ?, insta_no_crm_group = ?, insta_no_stages_group = ?, insta_no_friend_request = ?, insta_no_crm_message = ?, insta_no_ai_comment = ?, insta_advanced_novadata = ?, insta_no_friend_requests_received = ?, insta_no_of_birthday_wishes = ? where userid = ?",
            [
              selectLimits[0].fb_no_crm_group,
              selectLimits[0].fb_no_stages_group,
              selectLimits[0].fb_no_friend_request,
              selectLimits[0].fb_no_crm_message,
              selectLimits[0].fb_no_ai_comment,
              selectLimits[0].fb_advanced_novadata,
              selectLimits[0].fb_no_friend_requests_received,
              selectLimits[0].fb_no_of_birthday_wishes,
              selectLimits[0].inst_no_crm_group,
              selectLimits[0].inst_no_stages_group,
              selectLimits[0].inst_no_friend_request,
              selectLimits[0].inst_no_crm_message,
              selectLimits[0].inst_no_ai_comment,
              selectLimits[0].inst_advanced_novadata,
              selectLimits[0].inst_no_friend_requests_received,
              selectLimits[0].inst_no_of_birthday_wishes,
              selectUser[0].id,
            ]
          );

          if (x === 1030) {
            const updateSetting = await Qry(
              "update setting set keyvalue = ? where id = ?",
              [1, 33]
            );
          }

          x = x + 1;
        }
      });

    res.status(200).json({
      status: "success",
      message: "ok",
    });
  } catch (e) { }
};

exports.csvrenewal = async (req, res) => {
  try {
    const csvFilePath = "routes/csvfiles/paid_data.csv"; // Replace with your CSV file path

    // Create an array to store the parsed CSV data
    const data = [];

    // Read and parse the CSV file
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => {
        data.push(row);
      })
      .on("end", async () => {
        // The CSV file has been fully parsed. You can now work with the data array.

        let x = 1;
        for (const userdata of data) {
          let cid = userdata.customerid;
          let amount = userdata.amount;
          let currencyCode = userdata.currency;

          const selectUserDataResult = await Qry(
            "select * from usersdata where customerid = ?",
            [cid]
          );

          if (
            selectUserDataResult[0].trial === "No" &&
            !selectUserDataResult[0].website
          ) {
            const selectTra = await Qry(
              "select * from transactions where senderid = ? and type = ? and MONTH(createdat) = 7",
              [selectUserDataResult[0].id, "Level 1 Bonus"]
            );

            if (selectTra.length === 0) {
              // start level bonus
              let i = 1;
              let s_id = selectUserDataResult[0].sponsorid;
              while (i <= 2 && s_id !== 0) {
                const sponsorData = await Qry(
                  "SELECT * FROM usersdata WHERE id = ?",
                  [s_id]
                );

                const insertTransactionData = await Qry(
                  "INSERT INTO transactions (receiverid, senderid, amount, details, type, event_type, currency, paid_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                  [
                    s_id,
                    selectUserDataResult[0].id,
                    0,
                    ``,
                    `Level ${i} Bonus`,
                    "subscription_renewed",
                    currencyCode,
                    amount,
                  ]
                );

                if (sponsorData[0].sponsorid == 0) {
                  if (i === 1) {
                    const insertTransactionData = await Qry(
                      "INSERT INTO transactions (receiverid, senderid, amount, details, type, event_type, currency, paid_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                      [
                        0,
                        selectUserDataResult[0].id,
                        0,
                        ``,
                        `Level 2 Bonus`,
                        "subscription_renewed",
                        currencyCode,
                        amount,
                      ]
                    );
                  }
                  s_id = 0;
                } else {
                  s_id = sponsorData[0].sponsorid;
                }

                i++;
              }
              // end level bonus

              // start pool bonus
              const settingsData = await Qry(
                "SELECT * FROM `setting` WHERE keyname IN (?)",
                ["conversion"]
              );

              const conversion = settingsData[0].keyvalue;
              let z = 1;
              while (z <= 3) {
                const poolData = await Qry("SELECT * from pool WHERE id = ?", [
                  z,
                ]);
                let poolPercentage = poolData[0].percentage;

                let amount1 = amount;
                if (currencyCode === "EUR") {
                  amount1 = amount * parseFloat(conversion);
                }

                let poolBonusAmount = (amount1 / 100) * poolPercentage;

                const updatePoolAmount = await Qry(
                  "UPDATE pool SET `amount` = amount + ?, `total_amount` = total_amount + ? WHERE id = ?",
                  [poolBonusAmount, poolBonusAmount, z]
                );

                const insertTransactionData = await Qry(
                  "INSERT INTO transactions (receiverid, senderid, amount, details, type, event_type, currency, paid_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                  [
                    0,
                    selectUserDataResult[0].id,
                    poolBonusAmount,
                    `$${poolBonusAmount} has been added successfully in pool ${z}.`,
                    `Pool ${z} Bonus Added`,
                    "subscription_renewed",
                    currencyCode,
                    amount,
                  ]
                );

                z++;
              }
              // end pool bonus

              x = x + 1;
            }
          }
        }
      });

    res.status(200).json({
      status: "success",
      message: "ok",
    });
  } catch (e) { }
};

exports.csv3 = async (req, res) => {
  try {
    const csvFilePath = "routes/csvfiles/commission_file3.csv"; // Replace with your CSV file path

    // Create an array to store the parsed CSV data
    const data = [];

    // Read and parse the CSV file
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => {
        data.push(row);
      })
      .on("end", async () => {
        // The CSV file has been fully parsed. You can now work with the data array.

        let x = 1;
        for (const userdata of data) {
          let username = userdata.username;
          let amount = userdata.amount;

          const selectUser = await Qry(
            "select * from usersdata where username = ?",
            [username]
          );

          let currency = "EUR";

          let userid = selectUser[0].id;
          let date = "2024-02-29 00:00:02";

          let insertTransaction = await Qry(
            "insert into transactions ( receiverid, senderid, amount, type, createdat) values ( ? , ? , ? , ? , ? )",
            [
              userid,
              0,
              parseFloat(amount),
              "Bonus February Sales Pending",
              date,
            ]
          );

          const updateUser = await Qry(
            "update usersdata set current_balance_eur_payout = current_balance_eur_payout + ?, withdrawal_status = ? where id = ?",
            [amount, 1, userid]
          );

          x = x + 1;
        }
      });

    res.status(200).json({
      status: "success",
      message: "ok",
    });
  } catch (e) { }
};

exports.csv4 = async (req, res) => {
  try {
    const csvFilePath = "routes/csvfiles/commission_file4.csv"; // Replace with your CSV file path

    // Create an array to store the parsed CSV data
    const data = [];

    // Read and parse the CSV file
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => {
        data.push(row);
      })
      .on("end", async () => {
        // The CSV file has been fully parsed. You can now work with the data array.

        let x = 1;
        for (const userdata of data) {
          let username = userdata.username;
          let amount = userdata.amount;

          const selectUser = await Qry(
            "select * from usersdata where username = ?",
            [username]
          );

          let currency = "EUR";

          let userid = selectUser[0].id;
          let date = "2024-02-29 00:00:02";

          let insertTransaction = await Qry(
            "insert into transactions ( receiverid, senderid, amount, type, createdat) values ( ? , ? , ? , ? , ? )",
            [
              userid,
              0,
              parseFloat(amount),
              "Bonus February Sales Pending",
              date,
            ]
          );

          const updateUser = await Qry(
            "update usersdata set current_balance_eur_payout = current_balance_eur_payout + ?, withdrawal_status = ? where id = ?",
            [amount, 1, userid]
          );

          x = x + 1;
        }
      });

    res.status(200).json({
      status: "success",
      message: "ok",
    });
  } catch (e) { }
};

exports.cronjobduplicateentries = async (req, res) => {
  try {
    const deleteDuplicateQuery = `DELETE p1
    FROM points p1
    INNER JOIN (
      SELECT sender_id, points, leg, type, period, receiver_ids, dat, MIN(id) AS min_id
      FROM points
      WHERE MONTH(dat) = 1
      GROUP BY sender_id, points, leg, type, period, receiver_ids, dat
      HAVING COUNT(*) > 1
    ) p2 ON p1.sender_id = p2.sender_id
        AND p1.points = p2.points
        AND p1.leg = p2.leg
        AND p1.type = p2.type
        AND p1.period = p2.period
        AND p1.receiver_ids = p2.receiver_ids
        AND p1.dat = p2.dat
        AND p1.id <> p2.min_id`;
    const selectRankSummaryResult = await Qry(deleteDuplicateQuery);

    res.status(200).json({
      status: "success",
      message: "ok",
    });
  } catch (e) { }
};

exports.cronjobautocoupon = async (req, res) => {
  try {
    const subscriptionDetails = (subscriptionId) => {
      return new Promise((resolve, reject) => {
        chargebee.subscription
          .retrieve(subscriptionId)
          .request(function (error, result) {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          });
      });
    };

    const removeCoupon = (subscriptionId) => {
      return new Promise((resolve, reject) => {
        chargebee.subscription
          .remove_coupons(subscriptionId, {})
          .request(function (error, result) {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          });
      });
    };

    const addCoupon = (subscriptionId, couponCode) => {
      return new Promise((resolve, reject) => {
        chargebee.subscription
          .update_for_items(subscriptionId, {
            coupon_ids: [couponCode],
          })
          .request(function (error, result) {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          });
      });
    };

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const previousMonth = ((currentMonth + 11) % 12) + 1;

    const selectUserQuery = `SELECT ud.id, ud.username, np.subscriptionid, np.nextBillingAt FROM usersdata ud
    left join new_packages np on np.userid = ud.id
     WHERE ud.usertype = ? and ud.user_type = ? and np.type = ? order by ud.id asc limit 560, 574`;
    const selectUserResult = await Qry(selectUserQuery, [
      "user",
      "Distributor",
      "package",
    ]);
    let x = 1;

    selectUserResult.map(async (user) => {
      let removeCouponData;
      let addCouponData;
      let subscriptionData;

      const selectRankSummaryQuery = `SELECT * FROM rank_summary WHERE userid = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now()) - 1 ORDER BY id DESC limit 1`;
      const selectRankSummaryResult = await Qry(selectRankSummaryQuery, [
        user.id,
        "NovaFree Rank",
        previousMonth,
      ]);

      if (selectRankSummaryResult.length > 0) {
        let novarank = selectRankSummaryResult[0].new_rank;
        let subscriptionId = user.subscriptionid;

        const selectNovaRankQuery = `SELECT * FROM novafree_rank WHERE id = ?`;
        const selectNovaRankResult = await Qry(selectNovaRankQuery, [novarank]);

        let couponCode = selectNovaRankResult[0].coupon;

        if (couponCode !== null) {
          try {
            if (user.username !== "novalya") {
              subscriptionData = await subscriptionDetails(subscriptionId);
              const isCoupon = subscriptionData?.subscription?.coupons;
              if (isCoupon !== undefined) {
                removeCouponData = await removeCoupon(subscriptionId);
              }

              if (novarank > 0) {
                addCouponData = await addCoupon(subscriptionId, couponCode);
                await Qry(
                  `update new_packages set coupon = ? where subscriptionid = ?`,
                  [couponCode, subscriptionId]
                );
                const insertCronJob = await Qry(
                  "INSERT INTO `autocouponsummary`(`userid`, `coupon`) VALUES (?,?)",
                  [user.id, couponCode]
                );

                x++;
              }
            }
          } catch (error) { }
        }
      }
    });

    res.status(200).json({
      status: "success",
      message: "okkkk",
    });
  } catch (e) { }
};

exports.cronjobnovarank = async (req, res) => {
  try {
    const selectUserQuery = `SELECT * FROM usersdata WHERE usertype = ? and user_type = ?`;
    const selectUserResult = await Qry(selectUserQuery, [
      "user",
      "Distributor",
    ]);

    // let data = [];

    for (const user of selectUserResult) {
      // start count of left and right user
      let direct_active_referrals_obj =
        await current_month_active_referrals_function(user.id);
      let directActiveLeftUsers =
        direct_active_referrals_obj.leftPersonalActiveMembers;
      let directActiveRightUsers =
        direct_active_referrals_obj.rightPersonalActiveMembers;

      let totalDirectActiveUsers =
        directActiveLeftUsers + directActiveRightUsers;
      // end start count of left and right user

      // start Sum of left and right Referral Points
      let referral_points_obj = await current_month_referral_points_function(
        user.id
      );
      let leftReferralPoints = referral_points_obj.leftReferralPoints;
      let rightReferralPoints = referral_points_obj.rightReferralPoints;

      let totalReferralPoints = leftReferralPoints + rightReferralPoints;
      // end start Sum of left and right Referral Points

      // data.push('total Direct Active Users : ' + totalDirectActiveUsers + ' total Referral Points : ' + totalReferralPoints);

      let rank = 0;
      let currentRrank = user.novarank;
      let userType = user.user_type;
      let currentLifeTimeRank = user.nova_life_time_rank;

      if (
        totalDirectActiveUsers >= 3 &&
        totalReferralPoints >= 150 &&
        userType == "Distributor"
      ) {
        rank = 1;
      }

      if (
        totalDirectActiveUsers >= 3 &&
        totalReferralPoints >= 200 &&
        userType == "Distributor"
      ) {
        rank = 2;
      }

      if (
        totalDirectActiveUsers >= 3 &&
        totalReferralPoints >= 250 &&
        userType == "Distributor"
      ) {
        rank = 3;
      }

      if (currentRrank != rank) {
        const insertRankSummaryResult = await Qry(
          "INSERT INTO `rank_summary`(`userid`, `old_rank`, `new_rank`, `type`) VALUES (?,?,?,?)",
          [user.id, currentRrank, rank, "NovaFree Rank"]
        );
        const updateUser = await Qry(
          "update usersdata set novarank = ? where id = ?",
          [rank, user.id]
        );

        const selectCurrentRankQuery = `select * from novafree_rank where id = ?`;
        const selectCurrentRankResult = await Qry(selectCurrentRankQuery, [
          currentRrank,
        ]);

        const selectnewRankQuery = `select * from novafree_rank where id = ?`;
        const selectnewRankResult = await Qry(selectnewRankQuery, [rank]);

        logger.info(
          `User ${user.username} NovaFree rank has been updated from ${selectCurrentRankResult[0].name} to ${selectnewRankResult[0].name}`,
          { type: "user" }
        );

        if (rank > currentLifeTimeRank) {
          const updateUser = await Qry(
            "update usersdata set nova_life_time_rank = ? where id = ?",
            [rank, user.id]
          );
        }
      }
    }

    res.status(200).json({
      status: "success",
      message: "ok",
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.cronjobrank = async (req, res) => {
  try {
    // const insertCronJob = await Qry("INSERT INTO `dummy`(`d_data`) VALUES (?)", ['test cronjobrank']);

    const selectUserQuery = `SELECT * FROM usersdata WHERE usertype = ? and user_type = ?`;
    const selectUserResult = await Qry(selectUserQuery, [
      "user",
      "Distributor",
    ]);

    const currentDate = new Date();
    const currentDateOfMonth = currentDate.getDate();

    const settingsData = await Qry(
      "SELECT * FROM `setting` WHERE keyname IN (?)",
      ["check_binary_bonus_insert"]
    );

    const checkBinaryBonusInsert = parseInt(settingsData[0].keyvalue);

    // let data = [];

    for (const user of selectUserResult) {
      // start count of left and right user
      let direct_active_referrals_obj =
        await current_month_active_referrals_function(user.id);
      let directActiveLeftUsers =
        direct_active_referrals_obj.leftPersonalActiveMembers;
      let directActiveRightUsers =
        direct_active_referrals_obj.rightPersonalActiveMembers;

      // let totalDirectActiveUsers = directActiveLeftUsers + directActiveRightUsers;
      // end start count of left and right user

      // start Sum of left and right Referral Points
      // let referral_points_obj = await current_month_referral_points_function(user.id);
      // let leftReferralPoints = referral_points_obj.leftReferralPoints;
      // let rightReferralPoints = referral_points_obj.rightReferralPoints;

      // let totalReferralPoints = leftReferralPoints + rightReferralPoints;
      // end start Sum of left and right Referral Points

      // start Sum of left and right Binary Points
      let binary_points_obj = await current_month_organization_points_function(
        user.id
      );
      let leftBinaryPoints = binary_points_obj.leftOrganizationPoints;
      let rightBinaryPoints = binary_points_obj.rightOrganizationPoints;
      // end start Sum of left and right Binary Points

      // data.push('Left binary points are : ' + leftBinaryPoints + ' Right binary points are : ' + rightBinaryPoints);

      let rank = 0;
      let currentRrank = user.rank;
      let currentLifeTimeRank = user.life_time_rank;
      let userType = user.user_type;

      // start insert binary bonus in transaction as pending status

      // if (currentDateOfMonth === 1 && checkBinaryBonusInsert === 0 && currentRrank > 0) {

      //   const selectRankQuery = `SELECT * FROM rank where id = ?`;
      //   const selectRankResult = await Qry(selectRankQuery, [user.rank]);
      //   let residuelAmount = parseInt(selectRankResult[0].residuel);

      //   const insertTransactionsResult = await Qry("INSERT INTO `transactions`(`receiverid`, `rankid`, `amount`, `type`, `status`) VALUES (?,?,?,?,?)", [user.id, user.rank, residuelAmount, 'Binary Bonus', 'Pending']);

      // }

      // end insert binary bonus in transaction as pending status

      if (
        (directActiveLeftUsers >= 2 &&
          directActiveRightUsers >= 1 &&
          leftBinaryPoints >= 450 &&
          rightBinaryPoints >= 450 &&
          userType == "Distributor") ||
        (directActiveLeftUsers >= 1 &&
          directActiveRightUsers >= 2 &&
          leftBinaryPoints >= 450 &&
          rightBinaryPoints >= 450 &&
          userType == "Distributor")
      ) {
        rank = 1;
      }

      if (
        (directActiveLeftUsers >= 2 &&
          directActiveRightUsers >= 1 &&
          leftBinaryPoints >= 1620 &&
          rightBinaryPoints >= 1620 &&
          userType == "Distributor") ||
        (directActiveLeftUsers >= 1 &&
          directActiveRightUsers >= 2 &&
          leftBinaryPoints >= 1620 &&
          rightBinaryPoints >= 1620 &&
          userType == "Distributor")
      ) {
        rank = 2;
      }

      if (
        directActiveLeftUsers >= 2 &&
        directActiveRightUsers >= 2 &&
        leftBinaryPoints >= 4500 &&
        rightBinaryPoints >= 4500 &&
        userType == "Distributor"
      ) {
        rank = 3;
      }

      if (
        directActiveLeftUsers >= 3 &&
        directActiveRightUsers >= 3 &&
        leftBinaryPoints >= 11700 &&
        rightBinaryPoints >= 11700 &&
        userType == "Distributor"
      ) {
        rank = 4;
      }

      if (
        directActiveLeftUsers >= 5 &&
        directActiveRightUsers >= 5 &&
        leftBinaryPoints >= 36000 &&
        rightBinaryPoints >= 36000 &&
        userType == "Distributor"
      ) {
        rank = 5;
      }

      if (
        directActiveLeftUsers >= 8 &&
        directActiveRightUsers >= 8 &&
        leftBinaryPoints >= 90000 &&
        rightBinaryPoints >= 90000 &&
        userType == "Distributor"
      ) {
        rank = 6;
      }

      if (
        directActiveLeftUsers >= 15 &&
        directActiveRightUsers >= 15 &&
        leftBinaryPoints >= 225000 &&
        rightBinaryPoints >= 225000 &&
        userType == "Distributor"
      ) {
        rank = 7;
      }

      if (
        directActiveLeftUsers >= 25 &&
        directActiveRightUsers >= 25 &&
        leftBinaryPoints >= 450000 &&
        rightBinaryPoints >= 450000 &&
        userType == "Distributor"
      ) {
        rank = 8;
      }

      if (currentRrank != rank) {
        const insertRankSummaryResult = await Qry(
          "INSERT INTO `rank_summary`(`userid`, `old_rank`, `new_rank`, `type`) VALUES (?,?,?,?)",
          [user.id, currentRrank, rank, "Payout Rank"]
        );
        const updateUser = await Qry(
          "update usersdata set rank = ? where id = ?",
          [rank, user.id]
        );

        const selectCurrentRankQuery = `select * from rank where id = ?`;
        const selectCurrentRankResult = await Qry(selectCurrentRankQuery, [
          currentRrank,
        ]);

        const selectnewRankQuery = `select * from rank where id = ?`;
        const selectnewRankResult = await Qry(selectnewRankQuery, [rank]);

        logger.info(
          `User ${user.username} Payout rank has been updated from ${selectCurrentRankResult[0].name} to ${selectnewRankResult[0].name}`,
          { type: "user" }
        );

        if (rank > currentLifeTimeRank) {
          const updateUser = await Qry(
            "update usersdata set life_time_rank = ? where id = ?",
            [rank, user.id]
          );
        }
      }
    }

    const updateQuery = `UPDATE setting SET keyvalue = ? WHERE keyname = ?`;
    const updateParams = [1, "check_binary_bonus_insert"];
    await Qry(updateQuery, updateParams);

    res.status(200).json({
      status: "success",
      message: "ok",
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.binarybonuspreviousmonthrank = async (req, res) => {
  try {
    // const insertCronJob = await Qry("INSERT INTO `dummy`(`d_data`) VALUES (?)", ['test cronjobrank']);

    const selectUserQuery = `SELECT * FROM usersdata WHERE usertype = ? and user_type = ?`;
    const selectUserResult = await Qry(selectUserQuery, [
      "user",
      "Distributor",
    ]);

    // let data = [];

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const previousMonth = ((currentMonth + 11) % 12) + 1;
    let x = 1;
    for (const user of selectUserResult) {
      const selectRankSummaryQuery = `SELECT * FROM rank_summary WHERE userid = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now()) ORDER BY id DESC limit 1`;
      const selectRankSummaryResult = await Qry(selectRankSummaryQuery, [
        user.id,
        "Payout Rank",
        previousMonth,
      ]);
      if (selectRankSummaryResult.length > 0) {
        let rank = selectRankSummaryResult[0].new_rank;
        const selectRankQuery = `SELECT * FROM rank where id = ?`;
        const selectRankResult = await Qry(selectRankQuery, [rank]);
        let residuelAmount = parseInt(selectRankResult[0].residuel);

        const insertTransactionsResult = await Qry(
          "INSERT INTO `transactions`(`receiverid`, `rankid`, `amount`, `type`, `status`) VALUES (?,?,?,?,?)",
          [user.id, rank, residuelAmount, "Binary Bonus", "Pending"]
        );

        logger.info(
          `User ${user.username} has get Binary Bonus of amount ${residuelAmount} on base of rank ${selectRankResult[0].name}. Status of this binary bonus is pending, its not added to user current balance yet`,
          { type: "user" }
        );
      }
      x = x + 1;
    }

    res.status(200).json({
      status: "success",
      message: "ok",
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.cronjobpreviousmonth = async (req, res) => {
  try {
    function getMonthsInfo(num) {
      var currentDate = new Date();
      var currentMonth = currentDate.getMonth() + 1;
      var previousMonth = currentMonth - num;
      if (previousMonth < 1) {
        previousMonth += 12;
      }
      var previousMonthStr = previousMonth.toString().padStart(2, "0");
      return previousMonthStr;
    }
    let lastMonth = getMonthsInfo(1);

    const selectUserQuery = `SELECT * FROM usersdata where id = ?`;
    const selectUserResult = await Qry(selectUserQuery, [2305]);

    let x = 1;

    for (const user of selectUserResult) {
      // start Left Right binary points
      const leftOrganizationPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${user.id}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
      const leftOrganizationPointsResult = await Qry(
        leftOrganizationPointsQuery,
        ["L", "Binary Points", lastMonth]
      );

      const deductLeftOrganizationPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${user.id}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
      const deductLeftOrganizationPointsResult = await Qry(
        deductLeftOrganizationPointsQuery,
        ["L", "Deduct Binary Points", lastMonth]
      );

      const rightOrganizationPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${user.id}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
      const rightOrganizationPointsResult = await Qry(
        rightOrganizationPointsQuery,
        ["R", "Binary Points", lastMonth]
      );

      const deductRightOrganizationPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${user.id}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
      const deductRightOrganizationPointsResult = await Qry(
        deductRightOrganizationPointsQuery,
        ["R", "Deduct Binary Points", lastMonth]
      );

      const addAdminleftOrganizationPointsGraphQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${user.id}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
      const addAdminleftOrganizationPointsGraphResult = await Qry(
        addAdminleftOrganizationPointsGraphQuery,
        ["L", "Add Binary Points By Admin", lastMonth]
      );

      const addAdminRightOrganizationPointsGraphQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${user.id}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
      const addAdminRightOrganizationPointsGraphResult = await Qry(
        addAdminRightOrganizationPointsGraphQuery,
        ["R", "Add Binary Points By Admin", lastMonth]
      );

      const deductAdminleftOrganizationPointsGraphQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${user.id}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
      const deductAdminleftOrganizationPointsGraphResult = await Qry(
        deductAdminleftOrganizationPointsGraphQuery,
        ["L", "Deduct Binary Points By Admin", lastMonth]
      );

      const deductAdminRightOrganizationPointsGraphQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${user.id}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
      const deductAdminRightOrganizationPointsGraphResult = await Qry(
        deductAdminRightOrganizationPointsGraphQuery,
        ["R", "Deduct Binary Points By Admin", lastMonth]
      );

      if (
        leftOrganizationPointsResult[0].total === null ||
        leftOrganizationPointsResult[0].total === ""
      ) {
        leftOrganizationPointsResult[0].total = 0;
      }
      if (
        deductLeftOrganizationPointsResult[0].total === null ||
        deductLeftOrganizationPointsResult[0].total === ""
      ) {
        deductLeftOrganizationPointsResult[0].total = 0;
      }
      if (
        rightOrganizationPointsResult[0].total === null ||
        rightOrganizationPointsResult[0].total === ""
      ) {
        rightOrganizationPointsResult[0].total = 0;
      }
      if (
        deductRightOrganizationPointsResult[0].total === null ||
        deductRightOrganizationPointsResult[0].total === ""
      ) {
        deductRightOrganizationPointsResult[0].total = 0;
      }

      if (
        addAdminleftOrganizationPointsGraphResult[0].total === null ||
        addAdminleftOrganizationPointsGraphResult[0].total === ""
      ) {
        addAdminleftOrganizationPointsGraphResult[0].total = 0;
      }

      if (
        addAdminRightOrganizationPointsGraphResult[0].total === null ||
        addAdminRightOrganizationPointsGraphResult[0].total === ""
      ) {
        addAdminRightOrganizationPointsGraphResult[0].total = 0;
      }

      if (
        deductAdminleftOrganizationPointsGraphResult[0].total === null ||
        deductAdminleftOrganizationPointsGraphResult[0].total === ""
      ) {
        deductAdminleftOrganizationPointsGraphResult[0].total = 0;
      }

      if (
        deductAdminRightOrganizationPointsGraphResult[0].total === null ||
        deductAdminRightOrganizationPointsGraphResult[0].total === ""
      ) {
        deductAdminRightOrganizationPointsGraphResult[0].total = 0;
      }

      let previousMonthLeftBinaryPoints =
        leftOrganizationPointsResult[0].total +
        addAdminleftOrganizationPointsGraphResult[0].total -
        (deductLeftOrganizationPointsResult[0].total +
          deductAdminleftOrganizationPointsGraphResult[0].total);
      let previousMonthRightBinaryPoints =
        rightOrganizationPointsResult[0].total +
        addAdminRightOrganizationPointsGraphResult[0].total -
        (deductRightOrganizationPointsResult[0].total +
          deductAdminRightOrganizationPointsGraphResult[0].total);
      // end Left Right binary points

      // start Left Right referral points
      const leftReferralPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${user.id}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
      const leftReferralPointsResult = await Qry(leftReferralPointsQuery, [
        "L",
        "Referral Binary Points",
        lastMonth,
      ]);

      const rightReferralPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${user.id}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
      const rightReferralPointsResult = await Qry(rightReferralPointsQuery, [
        "R",
        "Referral Binary Points",
        lastMonth,
      ]);

      const deductLeftReferralPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${user.id}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
      const deductLeftReferralPointsResult = await Qry(
        deductLeftReferralPointsQuery,
        ["L", "Deduct Referral Binary Points", lastMonth]
      );

      const deductRightReferralPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${user.id}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
      const deductRightReferralPointsResult = await Qry(
        deductRightReferralPointsQuery,
        ["R", "Deduct Referral Binary Points", lastMonth]
      );

      const addleftReferralPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${user.id}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
      const addleftReferralPointsResult = await Qry(
        addleftReferralPointsQuery,
        ["L", "Add Referral Binary Points By Admin", lastMonth]
      );

      const addrightReferralPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${user.id}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
      const addrightReferralPointsResult = await Qry(
        addrightReferralPointsQuery,
        ["R", "Add Referral Binary Points By Admin", lastMonth]
      );

      const admindeductleftReferralPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${user.id}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
      const admindeductleftReferralPointsResult = await Qry(
        admindeductleftReferralPointsQuery,
        ["L", "Deduct Referral Binary Points By Admin", lastMonth]
      );

      const admindeductrightReferralPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${user.id}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
      const admindeductrightReferralPointsResult = await Qry(
        admindeductrightReferralPointsQuery,
        ["R", "Deduct Referral Binary Points By Admin", lastMonth]
      );

      if (
        leftReferralPointsResult[0].total === null ||
        leftReferralPointsResult[0].total === ""
      ) {
        leftReferralPointsResult[0].total = 0;
      }
      if (
        deductLeftReferralPointsResult[0].total === null ||
        deductLeftReferralPointsResult[0].total === ""
      ) {
        deductLeftReferralPointsResult[0].total = 0;
      }
      if (
        rightReferralPointsResult[0].total === null ||
        rightReferralPointsResult[0].total === ""
      ) {
        rightReferralPointsResult[0].total = 0;
      }
      if (
        deductRightReferralPointsResult[0].total === null ||
        deductRightReferralPointsResult[0].total === ""
      ) {
        deductRightReferralPointsResult[0].total = 0;
      }

      if (
        addleftReferralPointsResult[0].total === null ||
        addleftReferralPointsResult[0].total === ""
      ) {
        addleftReferralPointsResult[0].total = 0;
      }

      if (
        addrightReferralPointsResult[0].total === null ||
        addrightReferralPointsResult[0].total === ""
      ) {
        addrightReferralPointsResult[0].total = 0;
      }

      if (
        admindeductleftReferralPointsResult[0].total === null ||
        admindeductleftReferralPointsResult[0].total === ""
      ) {
        admindeductleftReferralPointsResult[0].total = 0;
      }

      if (
        admindeductrightReferralPointsResult[0].total === null ||
        admindeductrightReferralPointsResult[0].total === ""
      ) {
        admindeductrightReferralPointsResult[0].total = 0;
      }

      let previousMonthLeftReferralPoints =
        leftReferralPointsResult[0].total -
        deductLeftReferralPointsResult[0].total +
        addleftReferralPointsResult[0].total -
        admindeductleftReferralPointsResult[0].total;
      let previousMonthRightReferralPoints =
        rightReferralPointsResult[0].total -
        deductRightReferralPointsResult[0].total +
        addrightReferralPointsResult[0].total -
        admindeductrightReferralPointsResult[0].total;
      // end Left Right referral points

      // start Left Right active referral members
      const leftReferralMembersQuery = `Select COUNT(*) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${user.id}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
      const leftReferralMembersResult = await Qry(leftReferralMembersQuery, [
        "L",
        "Referral Binary Points",
        lastMonth,
      ]);

      const deductLeftReferralMembersQuery = `Select COUNT(*) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${user.id}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
      const deductLeftReferralMembersResult = await Qry(
        deductLeftReferralMembersQuery,
        ["L", "Deduct Referral Binary Points", lastMonth]
      );

      const rightReferralMembersQuery = `Select COUNT(*) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${user.id}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
      const rightReferralMembersResult = await Qry(rightReferralMembersQuery, [
        "R",
        "Referral Binary Points",
        lastMonth,
      ]);

      const deductRightReferralMembersQuery = `Select COUNT(*) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${user.id}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
      const deductRightReferralMembersResult = await Qry(
        deductRightReferralMembersQuery,
        ["R", "Deduct Referral Binary Points", lastMonth]
      );

      let previousMonthLeftReferralMembers =
        leftReferralMembersResult[0].total -
        deductLeftReferralMembersResult[0].total;
      let previousMonthRightReferralMembers =
        rightReferralMembersResult[0].total -
        deductRightReferralMembersResult[0].total;
      // end Left Right active referral members

      // start Left Right binary team members
      const leftOrganizationMembersQuery = `Select COUNT(*) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${user.id}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
      const leftOrganizationMembersResult = await Qry(
        leftOrganizationMembersQuery,
        ["L", "Binary Points", lastMonth]
      );

      const deductLeftOrganizationMembersQuery = `Select COUNT(*) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${user.id}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
      const deductLeftOrganizationMembersResult = await Qry(
        deductLeftOrganizationMembersQuery,
        ["L", "Deduct Binary Points", lastMonth]
      );

      const rightOrganizationMembersQuery = `Select COUNT(*) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${user.id}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
      const rightOrganizationMembersResult = await Qry(
        rightOrganizationMembersQuery,
        ["R", "Binary Points", lastMonth]
      );

      const deductRightOrganizationMembersQuery = `Select COUNT(*) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${user.id}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
      const deductRightOrganizationMembersResult = await Qry(
        deductRightOrganizationMembersQuery,
        ["R", "Deduct Binary Points", lastMonth]
      );

      let previousMonthLeftBinaryMembers =
        leftOrganizationMembersResult[0].total -
        deductLeftOrganizationMembersResult[0].total;
      let previousMonthRightBinaryMembers =
        rightOrganizationMembersResult[0].total -
        deductRightOrganizationMembersResult[0].total;
      // end Left Right binary team members

      const insertPreviousMonthResult = await Qry(
        "INSERT INTO `previous_record`(`userid`, `direct_active_left_members`, `direct_active_right_members`, `team_active_left_members`, `team_active_right_members`, `left_referral_points`, `right_referral_points`, `left_binary_points`, `right_binary_points`) VALUES (?,?,?,?,?,?,?,?,?)",
        [
          user.id,
          previousMonthLeftReferralMembers,
          previousMonthRightReferralMembers,
          previousMonthLeftBinaryMembers,
          previousMonthRightBinaryMembers,
          previousMonthLeftReferralPoints,
          previousMonthRightReferralPoints,
          previousMonthLeftBinaryPoints,
          previousMonthRightBinaryPoints,
        ]
      );

      // if (user.rank > 0) {
      //   const insertTransactionsResult = await Qry("INSERT INTO `transactions`(`receiverid`, `rankid`, `amount`, `type`, `status`) VALUES (?,?,?,?,?)", [user.id, user.rank, residuelAmount, 'Binary Bonus', 'Pending']);
      // }
      x = x + 1;
    }

    res.status(200).json({
      status: "success",
      message: "ok",
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.cronjobbinarybonus = async (req, res) => {
  try {
    const selectTransactionsQuery = `SELECT * FROM transactions WHERE type = ? and status = ?`;
    const selectTransactionsResult = await Qry(selectTransactionsQuery, [
      "Binary Bonus",
      "Pending",
    ]);

    for (const data of selectTransactionsResult) {
      let amount = data.amount;

      const updateUser = await Qry(
        "update usersdata set current_balance = current_balance + ? where id = ?",
        [amount, data.receiverid]
      );
      const updateTransactions = await Qry(
        "update transactions set status = ? where id = ?",
        ["Approved", data.id]
      );

      const selectUserQuery = `select * from usersdata where id = ?`;
      const selectUserResult = await Qry(selectUserQuery, [data.receiverid]);

      logger.info(
        `$${amount} has been added successfully to user ${selectUserResult[0].username} current balance`,
        { type: "user" }
      );
    }

    const updateUser1 = await Qry(
      "update usersdata set withdrawal_status = ?",
      [0]
    );

    res.status(200).json({
      status: "success",
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.cronjobyearlypoints = async (req, res) => {
  try {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;
    const date = new Date().toISOString().slice(0, 19).replace("T", " ");

    const selectYearlyPointsQuery = `SELECT * FROM yearly_points WHERE points_date = ? and status = ?`;
    const selectYearlyPointsResult = await Qry(selectYearlyPointsQuery, [
      formattedDate,
      "Pending",
    ]);

    for (const data of selectYearlyPointsResult) {
      let senderid = data.senderid;
      let points = data.points;
      let left_receiver_ids = data.left_receiver_ids;
      let right_receiver_ids = data.right_receiver_ids;

      // start binary points

      if (left_receiver_ids !== null) {
        const insertLeftBinaryPointsResult = await Qry(
          "INSERT INTO `points`(`sender_id`, `points`, `leg`, `type`, `period`, `receiver_ids`, `dat`) VALUES (?,?,?,?,?,?,?)",
          [
            senderid,
            points,
            "L",
            "Binary Points",
            "year",
            left_receiver_ids,
            date,
          ]
        );
      }
      if (right_receiver_ids !== null) {
        const insertRightBinaryPointsResult = await Qry(
          "INSERT INTO `points`(`sender_id`, `points`, `leg`, `type`, `period`, `receiver_ids`, `dat`) VALUES (?,?,?,?,?,?,?)",
          [
            senderid,
            points,
            "R",
            "Binary Points",
            "year",
            right_receiver_ids,
            date,
          ]
        );
      }
      // end binary points

      // start referral points
      const selectUserDataQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectUserDataResult = await Qry(selectUserDataQuery, [senderid]);

      const referralDataToInsert = JSON.stringify({
        receiver_ids: [selectUserDataResult[0].sponsorid],
      });
      const insertReferralPoints = await Qry(
        "insert into points(sender_id,points,leg,type,period,receiver_ids, `dat`) values (?, ?, ?, ?, ?, ?, ?)",
        [
          senderid,
          points,
          selectUserDataResult[0].leg_position,
          "Referral Binary Points",
          "year",
          referralDataToInsert,
          date,
        ]
      );
      // end referral points

      const updateUser = await Qry(
        "update yearly_points set status = ? where id = ?",
        ["Approved", data.id]
      );
    }

    res.status(200).json({
      status: "success",
      message: selectYearlyPointsResult,
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.insertolddata = async (req, res) => {
  try {
    //const selectPackageDataQuery = `SELECT * FROM dummy where id = 90 order by id asc`;
    const selectPackageDataQuery = `SELECT * FROM dummy_old  order by id asc`;
    const selectPackageDataResult = await Qry(selectPackageDataQuery);

    // const decodedJsonData = he.decode(selectPackageDataResult[0].d_data);
    // res.status(200).json({ status: 'ok', message: decodedJsonData });

    const promises = selectPackageDataResult.map((data) => {
      const decodedJsonData = JSON.parse(he.decode(data.d_data));
      sendDataToRoute(decodedJsonData);
    });
    await Promise.all(promises);

    // All requests have been sent
    res.status(200).json({ status: "ok", message: "all data inserted" });
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
};

exports.registrationissue11 = async (req, res) => {
  try {
    const postData = req.body;

    const eventType = postData?.event_type;
    const invoiceStatus = postData?.content?.invoice?.status;
    const entityType = postData?.content?.invoice?.line_items[0]?.entity_type;
    const customerId = postData?.content?.customer?.id;
    const billingPeriodUnit =
      postData?.content?.subscription?.billing_period_unit;
    const cnReasonCode =
      postData?.content?.invoice?.applied_credits[0]?.cn_reason_code;
    const activatedAt = postData?.content?.subscription?.activated_at;
    const nextBillingAt = postData?.content?.subscription?.next_billing_at;
    const paidAmount = postData?.content?.invoice?.amount_paid / 100;
    const failedReason = postData?.content?.transaction?.error_text;
    const entityId = postData?.content?.invoice?.line_items[0]?.entity_id;
    const entityName =
      postData?.content?.invoice?.line_items[0]?.entity_description;

    let currentDate = new Date();
    let formattedDate = currentDate.toISOString().split("T")[0];

    const selectPackageDataQuery = `SELECT * FROM new_packages WHERE customerid = ?`;
    const selectPackageDataResult = await Qry(selectPackageDataQuery, [
      customerId,
    ]);

    const selectUserDataQuery = `SELECT * FROM usersdata WHERE customerid = ?`;
    const selectUserDataResult = await Qry(selectUserDataQuery, [customerId]);

    const selectTreeDataQuery = `SELECT * FROM binarytree WHERE userid = ?`;
    const selectTreeDataResult = await Qry(selectTreeDataQuery, [
      selectUserDataResult[0]?.id,
    ]);

    const insertDummyQry = `insert into dummy(d_data) values (?)`;
    const insertDummyData = await Qry(insertDummyQry, JSON.stringify(postData));

    // Event start subscription Created
    if (eventType === "subscription_created" && invoiceStatus === "paid") {
      const randomCode = randomToken(10);
      const emailToken = randomToken(90);
      const username = (postData?.content?.customer?.cf_username).toLowerCase();
      const firstname = postData?.content?.customer?.billing_address?.first_name;
      const lastname = postData?.content?.customer?.billing_address?.last_name;
      const email = postData?.content?.customer?.email;
      const mobile = postData?.content?.customer?.phone;
      const address1 = postData?.content?.customer?.billing_address?.line1;
      const country = postData?.content?.customer?.billing_address?.country;
      const language = postData?.content?.customer?.locale;
      let company = "";
      const zip_code = "";
      const city = postData?.content?.customer?.billing_address?.city;
      const birthday = "";
      const amount = postData?.content?.invoice?.amount_paid / 100;
      let planId =
        postData?.content?.subscription?.subscription_items[0]?.item_price_id;
      const subscriptionId = postData?.content?.subscription?.id;
      const customerId = postData?.content?.customer?.id;
      const currencyCode = postData?.content?.subscription?.currency_code;
      const couponCode =
        postData?.content?.subscription?.coupons &&
          postData?.content?.subscription?.coupons?.length > 0
          ? postData?.content?.subscription?.coupons[0]?.coupon_id
          : "";
      const activatedAt = postData?.content?.subscription?.created_at;
      const nextBillingAt = postData?.content?.subscription?.next_billing_at;
      const subscriptionStatus = "Active";
      const pkgName = postData?.content?.invoice?.line_items[0]?.description;
      let binaryVolume = Math.ceil(amount);
      const subscriptionType =
        postData?.content?.subscription?.billing_period_unit;
      let maskedNumber = "";
      const sposnorUser = postData?.content?.customer?.cf_sponsor_username;
      const parent_id = postData?.content?.customer?.cf_cf_parent_id;

      const selectSponsorDataQuery11 = `SELECT * FROM usersdata WHERE username = ?`;
      const selectSponsorDataResult11 = await Qry(selectSponsorDataQuery11, [
        sposnorUser,
      ]);

      const sponsorRnadomCode = selectSponsorDataResult11[0]?.randomcode;
      const password = "Novalya123@";

      if (!company) {
        company = "";
      }

      if (!maskedNumber) {
        maskedNumber = "";
      }

      const date = new Date().toISOString().slice(0, 19).replace("T", " ");

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

      const selectSponsorQuery = `SELECT * FROM usersdata WHERE randomcode = ?`;
      const selectSponsorResult = await Qry(selectSponsorQuery, [
        sponsorRnadomCode,
      ]);
      const userSponsorId = selectSponsorResult[0].id;
      const availableSpace = await findAvailableSpace(
        userSponsorId,
        selectSponsorResult[0].referral_side
      );

      if (subscriptionType === "year") {
        binaryVolume = Math.ceil(amount / 12);
      }

      let newUserId;
      const insertResult = await Qry(
        `INSERT INTO usersdata (mobile,sponsorid,leg_position,username,password,email,country, company, address1, zip_code, city, language, firstname, lastname, randomcode, emailtoken,masked_number,status,customerid, sub_type, emailstatus, birth_date,parent_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mobile,
          userSponsorId,
          selectSponsorResult[0].referral_side,
          username,
          encryptedPassword,
          email,
          country,
          company,
          address1,
          zip_code,
          city,
          language,
          firstname,
          lastname,
          randomCode,
          emailToken,
          maskedNumber,
          "Approved",
          customerId,
          subscriptionType,
          "verified",
          birthday,
          parent_id,
        ]
      );
      newUserId = insertResult.insertId;

      const insertPackageResult = await Qry(
        `INSERT INTO new_packages(userid, amount, subscriptionid, customerid, currency, planid,  coupon, activatedAt, nextBillingAt, status, pkg_name, binary_volume, sub_type) VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newUserId,
          amount,
          subscriptionId,
          customerId,
          currencyCode,
          planId,
          couponCode,
          activatedAt,
          nextBillingAt,
          subscriptionStatus,
          pkgName,
          binaryVolume,
          subscriptionType,
        ]
      );

      const insertBinaryTree = await Qry(
        "insert into binarytree(userid,pid,leg) values (?, ?, ?)",
        [newUserId, availableSpace, selectSponsorResult[0].referral_side]
      );

      const selectLeftBinaryPointsUsers = await Qry(
        "WITH RECURSIVE UserTree AS (SELECT `id`, `userid`, `pid`, `leg` FROM `binarytree` WHERE `userid` = ? UNION ALL SELECT bt.`id`, bt.`userid`, bt.`pid`, bt.`leg` FROM `binarytree` bt JOIN UserTree ut ON bt.`userid` = ut.`pid`) SELECT * FROM UserTree WHERE leg = ? ",
        [newUserId, "L"]
      );
      const leftreceiverIds = selectLeftBinaryPointsUsers.map((row) => row.pid);
      let leftDataToInsert = JSON.stringify({ receiver_ids: leftreceiverIds });

      const selectRightBinaryPointsUsers = await Qry(
        "WITH RECURSIVE UserTree AS (SELECT `id`, `userid`, `pid`, `leg` FROM `binarytree` WHERE `userid` = ? UNION ALL SELECT bt.`id`, bt.`userid`, bt.`pid`, bt.`leg` FROM `binarytree` bt JOIN UserTree ut ON bt.`userid` = ut.`pid`) SELECT * FROM UserTree WHERE leg = ? ",
        [newUserId, "R"]
      );
      const rightreceiverIds = selectRightBinaryPointsUsers.map(
        (row) => row.pid
      );
      let rightDataToInsert = JSON.stringify({
        receiver_ids: rightreceiverIds,
      });

      let formattedDate = currentDate.toISOString().split("T")[0];

      const selectCountPointsDataQuery = `SELECT COUNT(*) AS total FROM points WHERE sender_id = ? AND dat = ?`;
      const selectCountPointsDataResult = await Qry(
        selectCountPointsDataQuery,
        [newUserId, formattedDate]
      );

      if (selectCountPointsDataResult[0]?.total === 0) {
        if (leftreceiverIds.length > 0) {
          const insertLeftPoints = await Qry(
            "insert into points(sender_id,points,leg,type,period,receiver_ids,dat) values (?, ?, ?, ?, ?, ?, ?)",
            [
              newUserId,
              binaryVolume,
              "L",
              "Binary Points",
              subscriptionType,
              leftDataToInsert,
              date,
            ]
          );
        } else {
          leftDataToInsert = null;
        }

        if (rightreceiverIds.length > 0) {
          const insertRightPoints = await Qry(
            "insert into points(sender_id,points,leg,type,period,receiver_ids,dat) values (?, ?, ?, ?, ?, ?, ?)",
            [
              newUserId,
              binaryVolume,
              "R",
              "Binary Points",
              subscriptionType,
              rightDataToInsert,
              date,
            ]
          );
        } else {
          rightDataToInsert = null;
        }

        const referralDataToInsert = JSON.stringify({
          receiver_ids: [userSponsorId],
        });
        const insertReferralPoints = await Qry(
          "insert into points(sender_id,points,leg,type,period,receiver_ids,dat) values (?, ?, ?, ?, ?, ?, ?)",
          [
            newUserId,
            binaryVolume,
            selectSponsorResult[0].referral_side,
            "Referral Binary Points",
            subscriptionType,
            referralDataToInsert,
            date,
          ]
        );
      }

      const activated_date = activatedAt * 1000;

      if (subscriptionType === "year") {
        const providedDate = new Date(activated_date);
        const providedDay = providedDate.getDate();
        for (let i = 0; i <= 12; i++) {
          if (i > 1) {
            const newDate = new Date(activated_date);
            newDate.setDate(1);
            newDate.setMonth(newDate.getMonth() + i);
            if (providedDay === 30 || providedDay === 31) {
              newDate.setDate(0); // Set the date to the last day of the previous month
            } else {
              newDate.setDate(providedDay);
            }
            const formattedDate = newDate.toISOString().slice(0, 10);
            const insertYearlyPoints = await Qry(
              "insert into yearly_points(senderid,points_date,points,left_receiver_ids, right_receiver_ids) values (?, ?, ?, ?, ?)",
              [
                newUserId,
                formattedDate,
                binaryVolume,
                leftDataToInsert,
                rightDataToInsert,
              ]
            );
          }
        }
      }

      // start add team in binary tree
      const selectNewUserTreeQuery = `SELECT * FROM binarytree WHERE userid = ?`;
      const selectNewUserTreeResult = await Qry(selectNewUserTreeQuery, [
        newUserId,
      ]);
      let pid = selectNewUserTreeResult[0]?.pid;

      while (pid !== null) {
        const selectPlacmentTreeDataQuery = `SELECT * FROM binarytree WHERE userid = ?`;
        const selectplacementTreeDataResult = await Qry(
          selectPlacmentTreeDataQuery,
          [pid]
        );

        let binaryTeam = selectplacementTreeDataResult[0]?.binary_team;
        let newBinaryTeam;
        if (binaryTeam === "") {
          newBinaryTeam = newUserId;
        } else {
          newBinaryTeam = binaryTeam + "," + newUserId;
        }
        const updateBinaryTree = await Qry(
          "update binarytree set binary_team = ? where userid = ?",
          [newBinaryTeam, pid]
        );

        const selectTreeDataQuery = `SELECT * FROM binarytree WHERE userid = ?`;
        const selectTreeDataResult = await Qry(selectTreeDataQuery, [pid]);

        pid = selectTreeDataResult[0]?.pid;
      }
      // end add team in binary tree

      const settingsData = await Qry(
        "SELECT * FROM `setting` WHERE keyname IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          "referral_commission_status",
          "referral_commission_type",
          "referral_commission_value",
          "unilevel_status",
          "unilevel_bonus_level1",
          "unilevel_bonus_level2",
          "unilevel_bonus_level3",
          "unilevel_bonus_level4",
          "unilevel_bonus_level5",
          "unilevel_bonus_level6",
          "unilevel_bonus_level7",
          "unilevel_bonus_level8",
          "unilevel_bonus_level9",
          "unilevel_bonus_level10",
        ]
      );

      const referralCommissionType = settingsData[0].keyvalue;
      const referralCommissionValue = settingsData[1].keyvalue;
      const referralCommissionStatus = settingsData[2].keyvalue;
      const uniLevelStatus = settingsData[3].keyvalue;
      let commissionAmount;

      if (referralCommissionStatus === "On") {
        referralCommissionType === "Percentage"
          ? (commissionAmount = (referralCommissionValue / 100) * amount)
          : referralCommissionType === "Flat"
            ? (commissionAmount = referralCommissionValue)
            : (commissionAmount = 0);

        if (commissionAmount > 0) {
          updateSponsorBalance = await Qry(
            "update usersdata set current_balance = current_balance + ? where id = ?",
            [commissionAmount, userSponsorId]
          );

          insertTransaction = await Qry(
            "insert into transactions ( receiverid, senderid, amount, type, details) values ( ? , ? , ? ,? , ?)",
            [
              userSponsorId,
              newUserId,
              commissionAmount,
              "Referral Commission",
              referralCommissionType,
            ]
          );
        }
      }

      let bonusValue;
      let x = 4;
      let level = 1;
      let sponsorid = userSponsorId;
      if (uniLevelStatus === "On") {
        while (x <= 13 && sponsorid !== "") {
          bonusValue = settingsData[x].keyvalue;
          updateSponsorBalance = await Qry(
            "update usersdata set current_balance = current_balance + ? where id = ?",
            [bonusValue, sponsorid]
          );

          insertTransaction = await Qry(
            "insert into transactions ( receiverid, senderid, amount, type, details) values ( ? , ? , ? ,? , ?)",
            [
              sponsorid,
              newUserId,
              bonusValue,
              "Unilevel Commission",
              `Received Level ${level} commission from user ${username}`,
            ]
          );
          const snameData = await Qry("SELECT * FROM usersdata WHERE id = ?", [
            sponsorid,
          ]);
          sponsorid = snameData[0].sponsorid;

          x++;
          level++;
        }
      }

      if (
        planId === "Nova-Connect-EUR-Monthly" ||
        planId === "Nova-Connect-EUR-Yearly"
      ) {
        const updateUsersData = await Qry(
          "update usersdata set connect_status = ? where id = ?",
          ["On", newUserId]
        );
      }
      if (
        planId === "Nova-Connect-Plus-CRM-EUR-Monthly" ||
        planId === "Nova-Connect-Plus-CRM-EUR-Yearly"
      ) {
        const updateUsersData = await Qry(
          "update usersdata set connect_status = ?, crm_status = ? where id = ?",
          ["On", "On", newUserId]
        );
      }
      if (
        planId === "NovaConnect-CRM-Birthday-EUR-Monthly" ||
        planId === "NovaConnect-CRM-Birthday-EUR-Yearly"
      ) {
        const updateUsersData = await Qry(
          "update usersdata set connect_status = ?, crm_status = ?, birthday_status = ? where id = ?",
          ["On", "On", "On", newUserId]
        );
      }
    }
    // Event end subscription Created
    // const insertDummy = await Qry("insert into dummy(d_data) values (?)", [postData]);

    res.status(200).json({
      status: "success",
      message: eventType,
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
};

exports.ipnChagrbeWebhook = async (req, res) => {
  try {
    const postData = req.body;
    let eventType = postData?.event_type;
    const invoiceStatus = postData?.content?.invoice?.status;
    let entityType = postData?.content?.invoice?.line_items[0]?.entity_type;
    const customerId = postData?.content?.customer?.id;
    const billingPeriodUnit =
      postData?.content?.subscription?.billing_period_unit;
    const billingPeriod = postData?.content?.subscription?.billing_period;
    const planID =
      postData?.content?.subscription?.subscription_items?.item_price_id;
    const activated_at = postData?.content?.subscription?.activated_at;
    const activatedAt = postData?.content?.subscription?.started_at;
    const nextBillingAt = postData?.content?.subscription?.next_billing_at;
    const failedReason = postData?.content?.transaction?.error_text;
    const entityId = postData?.content?.invoice?.line_items[0]?.entity_id;
    let currencyCode = postData?.content?.subscription?.currency_code;
    let pkgName = postData?.content?.invoice?.line_items[0]?.description;
    let amount = postData?.content?.invoice?.amount_paid / 100;
    let ac_amount = amount * (40/100);
    let trialStatus = postData?.content?.subscription?.status;
    let cancelled_at = postData?.content?.subscription?.cancelled_at;
    const planPrice = postData?.content?.subscription?.subscription_items?.[0]?.unit_price /100;

    if(postData?.content?.invoice?.line_items[0]?.entity_type == "charge_item_price" || postData?.content?.invoice?.line_items[1]?.entity_type == "charge_item_price"){

      if(postData?.content?.invoice?.line_items[0]?.entity_id == "Formation-Sonny-Novalya-Transformer-vos-leads-en-RDV-qualifies-EUR"){

        entityType = postData?.content?.invoice?.line_items[0]?.entity_type;
        entityId = postData?.content?.invoice?.line_items[0]?.entity_id;
        currencyCode = postData?.content?.invoice?.currency_code;
        console.log('first', entityType);
      }

      if(postData?.content?.invoice?.line_items[1]?.entity_id == "Formation-Sonny-Novalya-Transformer-vos-leads-en-RDV-qualifies-EUR"){

        entityType = postData?.content?.invoice?.line_items[1]?.entity_type;
        entityId = postData?.content?.invoice?.line_items[1]?.entity_id;
        currencyCode = postData?.content?.invoice?.currency_code;
      }
    }

    const selectPackageDataQuery = `SELECT * FROM new_packages WHERE customerid = ? and type = ?`;
    const selectPackageDataResult = await Qry(selectPackageDataQuery, [
      customerId,
      "package",
    ]);

    const selectUserDataQuery = `SELECT * FROM usersdata WHERE customerid = ?`;
    const selectUserDataResult = await Qry(selectUserDataQuery, [customerId]);

    const insertDummyQry = `insert into dummy(d_data) values (?)`;
    await Qry(insertDummyQry, JSON.stringify(postData));

    //gd-info not working
    const getLimitsQry = `SELECT * FROM plans WHERE plan_id = ?`;
    const getLimitsData = await Qry(getLimitsQry, [planID]);
    const pakageName = getLimitsData[0]?.limits;

    if (eventType === "subscription_cancellation_scheduled") {
      await Qry(
        "update new_packages set cancellation_date = ?, is_cancellation_scheduled = 1 where customerid = ? and type = ?",
        [cancelled_at, customerId, "package"]
      );
    }
    
    // Event start subscription cancelled
    if (eventType === "subscription_cancelled") {
      let planId = postData?.content?.subscription?.subscription_items[0]?.item_price_id;
      if (planId === "Affiliate-Fee-EUR-Yearly" || planId === "Affiliate-Fee-USD-Yearly") {
        await Qry(
          "update usersdata set user_type = ? where id = ?",
          ["Normal", selectUserDataResult[0]?.id]
        );
      } else {
        await Qry(
          "update new_packages set status = ?, cancellation_date = ?, is_cancellation_scheduled= 0 where customerid = ? and type = ?",
          [eventType, cancelled_at, customerId, "package"]
        );
        await Qry(
          "update usersdata set login_status = ?, subscription_status = ? where id = ?",
          ["Block", eventType, selectUserDataResult[0]?.id]
        );
      }
    }
    // Event end subscription cancelled

    // Event start subscription renewed
    if (eventType === "subscription_renewed") {
      if (entityId === "Affiliate-Fee-EUR-Yearly" || entityId === "Affiliate-Fee-USD-Yearly") {
        // do nothing
      } else {

        await Qry(
          "update usersdata set for_renewal = ?, activated_at=? where id = ?",
          ["subscription_renewed", activated_at, selectUserDataResult[0]?.id]
        );

        await Qry(
          `update plan_limit set 
          no_friend_request = 0, 
          no_crm_message = 0, 
          no_ai_comment=0, 
          no_insta_ai_comment=0, 
          no_friend_requests_received=0, 
          no_of_birthday_wishes=0, 
          no_insta_prospection=0, 
          no_insta_crm=0 
          where user_id = ?`,
          [selectUserDataResult[0]?.id]
        );
      }
    }
    // charge update status after charge
    // Event start payment refunded
    if (eventType === "payment_refunded") {
      let refunded_amount = postData?.content?.credit_note?.amount_refunded / 100;
      amount = refunded_amount;

      if (!currencyCode)
        currencyCode = postData?.content?.invoice?.currency_code;

      if (
        entityId === "Affiliate-Fee-EUR-Yearly" ||
        entityId === "Affiliate-Fee-USD-Yearly"
      ) {
        //do nothing
      } else {
        const selectPlansQuery = `SELECT * FROM plans WHERE plan_id = ?`;
        const selectPlansResult = await Qry(selectPlansQuery, [entityId]);

        let subDomain = (selectPlansResult[0] && selectPlansResult[0].subdomain) ? selectPlansResult[0].subdomain :'app';

        let userTrialStatus = selectUserDataResult[0]?.trial_status;

        if (subDomain === "app" && userTrialStatus === "Inactive") {
          // start level bonus
          let i = 1;
          let s_id = selectUserDataResult[0]?.sponsorid;
          while (i <= 2 && s_id !== 0) {
            const sponsorData = await Qry(
              "SELECT * FROM usersdata WHERE id = ?",
              [s_id]
            );

            await Qry(
              "INSERT INTO transactions (receiverid, senderid, amount, details, type, event_type, currency, paid_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
              [
                s_id,
                selectUserDataResult[0]?.id,
                0,
                ``,
                `Level ${i} Bonus Deducted`,
                eventType,
                currencyCode,
                amount,
              ]
            );

            if (sponsorData[0].sponsorid == 0) {
              if (i === 1) {
                await Qry(
                  "INSERT INTO transactions (receiverid, senderid, amount, details, type, event_type, currency, paid_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                  [
                    0,
                    selectUserDataResult[0]?.id,
                    0,
                    ``,
                    `Level 2 Bonus Deducted`,
                    eventType,
                    currencyCode,
                    amount,
                  ]
                );
              }

              s_id = 0;
            } else {
              s_id = sponsorData[0].sponsorid;
            }

            i++;
          }
          // end level bonus
        }

        await Qry(
          "update new_packages set status = ? where customerid = ? and type = ?",
          [eventType, customerId, "package"]
        );
        await Qry(
          "update usersdata set login_status = ?, subscription_status = ? where id = ?",
          ["Block", eventType, selectUserDataResult[0]?.id]
        );
      }
    }
    // Event end payment refunded

    // Event start payment failed
    if (eventType === "payment_failed") {
      if (entityType === "plan_item_price") {
        if (
          entityId === "Affiliate-Fee-EUR-Yearly" ||
          entityId === "Affiliate-Fee-USD-Yearly"
        ) {
          await Qry(
            "update usersdata set user_type = ? where id = ?",
            ["Normal", selectUserDataResult[0]?.id]
          );
        } else {
          await Qry(
            "update new_packages set status = ?, failed_reason = ? where customerid = ? and type = ?",
            [eventType, failedReason, customerId, "package"]
          );
          await Qry(
            "update usersdata set subscription_status = ?, for_renewal = ? where id = ?",
            [eventType, eventType, selectUserDataResult[0]?.id]
          );
        }
      }
    }
    // Event end payment failed

    // Event start payment succeedd
    if (eventType === "payment_succeeded" && invoiceStatus === "paid") {
      // start code of payment succeedd
      if (entityId === "Affiliate-Fee-EUR-Yearly" || entityId === "Affiliate-Fee-USD-Yearly") {
        await Qry(
          "update usersdata set user_type = ? where id = ?",
          ["Distributor", selectUserDataResult[0]?.id]
        );
      } else {
        // start for normal renewal
        if (
          selectUserDataResult &&
          selectUserDataResult[0] &&
          selectUserDataResult[0]?.for_renewal === "subscription_renewed" &&
          !entityId.includes('German-Event') &&
          selectUserDataResult[0]?.subscription_status !== "payment_failed"
        ) {
          const selectPlansQuery = `SELECT * FROM plans WHERE plan_id = ?`;
          const selectPlansResult = await Qry(selectPlansQuery, [entityId]);
          let subDomain = selectPlansResult[0]?.subdomain;

          if (subDomain === "app") {
            // start level bonus
            let i = 1;
            let s_id = selectUserDataResult[0]?.sponsorid;
            while (i <= 2 && s_id !== 0) {
              const sponsorData = await Qry(
                "SELECT * FROM usersdata WHERE id = ?",
                [s_id]
              );

              if (!currencyCode || currencyCode == null) {

                currencyCode = postData?.content?.invoice?.currency_code
              }

              await Qry(
                "INSERT INTO transactions (receiverid, senderid, amount, details, type, event_type, currency, paid_amount, plan_id, sub_type, plan_period, activated_at, nextBillingAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                  s_id,
                  selectUserDataResult[0]?.id,
                  0,
                  ``,
                  `Level ${i} Bonus`,
                  "subscription_renewed",
                  currencyCode,
                  amount,
                  planID,
                  billingPeriodUnit,
                  billingPeriod,
                  activatedAt,
                  nextBillingAt,
                ]
              );

              if (sponsorData[0].sponsorid == 0) {
                if (i === 1) {
                  await Qry(
                    "INSERT INTO transactions (receiverid, senderid, amount, details, type, event_type, currency, paid_amount, plan_id, sub_type, plan_period, activated_at, nextBillingAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [
                      0,
                      selectUserDataResult[0]?.id,
                      0,
                      ``,
                      `Level 2 Bonus`,
                      "subscription_renewed",
                      currencyCode,
                      amount,
                      planID,
                      billingPeriodUnit,
                      billingPeriod,
                      activatedAt,
                      nextBillingAt,
                    ]
                  );
                }
                s_id = 0;
              } else {
                s_id = sponsorData[0].sponsorid;
              }

              i++;
            }
            // end level bonus 
          }

          await Qry(
            "update new_packages set activatedAt = ?, nextBillingAt = ?, status = ? where customerid = ? and type = ?",
            [
              activatedAt,
              nextBillingAt,
              "subscription_renewed",
              customerId,
              "package",
            ]
          );


          if(billingPeriod){
            var billingPeriod1 = billingPeriod;
          }else {
            var billingPeriod1 = selectUserDataResult[0]?.plan_period;
          }
            
          const updateUserData = await Qry(
            "update usersdata set sub_type = ?,plan_period = ?,plan_pkg = ?, subscription_status = ?, for_renewal = ?, trial_status = ?, activated_at=?, next_billing_at=? where id = ?",
            [
              billingPeriodUnit,
              billingPeriod1,
              pakageName,
              "subscription_renewed",
              "",
              "Inactive",
              activated_at,
              nextBillingAt,
              selectUserDataResult[0]?.id,
            ]
          );
        }

        // start for payment failed renewal
        if (
          selectUserDataResult[0]?.subscription_status === "payment_failed" &&
          selectUserDataResult[0]?.subscription_status !== "subscription_renewed"
        ) {
          const selectPlansQuery = `SELECT * FROM plans WHERE plan_id = ?`;
          const selectPlansResult = await Qry(selectPlansQuery, [entityId]);
          let subDomain = selectPlansResult[0].subdomain;
          let eventType1 = eventType;

          if (selectUserDataResult[0]?.trial_status === "Active") {
            eventType1 = "subscription_activated";
          }

          if (subDomain === "app") {
            // start level bonus
            let i = 1;
            let s_id = selectUserDataResult[0]?.sponsorid;
            while (i <= 2 && s_id !== 0) {
              const sponsorData = await Qry(
                "SELECT * FROM usersdata WHERE id = ?",
                [s_id]
              );

              await Qry(
                "INSERT INTO transactions (receiverid, senderid, amount, details, type, event_type, currency, paid_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [
                  s_id,
                  selectUserDataResult[0]?.id,
                  0,
                  ``,
                  `Level ${i} Bonus`,
                  eventType1,
                  currencyCode,
                  amount,
                ]
              );

              if (sponsorData[0].sponsorid == 0) {
                if (i === 1) {
                  await Qry(
                    "INSERT INTO transactions (receiverid, senderid, amount, details, type, event_type, currency, paid_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    [
                      0,
                      selectUserDataResult[0]?.id,
                      0,
                      ``,
                      `Level 2 Bonus`,
                      eventType1,
                      currencyCode,
                      amount,
                    ]
                  );
                }
                s_id = 0;
              } else {
                s_id = sponsorData[0].sponsorid;
              }

              i++;
            }
            // end level bonus
          }

          await Qry(
            "update new_packages set activatedAt = ?, nextBillingAt = ?, status = ? where customerid = ? and type = ?",
            [
              activatedAt,
              nextBillingAt,
              "subscription_renewed",
              customerId,
              "package",
            ]
          );

          let subscription_status_usersdata = eventType1;
          if (subscription_status_usersdata === "payment_succeeded") {
            subscription_status_usersdata = "subscription_renewed";
          }

          await Qry(
            "update usersdata set sub_type = ?, plan_period = ?, plan_pkg = ?, subscription_status = ?, for_renewal = ?, trial_status = ?, activated_at=? where id = ?",
            [
              billingPeriodUnit,
              billingPeriod,
              pakageName,
              subscription_status_usersdata,
              "",
              "Inactive",
              activated_at,
              selectUserDataResult[0]?.id,
            ]
          );
        }

        if (selectUserDataResult[0]?.trial_status == 'Active') {
          //update to inactive
          await Qry(
            "update usersdata set trial = ?, trial_status = ? where id = ?",
            [
              "No",
              "Inactive",
              selectUserDataResult[0]?.id,
            ]
          );
        }
        // end for payment failed renewal

        //Affilate payment addition
        const { id: ac_user_id, sponsorid: ac_sponsor_id } = selectUserDataResult[0];
        insert_affiliate_commission(ac_user_id,ac_sponsor_id,amount,ac_amount,currencyCode);
      }
      // end code of payment succeedd
    }
    // Event end payment succeedd

    // Event start update customer info
    if (eventType === "customer_changed") {
      const customerId = postData?.content?.customer?.id;
      const firstName = postData?.content?.customer?.first_name;
      const lastName = postData?.content?.customer?.last_name;
      const email = postData?.content?.customer?.email;
      const mobile = postData?.content?.customer?.phone;
      const updatedBy = "api_chargebee"; // Set the value of updated_by

      let query = "UPDATE `usersdata` SET";
      const params = [];

      if (firstName) {
        query += " `firstname`= ?,";
        params.push(firstName);
      }

      if (lastName) {
        query += " `lastname`= ?,";
        params.push(lastName);
      }

      if (email) {
        query += " `email`= ?,";
        params.push(email);
      }

      if (mobile) {
        query += " `mobile`= ?,";
        params.push(mobile);
      }

      // Add the `updated_by` column
      query += " `updated_by`= ?,";

      // Remove the trailing comma and add the WHERE clause
      query = query.replace(/,$/, "") + " WHERE customerid = ?";

      // Add `updatedBy` and `customerId` to the params array
      params.push(updatedBy, customerId);

      await Qry(query, params);
    }
    // Event end update customer info

    // Event start subscription changed
    if (eventType === "subscription_changed") {
      const totalAmount =
        postData?.content?.subscription?.subscription_items[0]?.amount / 100;
      let planId =
        postData?.content?.subscription?.subscription_items[0]?.item_price_id;

      const selectPlansQuery = `SELECT * FROM plans WHERE plan_id = ?`;
      const selectPlansResult = await Qry(selectPlansQuery, [planId]);

      let subDomain = (selectPlansResult && selectPlansResult[0] && selectPlansResult[0].subdomain) ? selectPlansResult[0].subdomain : "";
      let connections = selectPlansResult[0]?.connections;
      let limitsName = selectPlansResult[0]?.limits;
      let trialStatus = selectUserDataResult[0]?.trial_status;

      console.log('subDomain--9644', subDomain);
      console.log('trialStatus--9644', trialStatus);
      console.log('amount--9644', amount);
      console.log('selectUserDataResult[0]?.id--9647', selectUserDataResult[0]?.id);

      if (subDomain === "app" && trialStatus !== "Active" && amount) {
        // start level bonus
        let i = 1;
        let s_id = selectUserDataResult[0]?.sponsorid;
        while (i <= 2 && s_id !== 0) {
          const sponsorData = await Qry(
            "SELECT * FROM usersdata WHERE id = ?",
            [s_id]
          );

          // check already entry for sponser L1
          const currentDateNow = new Date();
          const startOfMonth = new Date(currentDateNow.getFullYear(), currentDateNow.getMonth(), 1);
          const endOfMonth = new Date(currentDateNow.getFullYear(), currentDateNow.getMonth() + 1, 0, 23, 59, 59);

          const existingTransaction = await Qry(
            "SELECT id, paid_amount FROM transactions WHERE receiverid = ? AND senderid = ? AND createdat BETWEEN ? AND ?",
            [s_id, selectUserDataResult[0]?.id, startOfMonth, endOfMonth]
          );

          if (existingTransaction.length > 0) {
            await Qry(
              "UPDATE transactions SET paid_amount = ?, event_type=? WHERE id = ?",
              [
                amount,
                eventType,
                existingTransaction[0].id
              ]
            );
          } else {

            await Qry(
              "INSERT INTO transactions (receiverid, senderid, amount, details, type, event_type, currency, paid_amount, plan_id, sub_type, plan_period, activated_at, nextBillingAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [
                s_id,
                selectUserDataResult[0]?.id,
                0,
                ``,
                `Level ${i} Bonus`,
                eventType,
                currencyCode,
                amount,
                planID,
                billingPeriodUnit,
                billingPeriod,
                activatedAt,
                nextBillingAt,
              ]
            );
          }
          // 

          if (sponsorData[0]?.sponsorid == 0) {
            if (i === 1) {
              await Qry(
                "INSERT INTO transactions (receiverid, senderid, amount, details, type, event_type, currency, paid_amount, plan_id, sub_type, plan_period, activated_at, nextBillingAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                  0,
                  selectUserDataResult[0]?.id,
                  0,
                  ``,
                  `Level 2 Bonus`,
                  eventType,
                  currencyCode,
                  amount,
                  planID,
                  billingPeriodUnit,
                  billingPeriod,
                  activatedAt,
                  nextBillingAt,
                ]
              );
            }

            s_id = 0;
          } else {
            s_id = sponsorData[0]?.sponsorid;
          }

          i++;
        }
        // end level bonus
      }

      if (!planId.includes('Affiliate-Fee')) {

        await Qry(
          "UPDATE usersdata SET `currency` = ?, connection_type = ?, sub_type = ?, plan_period = ?,plan_pkg = ?, plan_price = ?, for_renewal = ?, activated_at=? WHERE id = ?",
          [
            currencyCode,
            connections,
            billingPeriodUnit,
            billingPeriod,
            limitsName,
            planPrice,
            "",
            activated_at,
            selectUserDataResult[0]?.id,
          ]
        );

        //start plan limits
        let limitsQueury;
        limitsQueury = await Qry(
          "SELECT * from chargbee_packages_limits WHERE pkg_id = ?",
          [limitsName]
        );

        let limitsData = limitsQueury[0];

        const updateUsersLimits = await Qry(
          "update users_limits set fb_no_crm_group = ?, fb_no_stages_group = ?, fb_no_friend_request = ?, fb_no_crm_message = ?, fb_no_ai_comment = ?, fb_advanced_novadata = ?, fb_no_friend_requests_received = ?, fb_no_of_birthday_wishes = ?, insta_no_crm_group = ?, insta_no_stages_group = ?, insta_no_friend_request = ?, insta_no_crm_message = ?, insta_no_ai_comment = ?, insta_advanced_novadata = ?, insta_no_friend_requests_received = ?, insta_no_of_birthday_wishes = ?, fb_messages = ?, insta_messages = ?, ai_credits_new = ?, tags_pipelines = ? where userid = ?",
          [
            limitsData.fb_no_crm_group,
            limitsData.fb_no_stages_group,
            limitsData.fb_no_friend_request,
            limitsData.fb_no_crm_message,
            limitsData.fb_no_ai_comment,
            limitsData.fb_advanced_novadata,
            limitsData.fb_no_friend_requests_received,
            limitsData.fb_no_of_birthday_wishes,
            limitsData.inst_no_crm_group,
            limitsData.inst_no_stages_group,
            limitsData.inst_no_friend_request,
            limitsData.inst_no_crm_message,
            limitsData.inst_no_ai_comment,
            limitsData.inst_advanced_novadata,
            limitsData.inst_no_friend_requests_received,
            limitsData.inst_no_of_birthday_wishes,
            limitsData.fb_messages,
            limitsData.insta_messages,
            limitsData.ai_credits_new,
            limitsData.tags_pipelines,
            selectUserDataResult[0]?.id,
          ]
        );

        //end plan limits


      }

      // Check if pkgName is not defined
      if (!pkgName) {
        // Safely access postData.content.unbilled_charges
        const unbilledCharges = postData?.content?.unbilled_charges;

        // Check if unbilledCharges is an array and has at least one element
        if (Array.isArray(unbilledCharges) && unbilledCharges.length > 0)
          pkgName = unbilledCharges[0]?.description;

        // If pkgName is still not defined, set it to planId
        if (!pkgName) pkgName = planId;
      }

      await Qry(
        "update new_packages set pkg_name = ?, amount = ?, planid = ?, activatedAt = ?, nextBillingAt = ?, sub_type = ? where customerid = ? and type = ?",
        [
          pkgName,
          totalAmount,
          planId,
          activatedAt,
          nextBillingAt,
          billingPeriodUnit,
          customerId,
          "package",
        ]
      );

      await Qry(
        "update usersdata set connect_status = ?, crm_status = ?, birthday_status = ?, unfollow_status = ?, activated_at=? where id = ?",
        ["On", "On", "On", "On", activated_at, selectUserDataResult[0]?.id]
      );
    }
    // Event end subscription changed

    // Event start subscription Created
    if (eventType === "subscription_created" && (invoiceStatus === "paid" || trialStatus === "in_trial")) {

      const randomCode = postData?.content?.customer?.cf_random_code;
      const sponsorRnadomCode =
        postData?.content?.customer?.cf_sponsor_random_code;
      const emailToken = postData?.content?.customer?.cf_email_token;
      const firstname = postData?.content?.customer?.first_name;
      const lastname = postData?.content?.customer?.last_name;
      const email = postData?.content?.customer?.email;
      const mobile = postData?.content?.customer?.phone;
      const address1 = postData?.content?.customer?.billing_address?.line1;
      const country = postData?.content?.customer?.billing_address?.country;
      const language = postData?.content?.customer?.cf_language;
      let company = postData?.content?.customer?.cf_company;
      const zip_code = postData?.content?.billing_address?.zip;
      const city = postData?.content?.customer?.billing_address?.city;
      const birthday = "";
      let amount = postData?.content?.invoice?.amount_paid / 100;
      let planId = postData?.content?.subscription?.subscription_items[0]?.item_price_id;
      const subscriptionId = postData?.content?.subscription?.id;
      const subscriptionStatus = "Active";
      const subscriptionType = postData?.content?.subscription?.billing_period_unit;
      const subscriptionPeriod = postData?.content?.subscription?.billing_period;
      let maskedNumber = postData?.content?.card?.masked_number;
      let parent_id = postData?.content?.customer?.cf_cf_parent_id;
      let reseller_website = postData?.content?.customer?.cf_reseller_website;
      if (!planId.includes('Affiliate-Fee')) {

        if (reseller_website && reseller_website != undefined && reseller_website != '') {
          reseller_website = reseller_website;
        } else {
          reseller_website = 'app';
        }
        const selectUserDataduplicateQuery = `SELECT COUNT(*) as total 
                                              FROM usersdata 
                                              WHERE (username = ? OR email = ?) AND website = 'nuskin'`;

        const selectUserDataduplicateResult = await Qry(
          selectUserDataduplicateQuery,
          [customerId, email, reseller_website]
        );

        if (selectUserDataduplicateResult[0].total === 0) {
          if (!company) {
            company = "";
          }

          if (!maskedNumber) {
            maskedNumber = "";
          }

          const date = new Date().toISOString().slice(0, 19).replace("T", " ");

          let encryptedPassword;

          const selectSponsorQuery = `SELECT * FROM usersdata WHERE randomcode = ?`;
          const selectSponsorResult = await Qry(selectSponsorQuery, [
            sponsorRnadomCode,
          ]);
          let userSponsorId = selectSponsorResult[0].id;
          let l2SponsorId = selectSponsorResult[0]?.sponsorid || 0;

          const selectRandomCodeQuery11 = `SELECT * FROM password WHERE randomcode = ?`;
          const selectRandomeCodeResult = await Qry(selectRandomCodeQuery11, [
            randomCode,
          ]);

          encryptedPassword = selectRandomeCodeResult[0].password;

          const selectPlansQuery = `SELECT * FROM plans WHERE plan_id = ?`;
          const selectPlansResult = await Qry(selectPlansQuery, [planId]);

          let subDomain = selectPlansResult[0].subdomain;
          let connections = (selectPlansResult && selectPlansResult[0]) ? selectPlansResult[0].connections : 0;
          let limitsName = selectPlansResult[0].limits;
          let trialStatus = selectPlansResult[0].trial;

          let trial;
          let trial_end = 0;
          let trial_start = 0;
          if (trialStatus === "Yes") {
            trial = "Active";
            trial_end = postData?.content?.subscription?.trial_end;
            trial_start = postData?.content?.subscription?.trial_start;
            amount = 0;
          } else {
            trial = "Inactive";
          }

          let newUserId;
          const insertResult = await Qry(
            `INSERT INTO usersdata (mobile,sponsorid,l2_sponsorid,leg_position,username,password,email,country, company, address1, zip_code, city, language, firstname, lastname, randomcode, emailtoken,masked_number,status,customerid, sub_type, plan_period,plan_pkg,plan_price, emailstatus, birth_date, connection_type, parent_id, website, trial, trial_status, trial_start, trial_end, activated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              mobile,
              userSponsorId,
              l2SponsorId,
              selectSponsorResult[0].referral_side,
              email,
              encryptedPassword,
              email,
              country,
              company,
              address1,
              zip_code,
              city,
              language,
              firstname,
              lastname,
              randomCode,
              emailToken,
              maskedNumber,
              "Approved",
              customerId,
              subscriptionType,
              subscriptionPeriod,
              limitsName,
              planPrice,
              "verified",
              birthday,
              connections,
              parent_id,
              reseller_website,
              trialStatus,
              trial,
              trial_start,
              trial_end,
              activated_at
            ]
          );
          newUserId = insertResult.insertId;

          if (newUserId) {
            try {
              createDefaultTagsAndMessages(newUserId, language ?? "en");
            } catch (error) { }
          }

          const updateRandomCode = await Qry(
            "update password set status = ? where id = ?",
            ["Approved", selectRandomeCodeResult[0].id]
          );

          const insertPackageResult = await Qry(
            `INSERT INTO new_packages(userid, amount, subscriptionid, customerid, currency, planid, activatedAt, nextBillingAt, status, pkg_name, sub_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newUserId,
              amount,
              subscriptionId,
              customerId,
              currencyCode,
              planId,
              activatedAt,
              nextBillingAt,
              subscriptionStatus,
              pkgName,
              subscriptionType,
            ]
          );

          if (subDomain === "app" && trialStatus === "No") {
            // start level bonus
            let i = 1;
            let s_id = userSponsorId;
            while (i <= 2 && s_id !== 0) {
              const sponsorData = await Qry(
                "SELECT * FROM usersdata WHERE id = ?",
                [s_id]
              );

              const insertTransactionData = await Qry(
                "INSERT INTO transactions (receiverid, senderid, amount, details, type, event_type, currency, paid_amount, plan_id, sub_type, plan_period, activated_at, nextBillingAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                  s_id,
                  newUserId,
                  0,
                  ``,
                  `Level ${i} Bonus`,
                  eventType,
                  currencyCode,
                  amount,
                  planID,
                  billingPeriodUnit,
                  billingPeriod,
                  activatedAt,
                  nextBillingAt,
                ]
              );

              if (sponsorData[0].sponsorid == 0) {
                if (i === 1) {
                  await Qry(
                    "INSERT INTO transactions (receiverid, senderid, amount, details, type, event_type, currency, paid_amount, plan_id, sub_type, plan_period, activated_at, nextBillingAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [
                      0,
                      newUserId,
                      0,
                      ``,
                      `Level 2 Bonus`,
                      eventType,
                      currencyCode,
                      amount,
                      planID,
                      billingPeriodUnit,
                      billingPeriod,
                      activatedAt,
                      nextBillingAt,
                    ]
                  );
                }

                s_id = 0;
              } else {
                s_id = sponsorData[0].sponsorid;
              }

              i++;
            }
            // end level bonus
          }

          await Qry(
            "UPDATE usersdata SET `currency` = ? WHERE id = ?",
            [currencyCode, newUserId]
          );

          //start plan limits
          let limitsQueury;
          limitsQueury = await Qry(
            "SELECT * from chargbee_packages_limits WHERE pkg_id = ?",
            [limitsName]
          );

          let limitsData = limitsQueury[0];

          await Qry(
            `INSERT INTO users_limits(userid, fb_no_crm_group, fb_no_stages_group, fb_no_friend_request, fb_no_crm_message, fb_no_ai_comment, fb_advanced_novadata, fb_no_friend_requests_received, fb_no_of_birthday_wishes, insta_no_crm_group, insta_no_stages_group, insta_no_friend_request, insta_no_crm_message, insta_no_ai_comment, insta_advanced_novadata, insta_no_friend_requests_received, insta_no_of_birthday_wishes,
            fb_messages,insta_messages,ai_credits_new,tags_pipelines) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newUserId,
              limitsData.fb_no_crm_group,
              limitsData.fb_no_stages_group,
              limitsData.fb_no_friend_request,
              limitsData.fb_no_crm_message,
              limitsData.fb_no_ai_comment,
              limitsData.fb_advanced_novadata,
              limitsData.fb_no_friend_requests_received,
              limitsData.fb_no_of_birthday_wishes,
              limitsData.inst_no_crm_group,
              limitsData.inst_no_stages_group,
              limitsData.inst_no_friend_request,
              limitsData.inst_no_crm_message,
              limitsData.inst_no_ai_comment,
              limitsData.inst_advanced_novadata,
              limitsData.inst_no_friend_requests_received,
              limitsData.inst_no_of_birthday_wishes,
              limitsData.fb_messages,
              limitsData.insta_messages,
              limitsData.ai_credits_new,
              limitsData.tags_pipelines,
            ]
          );

          //end plan limits

          await Qry(
            "update usersdata set connect_status = ?, crm_status = ?, birthday_status = ?, unfollow_status = ? where id = ?",
            ["On", "On", "On", "On", newUserId]
          );
        }
      }
    }
    // Event end subscription Created

    // Event start subscription activated (trial subscription)
    if (eventType === "subscription_activated" && invoiceStatus === "paid") {
      const selectPlansQuery = `SELECT * FROM plans WHERE plan_id = ?`;
      const selectPlansResult = await Qry(selectPlansQuery, [entityId]);

      let subDomain = selectPlansResult[0].subdomain;

      if (subDomain === "app") {
        // start level bonus
        let i = 1;
        let s_id = selectUserDataResult[0]?.sponsorid;
        while (i <= 2 && s_id !== 0) {
          const sponsorData = await Qry(
            "SELECT * FROM usersdata WHERE id = ?",
            [s_id]
          );

          await Qry(
            "INSERT INTO transactions (receiverid, senderid, amount, details, type, event_type, currency, paid_amount, plan_id, sub_type, plan_period, activated_at, nextBillingAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
              s_id,
              selectUserDataResult[0]?.id,
              0,
              ``,
              `Level ${i} Bonus`,
              eventType,
              currencyCode,
              amount,
              planID,
              billingPeriodUnit,
              billingPeriod,
              activatedAt,
              nextBillingAt,
            ]
          );

          if (sponsorData && sponsorData[0] && sponsorData[0].sponsorid == 0) {
            if (i === 1) {
              await Qry(
                "INSERT INTO transactions (receiverid, senderid, amount, details, type, event_type, currency, paid_amount, plan_id, sub_type, plan_period, activated_at, nextBillingAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                  0,
                  selectUserDataResult[0]?.id,
                  0,
                  ``,
                  `Level 2 Bonus`,
                  eventType,
                  currencyCode,
                  amount,
                  planID,
                  billingPeriodUnit,
                  billingPeriod,
                  activatedAt,
                  nextBillingAt,
                ]
              );
            }
            s_id = 0;
          } else {
            s_id = (sponsorData && sponsorData[0]) ? sponsorData[0].sponsorid : 0;
          }

          i++;
        }
        // end level bonus
      }

      await Qry(
        "update new_packages set activatedAt = ?, nextBillingAt = ?, status = ? where customerid = ? and type = ?",
        [activatedAt, nextBillingAt, "Active", customerId, "package"]
      );

      await Qry(
        "update usersdata set sub_type = ? ,plan_period = ? , plan_pkg = ?, subscription_status = ?, trial_status = ?, activated_at=? where id = ?",
        [
          billingPeriodUnit,
          billingPeriod,
          pakageName,
          eventType,
          "Inactive",
          activated_at,
          selectUserDataResult[0]?.id,
        ]
      );
    }
    // Event end subscription activated (trial subscription)

    // Event for subscription reactivated
    if (eventType === "subscription_reactivated") {
      const totalAmount =
        postData?.content?.subscription?.subscription_items[0]?.amount / 100;
      let planId =
        postData?.content?.subscription?.subscription_items[0]?.item_price_id;

      const selectPlansQuery = `SELECT * FROM plans WHERE plan_id = ?`;
      const selectPlansResult = await Qry(selectPlansQuery, [planId]);

      let subDomain = selectPlansResult[0].subdomain;
      let connections = selectPlansResult[0].connections;
      let limitsName = selectPlansResult[0].limits;
      let trialStatus = selectUserDataResult[0]?.trial_status;

      if (subDomain === "app" && trialStatus !== "Active" && amount) {
        // start level bonus
        let i = 1;
        let s_id = selectUserDataResult[0]?.sponsorid;
        while (i <= 2 && s_id !== 0) {
          const sponsorData = await Qry(
            "SELECT * FROM usersdata WHERE id = ?",
            [s_id]
          );

          // check already entry for sponser L1
          const currentDateNow = new Date();
          const startOfMonth = new Date(currentDateNow.getFullYear(), currentDateNow.getMonth(), 1);
          const endOfMonth = new Date(currentDateNow.getFullYear(), currentDateNow.getMonth() + 1, 0, 23, 59, 59);

          const existingTransaction = await Qry(
            "SELECT id, paid_amount FROM transactions WHERE receiverid = ? AND senderid = ? AND createdat BETWEEN ? AND ?",
            [s_id, selectUserDataResult[0]?.id, startOfMonth, endOfMonth]
          );

          if (existingTransaction.length > 0) {
            await Qry(
              "UPDATE transactions SET paid_amount = ?, event_type=? WHERE id = ?",
              [
                amount,
                eventType,
                existingTransaction[0].id
              ]
            );
          } else {
            await Qry(
              "INSERT INTO transactions (receiverid, senderid, amount, details, type, event_type, currency, paid_amount, plan_id, sub_type, plan_period, activated_at, nextBillingAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [
                s_id,
                selectUserDataResult[0]?.id,
                0,
                ``,
                `Level ${i} Bonus`,
                eventType,
                currencyCode,
                amount,
                planID,
                billingPeriodUnit,
                billingPeriod,
                activatedAt,
                nextBillingAt,
              ]
            );
          }

          if (sponsorData[0]?.sponsorid == 0) {
            if (i === 1) {
              await Qry(
                "INSERT INTO transactions (receiverid, senderid, amount, details, type, event_type, currency, paid_amount, plan_id, sub_type, plan_period, activated_at, nextBillingAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                  0,
                  selectUserDataResult[0]?.id,
                  0,
                  ``,
                  `Level 2 Bonus`,
                  eventType,
                  currencyCode,
                  amount,
                  planID,
                  billingPeriodUnit,
                  billingPeriod,
                  activatedAt,
                  nextBillingAt,
                ]
              );
            }

            s_id = 0;
          } else {
            s_id = sponsorData[0]?.sponsorid;
          }
          i++;
        }
        // end level bonus
      }

      await Qry(
        "UPDATE usersdata SET `currency` = ?, connection_type = ?, sub_type = ?, plan_period = ?,plan_pkg = ?, plan_price = ?, for_renewal = ?, subscription_status = ? WHERE id = ?",
        [
          currencyCode,
          connections,
          billingPeriodUnit,
          billingPeriod,
          limitsName,
          planPrice,
          "",
          eventType,
          selectUserDataResult[0]?.id,
        ]
      );

      //start plan limits
      let limitsQueury;
      limitsQueury = await Qry(
        "SELECT * from chargbee_packages_limits WHERE pkg_id = ?",
        [limitsName]
      );

      let limitsData = limitsQueury[0];

      await Qry(
        "update users_limits set fb_no_crm_group = ?, fb_no_stages_group = ?, fb_no_friend_request = ?, fb_no_crm_message = ?, fb_no_ai_comment = ?, fb_advanced_novadata = ?, fb_no_friend_requests_received = ?, fb_no_of_birthday_wishes = ?, insta_no_crm_group = ?, insta_no_stages_group = ?, insta_no_friend_request = ?, insta_no_crm_message = ?, insta_no_ai_comment = ?, insta_advanced_novadata = ?, insta_no_friend_requests_received = ?, insta_no_of_birthday_wishes = ?, fb_messages = ?, insta_messages = ?, ai_credits_new = ?, tags_pipelines = ? where userid = ?",
        [
          limitsData.fb_no_crm_group,
          limitsData.fb_no_stages_group,
          limitsData.fb_no_friend_request,
          limitsData.fb_no_crm_message,
          limitsData.fb_no_ai_comment,
          limitsData.fb_advanced_novadata,
          limitsData.fb_no_friend_requests_received,
          limitsData.fb_no_of_birthday_wishes,
          limitsData.inst_no_crm_group,
          limitsData.inst_no_stages_group,
          limitsData.inst_no_friend_request,
          limitsData.inst_no_crm_message,
          limitsData.inst_no_ai_comment,
          limitsData.inst_advanced_novadata,
          limitsData.inst_no_friend_requests_received,
          limitsData.inst_no_of_birthday_wishes,
          limitsData.fb_messages,
          limitsData.insta_messages,
          limitsData.ai_credits_new,
          limitsData.tags_pipelines,
          selectUserDataResult[0]?.id,
        ]
      );

      //end plan limits

      // Check if pkgName is not defined
      if (!pkgName) {
        // Safely access postData.content.unbilled_charges
        const unbilledCharges = postData?.content?.unbilled_charges;

        // Check if unbilledCharges is an array and has at least one element
        if (Array.isArray(unbilledCharges) && unbilledCharges.length > 0)
          pkgName = unbilledCharges[0]?.description;

        // If pkgName is still not defined, set it to planId
        if (!pkgName) pkgName = planId;
      }

      await Qry(
        "update new_packages set pkg_name = ?, amount = ?, planid = ?, activatedAt = ?, nextBillingAt = ?, sub_type = ? where customerid = ? and type = ?",
        [
          pkgName,
          totalAmount,
          planId,
          activatedAt,
          nextBillingAt,
          billingPeriodUnit,
          customerId,
          "package",
        ]
      );

      await Qry(
        "update usersdata set connect_status = ?, crm_status = ?, birthday_status = ?, unfollow_status = ?, login_status = ? where id = ?",
        ["On", "On", "On", "On", "Unblock", selectUserDataResult[0]?.id]
      );


      if (postData?.content?.subscription?.status == 'in_trial') {

        var trial_start_date = postData?.content?.subscription?.trial_start;
        var trial_end_date = postData?.content?.subscription?.trial_end;

        await Qry(
          "update usersdata set trial_status=?, trial_start = ?, trial_end = ?, login_status = ?, activated_at=? where id = ?",
          ['Active', trial_start_date, trial_end_date, "Unblock", activated_at, selectUserDataResult[0]?.id]
        );
      }

    }

    //Event start subscription paused
    if (eventType === "subscription_paused") {
      let planId = postData?.content?.subscription?.subscription_items[0]?.item_price_id;

      if (
        planId === "Affiliate-Fee-EUR-Yearly" ||
        planId === "Affiliate-Fee-USD-Yearly"
      ) {
        await Qry(
          "update usersdata set user_type = ? where id = ?",
          ["Normal", selectUserDataResult[0]?.id]
        );
      } else {
        await Qry(
          "update new_packages set status = ?, cancellation_date = ?, is_cancellation_scheduled= 0 where customerid = ? and type = ?",
          [eventType, cancelled_at, customerId, "package"]
        );
        await Qry(
          "update usersdata set login_status = ?, subscription_status = ? where id = ?",
          ["Block", eventType, selectUserDataResult[0]?.id]
        );
      }
    }

    // Event for subscription resumed
    if (eventType === "subscription_resumed") {
      const totalAmount = postData?.content?.subscription?.subscription_items[0]?.amount / 100;
      let planId = postData?.content?.subscription?.subscription_items[0]?.item_price_id;

      const selectPlansQuery = `SELECT * FROM plans WHERE plan_id = ?`;
      const selectPlansResult = await Qry(selectPlansQuery, [planId]);
      let connections = selectPlansResult[0].connections;
      let limitsName = selectPlansResult[0].limits;

      await Qry(
        "UPDATE usersdata SET `currency` = ?, connection_type = ?, sub_type = ?, plan_period = ?,plan_pkg = ?, plan_price = ?, for_renewal = ?, subscription_status = ? WHERE id = ?",
        [
          currencyCode,
          connections,
          billingPeriodUnit,
          billingPeriod,
          limitsName,
          planPrice,
          "",
          eventType,
          selectUserDataResult[0]?.id,
        ]
      );

      // Check if pkgName is not defined
      if (!pkgName) {
        // Safely access postData.content.unbilled_charges
        const unbilledCharges = postData?.content?.unbilled_charges;

        // Check if unbilledCharges is an array and has at least one element
        if (Array.isArray(unbilledCharges) && unbilledCharges.length > 0)
          pkgName = unbilledCharges[0]?.description;

        // If pkgName is still not defined, set it to planId
        if (!pkgName) pkgName = planId;
      }

      await Qry(
        "update new_packages set pkg_name = ?, amount = ?, planid = ?, activatedAt = ?, nextBillingAt = ?, sub_type = ? where customerid = ? and type = ?",
        [
          pkgName,
          totalAmount,
          planId,
          activatedAt,
          nextBillingAt,
          billingPeriodUnit,
          customerId,
          "package",
        ]
      );

      await Qry(
        "update usersdata set connect_status = ?, crm_status = ?, birthday_status = ?, unfollow_status = ?, login_status = ?, activated_at=? where id = ?",
        ["On", "On", "On", "On", "Unblock", activated_at, selectUserDataResult[0]?.id]
      );
    }

    // eventTypeValue === "charge"
    if (entityType === "charge_item_price" && invoiceStatus == "paid") {
      const selectUserDataQueryEvent = `SELECT * FROM usersdata WHERE customerid = ?`;
      const selectUserEvent = await Qry(selectUserDataQueryEvent, [customerId]);

      if(selectUserEvent[0]?.id && selectUserEvent[0]?.id != null && selectUserEvent[0]?.id != undefined &&
        (entityId == 'Formation-Sonny-Novalya-Transformer-vos-leads-en-RDV-qualifies-EUR' ||
          entityId == 'Formation-Sonny-Novalya-Transformer-vos-leads-en-RDV-qualifies-USD' ||
          entityId == 'Formation-Leads-en-RDV-Qualifies-Basic-Plan-EUR-Monthly' || 
          entityId == 'Formation-Leads-en-RDV-Qualifies-Basic-Plan-USD-Monthly'
        )){ //for course
        
        const insert_course = await Qry(
          "INSERT INTO user_courses (user_id, course_name, course_chargebe_id) VALUES (?, ?, ?)",
          [
            selectUserEvent[0]?.id,
            pkgName,
            entityId
          ]
        );


        await Qry(
          "INSERT INTO transactions (receiverid, senderid,  details, type, event_type, currency, paid_amount) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            selectUserDataResult[0]?.sponsorid,
            selectUserDataResult[0]?.id,
            entityId,
            `Level 1 Bonus`,
            eventType,
            currencyCode,
            amount,
          ]
        );

      } else { // for tickets
        const getChargeQry = `SELECT isAlreadyCharge  FROM usersdata WHERE id = ?`
        const getChargeResult = await Qry(getChargeQry, [selectUserEvent[0]?.id]);

        const getTicketQry = `SELECT total_tickets_sold  FROM ticket_count WHERE id = ?`
        const getTicketResult = await Qry(getTicketQry, 1);

        let TicketCount = getTicketResult[0]?.total_tickets_sold
        TicketCount = TicketCount + 1;

        const isAlreadyCharge = Number(getChargeResult[0]?.isAlreadyCharge) || 0;
        const count = isAlreadyCharge;

        if (selectUserEvent[0]?.id) {

          await Qry("update usersdata set isAlreadyCharge = ? where id = ?",
            [count, selectUserEvent[0]?.id]
          );
        }
        await Qry("update ticket_count set total_tickets_sold = ? where id = ?",
          [TicketCount, 1]
        );
      }
    }

    res.status(200).json({
      status: "success",
      message: eventType,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({ status: "error", message: e.message });
  }
};

exports.solvedyearlypoints = async (req, res) => {
  try {
    const postData = req.body;
    let newUserId = postData.userid;
    let activatedAt = postData.activatedat;
    let binaryVolume = postData.binaryVolume;

    binaryVolume = Math.ceil(binaryVolume / 12);

    const selectLeftBinaryPointsUsers = await Qry(
      "WITH RECURSIVE UserTree AS (SELECT `id`, `userid`, `pid`, `leg` FROM `binarytree` WHERE `userid` = ? UNION ALL SELECT bt.`id`, bt.`userid`, bt.`pid`, bt.`leg` FROM `binarytree` bt JOIN UserTree ut ON bt.`userid` = ut.`pid`) SELECT * FROM UserTree WHERE leg = ? ",
      [newUserId, "L"]
    );
    const leftreceiverIds = selectLeftBinaryPointsUsers.map((row) => row.pid);
    let leftDataToInsert = JSON.stringify({ receiver_ids: leftreceiverIds });

    const selectRightBinaryPointsUsers = await Qry(
      "WITH RECURSIVE UserTree AS (SELECT `id`, `userid`, `pid`, `leg` FROM `binarytree` WHERE `userid` = ? UNION ALL SELECT bt.`id`, bt.`userid`, bt.`pid`, bt.`leg` FROM `binarytree` bt JOIN UserTree ut ON bt.`userid` = ut.`pid`) SELECT * FROM UserTree WHERE leg = ? ",
      [newUserId, "R"]
    );
    const rightreceiverIds = selectRightBinaryPointsUsers.map((row) => row.pid);
    let rightDataToInsert = JSON.stringify({ receiver_ids: rightreceiverIds });

    if (leftreceiverIds.length > 0) {
    } else {
      leftDataToInsert = null;
    }

    if (rightreceiverIds.length > 0) {
    } else {
      rightDataToInsert = null;
    }

    const activated_date = activatedAt * 1000;

    const providedDate = new Date(activated_date);
    const providedDay = providedDate.getDate();
    for (let i = 0; i <= 12; i++) {
      if (i > 1) {
        const newDate = new Date(activated_date);
        newDate.setDate(1);
        newDate.setMonth(newDate.getMonth() + i);
        if (providedDay === 30 || providedDay === 31) {
          newDate.setDate(0); // Set the date to the last day of the previous month
        } else {
          newDate.setDate(providedDay);
        }
        const formattedDate = newDate.toISOString().slice(0, 10);
        const insertYearlyPoints = await Qry(
          "insert into yearly_points(senderid,points_date,points,left_receiver_ids, right_receiver_ids) values (?, ?, ?, ?, ?)",
          [
            newUserId,
            formattedDate,
            binaryVolume,
            leftDataToInsert,
            rightDataToInsert,
          ]
        );
      }
    }
    res.status(200).json({ status: "success" });
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.yearlyPointsMigration = async (req, res) => {
  try {
    const selectYearlyPoints = await Qry(
      "SELECT * FROM `yearly_pointsold` WHERE status = 'Pending' GROUP by user_name"
    );
    const yearlyPointsData = selectYearlyPoints.map(async (row) => {
      const oldUserData = await Qry(
        "select * from usersdata where username = ?",
        [row.user_name]
      );
      const newUserId = oldUserData[0].id;

      const selectLeftBinaryPointsUsers = await Qry(
        "WITH RECURSIVE UserTree AS (SELECT `id`, `userid`, `pid`, `leg` FROM `binarytree` WHERE `userid` = ? UNION ALL SELECT bt.`id`, bt.`userid`, bt.`pid`, bt.`leg` FROM `binarytree` bt JOIN UserTree ut ON bt.`userid` = ut.`pid`) SELECT * FROM UserTree WHERE leg = ? ",
        [newUserId, "L"]
      );
      const leftreceiverIds = selectLeftBinaryPointsUsers.map((row) => row.pid);
      let leftDataToInsert = JSON.stringify({ receiver_ids: leftreceiverIds });

      const selectRightBinaryPointsUsers = await Qry(
        "WITH RECURSIVE UserTree AS (SELECT `id`, `userid`, `pid`, `leg` FROM `binarytree` WHERE `userid` = ? UNION ALL SELECT bt.`id`, bt.`userid`, bt.`pid`, bt.`leg` FROM `binarytree` bt JOIN UserTree ut ON bt.`userid` = ut.`pid`) SELECT * FROM UserTree WHERE leg = ? ",
        [newUserId, "R"]
      );
      const rightreceiverIds = selectRightBinaryPointsUsers.map(
        (row) => row.pid
      );
      let rightDataToInsert = JSON.stringify({
        receiver_ids: rightreceiverIds,
      });

      if (leftreceiverIds.length < 1) {
        leftDataToInsert = null;
      }
      if (rightreceiverIds.length < 1) {
        rightDataToInsert = null;
      }

      const selectoldPointsDate = await Qry(
        "SELECT * FROM `yearly_pointsold` WHERE user_name = ? limit 11",
        [row.user_name]
      );
      selectoldPointsDate.map(async (oldPointsRow) => {
        const insertYearlyPoints = await Qry(
          "insert into yearly_points(senderid,points_date,points,left_receiver_ids, right_receiver_ids, status) values (?, ?, ?, ?, ?, ?)",
          [
            newUserId,
            oldPointsRow.points_date,
            oldPointsRow.points,
            leftDataToInsert,
            rightDataToInsert,
            oldPointsRow.status,
          ]
        );
      });
    });
    res.status(200).json({
      status: "success",
      message: "ok",
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.cronjobrankforoctober = async (req, res) => {
  try {
    // const insertCronJob = await Qry("INSERT INTO `dummy`(`d_data`) VALUES (?)", ['test cronjobrank']);

    const selectUserQuery = `SELECT * FROM usersdata WHERE usertype = ? and user_type = ?`;
    const selectUserResult = await Qry(selectUserQuery, [
      "user",
      "Distributor",
    ]);

    let dat = "2023-11-30";

    // let data = [];

    let x = 1;
    for (const user of selectUserResult) {
      // start count of left and right user
      let direct_active_referrals_obj =
        await pre_month_active_referrals_function(user.id, 11);
      let directActiveLeftUsers =
        direct_active_referrals_obj.leftPersonalActiveMembers;
      let directActiveRightUsers =
        direct_active_referrals_obj.rightPersonalActiveMembers;
      // end start count of left and right user

      // start Sum of left and right Binary Points
      let binary_points_obj = await pre_month_organization_points_function(
        user.id,
        11
      );
      let leftBinaryPoints = binary_points_obj.leftOrganizationPoints;
      let rightBinaryPoints = binary_points_obj.rightOrganizationPoints;
      // end start Sum of left and right Binary Points

      let rank = 0;
      let currentRrank = user.rank;
      let currentLifeTimeRank = user.life_time_rank;
      let userType = user.user_type;

      if (
        (directActiveLeftUsers >= 2 &&
          directActiveRightUsers >= 1 &&
          leftBinaryPoints >= 450 &&
          rightBinaryPoints >= 450 &&
          userType == "Distributor") ||
        (directActiveLeftUsers >= 1 &&
          directActiveRightUsers >= 2 &&
          leftBinaryPoints >= 450 &&
          rightBinaryPoints >= 450 &&
          userType == "Distributor")
      ) {
        rank = 1;
      }

      if (
        (directActiveLeftUsers >= 2 &&
          directActiveRightUsers >= 1 &&
          leftBinaryPoints >= 1620 &&
          rightBinaryPoints >= 1620 &&
          userType == "Distributor") ||
        (directActiveLeftUsers >= 1 &&
          directActiveRightUsers >= 2 &&
          leftBinaryPoints >= 1620 &&
          rightBinaryPoints >= 1620 &&
          userType == "Distributor")
      ) {
        rank = 2;
      }

      if (
        directActiveLeftUsers >= 2 &&
        directActiveRightUsers >= 2 &&
        leftBinaryPoints >= 4500 &&
        rightBinaryPoints >= 4500 &&
        userType == "Distributor"
      ) {
        rank = 3;
      }

      if (
        directActiveLeftUsers >= 3 &&
        directActiveRightUsers >= 3 &&
        leftBinaryPoints >= 11700 &&
        rightBinaryPoints >= 11700 &&
        userType == "Distributor"
      ) {
        rank = 4;
      }

      if (
        directActiveLeftUsers >= 5 &&
        directActiveRightUsers >= 5 &&
        leftBinaryPoints >= 36000 &&
        rightBinaryPoints >= 36000 &&
        userType == "Distributor"
      ) {
        rank = 5;
      }

      if (
        directActiveLeftUsers >= 8 &&
        directActiveRightUsers >= 8 &&
        leftBinaryPoints >= 90000 &&
        rightBinaryPoints >= 90000 &&
        userType == "Distributor"
      ) {
        rank = 6;
      }

      if (
        directActiveLeftUsers >= 15 &&
        directActiveRightUsers >= 15 &&
        leftBinaryPoints >= 225000 &&
        rightBinaryPoints >= 225000 &&
        userType == "Distributor"
      ) {
        rank = 7;
      }

      if (
        directActiveLeftUsers >= 25 &&
        directActiveRightUsers >= 25 &&
        leftBinaryPoints >= 450000 &&
        rightBinaryPoints >= 450000 &&
        userType == "Distributor"
      ) {
        rank = 8;
      }

      if (currentRrank != rank) {
        const insertRankSummaryResult = await Qry(
          "INSERT INTO `rank_summary_october`(`userid`, `old_rank`, `new_rank`, `type`, `dat`) VALUES (?,?,?,?,?)",
          [user.id, currentRrank, rank, "Payout Rank", dat]
        );
        const updateUser = await Qry(
          "update usersdata set rank = ? where id = ?",
          [rank, user.id]
        );

        if (rank > currentLifeTimeRank) {
          const updateUser = await Qry(
            "update usersdata set life_time_rank = ? where id = ?",
            [rank, user.id]
          );
        }
      }
      x = x + 1;
    }

    res.status(200).json({
      status: "success",
      message: "ok",
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.cronjobnovarankforoctober = async (req, res) => {
  try {
    const selectUserQuery = `SELECT * FROM usersdata WHERE usertype = ? and user_type = ?`;
    const selectUserResult = await Qry(selectUserQuery, [
      "user",
      "Distributor",
    ]);

    let dat = "2023-11-30";

    let x = 1;
    for (const user of selectUserResult) {
      // start count of left and right user
      let direct_active_referrals_obj =
        await pre_month_active_referrals_function(user.id, 11);
      let directActiveLeftUsers =
        direct_active_referrals_obj.leftPersonalActiveMembers;
      let directActiveRightUsers =
        direct_active_referrals_obj.rightPersonalActiveMembers;

      let totalDirectActiveUsers =
        directActiveLeftUsers + directActiveRightUsers;
      // end start count of left and right user

      // start Sum of left and right Referral Points
      let referral_points_obj = await pre_month_referral_points_function(
        user.id,
        11
      );
      let leftReferralPoints = referral_points_obj.leftReferralPoints;
      let rightReferralPoints = referral_points_obj.rightReferralPoints;

      let totalReferralPoints = leftReferralPoints + rightReferralPoints;
      // end start Sum of left and right Referral Points

      let rank = 0;
      let currentRrank = user.novarank;
      let userType = user.user_type;
      let currentLifeTimeRank = user.nova_life_time_rank;

      if (
        totalDirectActiveUsers >= 3 &&
        totalReferralPoints >= 150 &&
        userType == "Distributor"
      ) {
        rank = 1;
      }

      if (
        totalDirectActiveUsers >= 3 &&
        totalReferralPoints >= 200 &&
        userType == "Distributor"
      ) {
        rank = 2;
      }

      if (
        totalDirectActiveUsers >= 3 &&
        totalReferralPoints >= 250 &&
        userType == "Distributor"
      ) {
        rank = 3;
      }

      if (currentRrank != rank) {
        const insertRankSummaryResult = await Qry(
          "INSERT INTO `rank_summary_october`(`userid`, `old_rank`, `new_rank`, `type`, `dat`) VALUES (?,?,?,?,?)",
          [user.id, currentRrank, rank, "NovaFree Rank", dat]
        );
        const updateUser = await Qry(
          "update usersdata set novarank = ? where id = ?",
          [rank, user.id]
        );

        if (rank > currentLifeTimeRank) {
          const updateUser = await Qry(
            "update usersdata set nova_life_time_rank = ? where id = ?",
            [rank, user.id]
          );
        }
      }
      x = x + 1;
    }

    res.status(200).json({
      status: "success",
      message: "ok",
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.binarybonuspreviousmonthrankforoctober = async (req, res) => {
  try {
    // const insertCronJob = await Qry("INSERT INTO `dummy`(`d_data`) VALUES (?)", ['test cronjobrank']);

    const selectUserQuery = `SELECT * FROM usersdata WHERE usertype = ? and user_type = ?`;
    const selectUserResult = await Qry(selectUserQuery, [
      "user",
      "Distributor",
    ]);

    // let data = [];

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const previousMonth = ((currentMonth + 11) % 12) + 1;
    let x = 1;
    for (const user of selectUserResult) {
      const selectRankSummaryQuery = `SELECT * FROM rank_summary WHERE userid = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now()) ORDER BY id DESC limit 1`;
      const selectRankSummaryResult = await Qry(selectRankSummaryQuery, [
        user.id,
        "Payout Rank",
        previousMonth,
      ]);
      if (selectRankSummaryResult.length > 0) {
        let rank = selectRankSummaryResult[0].new_rank;
        const selectRankQuery = `SELECT * FROM rank where id = ?`;
        const selectRankResult = await Qry(selectRankQuery, [rank]);
        let residuelAmount = parseInt(selectRankResult[0].residuel);

        const insertTransactionsResult = await Qry(
          "INSERT INTO `transactions_october`(`receiverid`, `rankid`, `amount`, `type`, `status`) VALUES (?,?,?,?,?)",
          [user.id, rank, residuelAmount, "Binary Bonus", "Pending"]
        );
      }
      x = x + 1;
    }

    res.status(200).json({
      status: "success",
      message: "ok",
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.cronjobautocouponcsv = async (req, res) => {
  try {
    const subscriptionDetails = (subscriptionId) => {
      return new Promise((resolve, reject) => {
        chargebee.subscription
          .retrieve(subscriptionId)
          .request(function (error, result) {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          });
      });
    };

    const removeCoupon = (subscriptionId) => {
      return new Promise((resolve, reject) => {
        chargebee.subscription
          .remove_coupons(subscriptionId, {})
          .request(function (error, result) {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          });
      });
    };

    const addCoupon = (subscriptionId, couponCode) => {
      return new Promise((resolve, reject) => {
        chargebee.subscription
          .update_for_items(subscriptionId, {
            coupon_ids: [couponCode],
          })
          .request(function (error, result) {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          });
      });
    };

    const csvFilePath = "routes/csvfiles/autocoupon.csv"; // Replace with your CSV file path

    // Create an array to store the parsed CSV data
    const data = [];

    // Read and parse the CSV file
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => {
        data.push(row);
      })
      .on("end", async () => {
        // The CSV file has been fully parsed. You can now work with the data array.

        let x = 1;
        for (const binaryData of data) {
          let username = binaryData.username;
          let coupon = binaryData.coupon;

          const selectUserDataQuery = `SELECT * FROM usersdata WHERE username = ?`;
          const selectUserDataResult = await Qry(selectUserDataQuery, [
            username,
          ]);

          const selectPkgDataQuery = `SELECT * FROM new_packages WHERE userid = ? order by id asc`;
          const selectPkgDataResult = await Qry(selectPkgDataQuery, [
            selectUserDataResult[0].id,
          ]);

          const currentDate = new Date();
          const currentMonth = currentDate.getMonth();
          const previousMonth = ((currentMonth + 11) % 12) + 1;

          let removeCouponData;
          let addCouponData;
          let subscriptionData;

          let subscriptionId = selectPkgDataResult[0].subscriptionid;

          let couponCode = coupon;

          try {
            subscriptionData = await subscriptionDetails(subscriptionId);
            const isCoupon = subscriptionData?.subscription?.coupons;

            if (isCoupon !== undefined) {
              removeCouponData = await removeCoupon(subscriptionId);
            }

            addCouponData = await addCoupon(subscriptionId, couponCode);
            await Qry(
              `update new_packages set coupon = ? where subscriptionid = ?`,
              [couponCode, subscriptionId]
            );
            const insertCronJob = await Qry(
              "INSERT INTO `autocouponsummary`(`userid`, `coupon`) VALUES (?,?)",
              [selectUserDataResult[0].id, couponCode]
            );

            x++;
          } catch (error) { }

          x = x + 1;
        }
      });

    res.status(200).json({
      status: "success",
      message: "okkkk",
    });
  } catch (e) { }
};

exports.cronjobwithdrawalstatus = async (req, res) => {
  try {
    const updateAllUsers = `UPDATE usersdata SET withdrawal_status = ?, withdrawal_processing_status = ?`;
    await Qry(updateAllUsers, [1, 0]);

    const updateAllUsers1 = `UPDATE usersdata SET current_balance_usd_payout = ?, current_balance_eur_payout = ? where subscription_status = ? or subscription_status = ?`;
    await Qry(updateAllUsers1, [
      0,
      0,
      "subscription_cancelled",
      "payment_refunded",
    ]);

    const selectPkgDataQuery = `SELECT * FROM usersdata WHERE user_type = ? and (current_balance_usd_payout>0 or current_balance_eur_payout>0)`;
    const selectPkgDataResult = await Qry(selectPkgDataQuery, ["Distributor"]);

    let conversion_eur_to_usd = await settings_data("conversion");
    let conversion_usd_to_eur = await settings_data("conversion1");
    let feeData = {
      conversion_eur_to_usd: parseFloat(conversion_eur_to_usd[0].keyvalue),
      conversion_usd_to_eur: parseFloat(conversion_usd_to_eur[0].keyvalue),
    };

    for (const user of selectPkgDataResult) {
      let payoutUSDBalance = user.current_balance_usd_payout;
      let payoutEURBalance = user.current_balance_eur_payout;
      let walletAddress = user.wallet_address;
      let bankAccountTitle = user.bank_account_title;
      let outsideBankAccountTitle = user.outside_bank_account_title;
      let eurAmount =
        parseFloat(payoutEURBalance) +
        parseFloat(payoutUSDBalance * feeData.conversion_usd_to_eur);
      let usdAmount =
        parseFloat(payoutUSDBalance) +
        parseFloat(payoutEURBalance * feeData.conversion_eur_to_usd);
      let amount = 0;
      if (walletAddress !== null) {
        amount = usdAmount;
      } else if (walletAddress === null && bankAccountTitle !== null) {
        amount = eurAmount;
      } else if (
        walletAddress === null &&
        bankAccountTitle === null &&
        outsideBankAccountTitle !== null
      ) {
        amount = usdAmount;
      } else {
        amount = eurAmount;
      }

      if (amount >= 30) {
        const updateAllUsers = `UPDATE usersdata SET withdrawal_status = ? where id = ?`;
        await Qry(updateAllUsers, [0, user.id]);
      }
    }

    res.status(200).json({
      status: "success",
      message: "ok",
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.cronjobbalancetransfer = async (req, res) => {
  try {
    const selectUserQuery = `SELECT * FROM usersdata WHERE usertype = ? and user_type = ?`;
    const selectUserResult = await Qry(selectUserQuery, [
      "user",
      "Distributor",
    ]);

    function getLastMonthNumber() {
      var currentDate = new Date();
      var lastMonth = currentDate.getMonth(); // Get current month
      lastMonth = lastMonth === 0 ? 12 : lastMonth; // If January, set to December
      return lastMonth;
    }

    function getYearNumber(lastMonthNumber) {
      let currentDate = new Date();
      let year = currentDate.getFullYear(); // Get current month
      year = lastMonthNumber === 12 ? year - 1 : year;
      // If January, set to December
      return year;
    }

    let lastMonthNumber = getLastMonthNumber();
    let yearNumber = getYearNumber(lastMonthNumber);



    let x = 1;
    for (const user of selectUserResult) {
      let userID = user.id;

      let dataCommission = await total_payment_function(
        userID,
        lastMonthNumber,
        yearNumber
      );
      const updateBalanceQuery = `UPDATE usersdata SET current_balance_usd_payout = current_balance_usd_payout + ?, current_balance_eur_payout = current_balance_eur_payout + ?, current_balance_usd_lastmonth = ?, current_balance_eur_lastmonth = ? WHERE id = ?`;
      await Qry(updateBalanceQuery, [
        dataCommission.totalPaymentUSD,
        dataCommission.totalPaymentEUR,
        dataCommission.totalPaymentUSD,
        dataCommission.totalPaymentEUR,
        userID,
      ]);



      const insertQuery = `INSERT INTO balance_transfer_for_payout (userid, amount_usd, amount_eur) VALUE (?, ?, ?)`;
      await Qry(insertQuery, [
        userID,
        dataCommission.totalPaymentUSD,
        dataCommission.totalPaymentEUR,
      ]);

      x = x + 1;
    }

    const updateAllUsers = `UPDATE usersdata SET withdrawal_status = ?`;
    await Qry(updateAllUsers, [1]);

    res.status(200).json({
      status: "success",
      message: "ok",
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.cronjobpendingpool = async (req, res) => {

};

exports.cronjobpoolone = async (req, res) => {

};

exports.cronjobpoolthreee = async (req, res) => {

};

exports.getpayoutinformationrequest = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const getPayoutInformationQuery =
        "SELECT * FROM `payout_information_request` WHERE userid = ?";
      const payoutInformationData = await Qry(getPayoutInformationQuery, [
        authUser,
      ]);
      res.json({
        status: "success",
        data: payoutInformationData,
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};  

exports.openunfollow = async (req, res) => {
  try {
    const getPayoutInformationQuery =
      "SELECT * FROM `new_packages` WHERE planid = 'SuperNova-NovaBirthday-Pre-lancement-EUR-Monthly' or planid = 'SuperNova-NovaBirthday-Pre-lancement-EUR-Yearly' or planid = 'SuperNova-Pre-lancement-NovaBirthday-EUR-Monthly' or planid = 'SuperNova-Pre-lancement-NovaBirthday-EUR-Yearly' or planid = 'SuperNova-Offre-Pre-lancement-EUR-Monthly' or planid = 'SuperNova-Offre-Pre-lancement-EUR-Yearly' or planid = 'SuperNova-Offre-Spe-Pr-lancement-EUR-Monthly' or planid = 'SuperNova-Offre-Spe-Pr-lancement-EUR-Yearly' or planid = 'SuperNova-EUR-Monthly' or planid = 'SuperNova-EUR-Yearly'";
    const payoutInformationData = await Qry(getPayoutInformationQuery);

    let x = 1;
    for (const data of payoutInformationData) {
      const updateLoginQuery = `UPDATE usersdata SET unfollow_status = ? WHERE id = ?`;
      const updateLoginResult = await Qry(updateLoginQuery, [
        "On",
        data.userid,
      ]);

      x = x + 1;
    }

    res.json({
      status: "success",
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.anuualdatetest = async (req, res) => {
  try {
    // Assuming providedDate is a string in ISO format
    let providedDate = "2023-08-25T22:00:00.000Z";

    // Convert the providedDate string to a Date object
    const dateObj = new Date(providedDate);

    // Initialize an array to store the next 11 months' dates
    const nextMonthsDates = [];

    // Get the current month and year
    let currentMonth = dateObj.getMonth();
    let currentYear = dateObj.getFullYear();
    let tempdate = "";
    // Loop to calculate and store the next 11 months' dates
    for (let i = 0; i < 11; i++) {
      // Calculate the next month
      const nextMonth = (currentMonth + 1) % 12;
      currentYear = currentMonth === 11 ? currentYear + 1 : currentYear;

      // Get the last day of the next month
      const lastDayOfNextMonth = new Date(
        currentYear,
        nextMonth + 1,
        0
      ).getDate();

      // Create a new Date object for the next month
      const newDate = new Date(
        currentYear,
        nextMonth,
        Math.min(dateObj.getDate(), lastDayOfNextMonth),
        dateObj.getHours(),
        dateObj.getMinutes(),
        dateObj.getSeconds(),
        dateObj.getMilliseconds()
      );
      tempdate = newDate.toISOString();

      //insert

      // Convert newDate to ISO format and push to the array
      nextMonthsDates.push(newDate.toISOString());

      // Update currentMonth for the next iteration
      currentMonth = nextMonth;
    }

    // Display the array of next 11 months' dates

    res.status(200).json({
      status: "success",
      message: "ok",
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.openusers = async (req, res) => {
  try {
    let x = 1;
    const limitsQueury1 = await Qry(
      "SELECT * from usersdata WHERE usertype = ?",
      ["user"]
    );
    for (const data of limitsQueury1) {
      const QueuryNewPKG = await Qry(
        "SELECT * from new_packages WHERE userid = ? and type = ?",
        [data.id, "package"]
      );

      let plan_name = QueuryNewPKG[0].planid;

      const limitsQueury = await Qry(
        "SELECT * from chargbee_packages_limits WHERE id = ?",
        [1]
      );
      let limitsData = limitsQueury[0];

      let no_crm_group = limitsData.no_crm_group;
      let no_stages_group = limitsData.no_stages_group;
      let no_friend_request = limitsData.no_friend_request;
      let no_crm_message = limitsData.no_crm_message;
      let no_ai_comment = limitsData.no_ai_comment;
      let advanced_novadata = limitsData.advanced_novadata;
      let no_friend_requests_received = limitsData.no_friend_requests_received;
      let no_of_birthday_wishes = limitsData.no_of_birthday_wishes;

      if (
        plan_name === "Nova-Connect-EUR-Monthly" ||
        plan_name === "Nova-Connect-EUR-Yearly"
      ) {
        no_crm_group = 3;
        no_stages_group = 10;
        no_friend_request = 20;
        no_crm_message = 20;
        no_ai_comment = 5;
        advanced_novadata = 1;
        no_friend_requests_received = 10;
        no_of_birthday_wishes = 10;
      } else if (
        plan_name === "Nova-Connect-Plus-Birthday-EUR-Monthly" ||
        plan_name === "Nova-Connect-Plus-Birthday-EUR-Yearly"
      ) {
        no_friend_request = 50;
        no_friend_requests_received = 25;
        no_crm_group = 10;
        no_stages_group = 50;
        no_crm_message = 50;
        advanced_novadata = 1;
        no_ai_comment = 5;
        no_of_birthday_wishes = 25;
      } else if (
        plan_name === "Nova-Connect-Plus-CRM-EUR-Monthly" ||
        plan_name === "Nova-Connect-Plus-CRM-EUR-Yearly"
      ) {
        no_friend_request = 50;
        no_friend_requests_received = 25;
        no_crm_group = 10;
        no_stages_group = 50;
        no_crm_message = 50;
        advanced_novadata = 1;
        no_ai_comment = 5;
        no_of_birthday_wishes = 25;
      } else if (
        plan_name === "NovaConnect-CRM-Birthday-EUR-Monthly" ||
        plan_name === "NovaConnect-CRM-Birthday-EUR-Yearly"
      ) {
        no_friend_request = 50;
        no_friend_requests_received = 25;
        no_crm_group = 10;
        no_stages_group = 50;
        no_crm_message = 50;
        advanced_novadata = 1;
        no_ai_comment = 5;
        no_of_birthday_wishes = 25;
      } else if (
        plan_name === "NovaCRM-Pre-lancement-EUR-Monthly" ||
        plan_name === "NovaCRM-Pre-lancement-EUR-Yearly"
      ) {
        no_friend_request = 50;
        no_friend_requests_received = 25;
        no_of_birthday_wishes = 25;
        no_crm_group = 10;
        no_stages_group = 50;
        no_crm_message = 50;
        advanced_novadata = 1;
        no_ai_comment = 5;
      } else if (
        plan_name === "SuperNova-EUR-Monthly" ||
        plan_name === "SuperNova-EUR-Yearly"
      ) {
        no_friend_request = 50;
        no_friend_requests_received = 25;
        no_of_birthday_wishes = 25;
        no_crm_group = 10;
        no_stages_group = 50;
        no_crm_message = 50;
        advanced_novadata = 1;
        no_ai_comment = 20;
      } else if (
        plan_name === "SuperNova-NovaBirthday-Pre-lancement-EUR-Monthly" ||
        plan_name === "SuperNova-NovaBirthday-Pre-lancement-EUR-Yearly"
      ) {
        no_friend_request = 50;
        no_friend_requests_received = 25;
        no_of_birthday_wishes = 25;
        no_crm_group = 10;
        no_stages_group = 50;
        no_crm_message = 50;
        advanced_novadata = 1;
        no_ai_comment = 20;
      } else if (
        plan_name === "SuperNova-NovaCRM-Pre-lancement-EUR-Monthly" ||
        plan_name === "SuperNova-NovaCRM-Pre-lancement-EUR-Yearly"
      ) {
        no_friend_request = 50;
        no_friend_requests_received = 25;
        no_of_birthday_wishes = 25;
        no_crm_group = 10;
        no_stages_group = 50;
        no_crm_message = 50;
        advanced_novadata = 1;
        no_ai_comment = 20;
      } else if (
        plan_name === "SuperNova-Offre-Pre-lancement-EUR-Monthly" ||
        plan_name === "SuperNova-Offre-Pre-lancement-EUR-Yearly"
      ) {
        no_friend_request = 50;
        no_friend_requests_received = 25;
        no_of_birthday_wishes = 25;
        no_crm_group = 10;
        no_stages_group = 50;
        no_crm_message = 50;
        advanced_novadata = 1;
        no_ai_comment = 0;
      } else if (
        plan_name === "SuperNova-Offre-Spe-Pr-lancement-EUR-Monthly" ||
        plan_name === "SuperNova-Offre-Spe-Pr-lancement-EUR-Yearly"
      ) {
        no_friend_request = 50;
        no_friend_requests_received = 25;
        no_of_birthday_wishes = 25;
        no_crm_group = 10;
        no_stages_group = 50;
        no_crm_message = 50;
        advanced_novadata = 1;
        no_ai_comment = 0;
      } else if (
        plan_name === "SuperNova-Pre-lancement-NovaBirthday-EUR-Monthly" ||
        plan_name === "SuperNova-Pre-lancement-NovaBirthday-EUR-Yearly"
      ) {
        no_friend_request = 50;
        no_friend_requests_received = 25;
        no_of_birthday_wishes = 25;
        no_crm_group = 10;
        no_stages_group = 50;
        no_crm_message = 50;
        advanced_novadata = 1;
        no_ai_comment = 20;
      } else {
        no_friend_request = no_friend_request;
        no_friend_requests_received = no_friend_requests_received;
        no_of_birthday_wishes = no_of_birthday_wishes;
        no_crm_group = no_crm_group;
        no_stages_group = no_stages_group;
        no_crm_message = no_crm_message;
        advanced_novadata = advanced_novadata;
        no_ai_comment = no_ai_comment;
      }

      const updateUserLimits = await Qry(
        "UPDATE usersdata SET `no_crm_group` = ?, `no_stages_group` = ?, `no_friend_request` = ?, `no_crm_message` = ?, `no_ai_comment` = ?, `advanced_novadata` = ?, `no_friend_requests_received` = ? ,`no_of_birthday_wishes` = ? WHERE id = ?",
        [
          no_crm_group,
          no_stages_group,
          no_friend_request,
          no_crm_message,
          no_ai_comment,
          advanced_novadata,
          no_friend_requests_received,
          no_of_birthday_wishes,
          data.id,
        ]
      );

      x = x + 1;
    }

    res.status(200).json({
      status: "success",
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.openusers1 = async (req, res) => {
  try {
    const emailArray = [
      "e-bourgeois@outlook.fr",
      "mobondt@bluewin.ch",
      "jansory1forever@yahoo.com",
      "tridot_jf@hotmail.fr",
      "info@alfa-coach.fr",
      "lefebvrekatia@hotmail.be",
      "ludie45380@gmail.com",
      "ohana.alegria@gmail.com",
    ];

    let x = 1;
    for (const email of emailArray) {
      const updateQuery = `UPDATE usersdata SET subscription_status = ?, login_status = ? WHERE email = ?`;
      const updateParams = ["subscription_renewed", "Unblock", email];
      const updateResult = await Qry(updateQuery, updateParams);
      x = x + 1;
    }

    let j = 1;
    const limitsQueury1 = await Qry(
      "SELECT * from usersdata WHERE usertype = ?",
      ["user"]
    );
    for (const data of limitsQueury1) {
      const QueuryNewPKG = await Qry(
        "SELECT * from new_packages WHERE userid = ? and type = ?",
        [data.id, "package"]
      );

      let plan_name = QueuryNewPKG[0].pkg_name;

      if (
        plan_name === "Starter" ||
        plan_name === "Unlimited" ||
        plan_name === "Pro"
      ) {
        const limitsQueury = await Qry(
          "SELECT * from chargbee_packages_limits WHERE pkg_id = ?",
          [plan_name]
        );
        let limitsData = limitsQueury[0];

        const updateUserLimits = await Qry(
          "UPDATE usersdata SET `no_crm_group` = ?, `no_stages_group` = ?, `no_friend_request` = ?, `no_crm_message` = ?, `no_ai_comment` = ?, `advanced_novadata` = ?, `no_friend_requests_received` = ?, `no_of_birthday_wishes` = ? WHERE id = ?",
          [
            limitsData.no_crm_group,
            limitsData.no_stages_group,
            limitsData.no_friend_request,
            limitsData.no_crm_message,
            limitsData.no_ai_comment,
            limitsData.advanced_novadata,
            limitsData.no_friend_requests_received,
            limitsData.no_of_birthday_wishes,
            data.id,
          ]
        );

        j = j + 1;
      }
    }

    res.status(200).json({
      status: "success",
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.getpoolreports = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const poolReports = [];

      // First query for Pool 1 Bonus
      const pool1BonusQuery =
        "SELECT *, MONTHNAME(createdat) AS createdMonth, MONTHNAME(approvedat) AS approvedMonth FROM transactions WHERE receiverid = ? AND type = ?";
      const pool1BonusData = await Qry(pool1BonusQuery, [
        authUser,
        "Pool 1 Bonus",
      ]);

      // Loop through pool1BonusData and push each entry to poolReports array
      for (let i = 0; i < pool1BonusData.length; i++) {
        poolReports.push({
          amount: pool1BonusData[i].amount,
          pool: "Pool 1 Bonus",
          createdMonth: pool1BonusData[i].createdMonth,
          approvedMonth: pool1BonusData[i].approvedMonth,
        });
      }

      // Second query for Pool 2 Bonus
      const pool2BonusQuery =
        "SELECT SUM(amount) AS totalAmount, MONTHNAME(createdat) AS createdMonth, MONTHNAME(approvedat) AS approvedMonth FROM transactions WHERE receiverid = ? AND type = ? GROUP BY MONTH(createdat)";
      const pool2BonusData = await Qry(pool2BonusQuery, [
        authUser,
        "Pool 2 Bonus",
      ]);
      pool2BonusData.forEach((entry) => {
        poolReports.push({
          amount: entry.totalAmount,
          pool: "Pool 2 Bonus",
          createdMonth: entry.createdMonth,
          approvedMonth: entry.approvedMonth,
        });
      });

      // Third query for Pool 3 Bonus
      const pool3BonusQuery =
        "SELECT SUM(amount) AS totalAmount, MONTHNAME(createdat) AS createdMonth, MONTHNAME(approvedat) AS approvedMonth FROM transactions WHERE receiverid = ? AND type = ? GROUP BY MONTH(createdat)";
      const pool3BonusData = await Qry(pool3BonusQuery, [
        authUser,
        "Pool 3 Bonus",
      ]);
      pool3BonusData.forEach((entry) => {
        poolReports.push({
          amount: entry.totalAmount,
          pool: "Pool 3 Bonus",
          createdMonth: entry.createdMonth,
          approvedMonth: entry.approvedMonth,
        });
      });

      res.json({
        status: "success",
        data: poolReports,
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.getunilevelreports = async (req, res) => {
  try {
    const auth_id = await checkAuthorization(req, res);
    if (auth_id) {
      const selectQuerLogin = await Qry(
        "SELECT * FROM usersdata WHERE id = ?",
        [auth_id]
      );

      loginUserData = selectQuerLogin[0];

      let postData = req.body;
      let month = postData.month;
      let currentYear = new Date().getFullYear();
      let year = postData?.year || currentYear;
      let commission = await total_payment_function_afcm_tbl(auth_id, month, year);
  
      res.json({
        status: "success",
        data: commission,
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.getpooldistributionreports = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const getpoolQuery =
        "SELECT t.*, ud.username FROM transactions AS t JOIN usersdata AS ud ON t.senderid = ud.id WHERE t.type IN ('Pool 1 Bonus Added', 'Pool 2 Bonus Added', 'Pool 3 Bonus Added', 'Pool 1 Bonus Deducted', 'Pool 2 Bonus Deducted', 'Pool 3 Bonus Deducted')";
      const poolDistributionData = await Qry(getpoolQuery);
      if (poolDistributionData.length > 0) {
        res.json({
          status: "success",
          data: poolDistributionData,
        });
      } else {
        res.json({
          status: "success",
          data: [],
        });
      }
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.getlevelbonusdedcuted = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const getLevelBonusDeducted =
        "SELECT * FROM transactions WHERE type IN ('Level 1 Bonus Deducted', 'Level 2 Bonus Deducted')";
      const levelBonusDeductedData = await Qry(getLevelBonusDeducted);
      if (levelBonusDeductedData.length > 0) {
        res.json({
          status: "success",
          data: levelBonusDeductedData,
        });
      } else {
        res.json({
          status: "success",
          data: [],
        });
      }
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.updateaffiliatecode = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    const postData = req.body;
    if (authUser) {
      const affiliatecode = CleanHTMLData(CleanDBData(postData.affiliatecode));
      const affiliateCodeLength = affiliatecode.length;

      if (affiliateCodeLength < 6 || affiliateCodeLength > 10) {
        res.json({
          status: "error",
          message: "Affiliate Code must be 6 to 10 characters long.",
        });
        return;
      }

      // const alphanumericRegex = /^[a-zA-Z0-9]+$/;
      // if (!alphanumericRegex.test(affiliatecode) || !/[a-zA-Z]/.test(affiliatecode) || !/[0-9]/.test(affiliatecode)) {
      //   res.json({
      //     status: "error",
      //     message: "Affiliate Code must include numbers and letters.",
      //   });
      //   return;
      // }

      if (affiliatecode.toUpperCase() === "NOVALYA") {
        res.json({
          status: "error",
          message: "You can not use NOVALYA as affiliate code.",
        });
        return;
      }

      const selectQuery = `SELECT * FROM usersdata WHERE randomcode = ?`;
      const selectResult = await Qry(selectQuery, [affiliatecode]);

      if (selectResult.length > 0) {
        res.json({
          status: "error",
          message:
            "This affiliate code is already exist you need to chose otherone.",
        });
        return;
      }

      const updateQuery = "UPDATE usersdata SET randomcode = ? WHERE id = ?";
      const updateResult = await Qry(updateQuery, [affiliatecode, authUser]);
      if (updateResult.affectedRows > 0) {
        res.json({
          status: "success",
          message: "Affiliacted Code has been updated successfully",
        });
      }
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.level1count = async (req, res) => {
  try {
    const selectQuery = `SELECT * FROM usersdata WHERE usertype = ?`;
    const selectResult = await Qry(selectQuery, ["user"]);

    let x = 1;
    for (const user of selectResult) {
      let last_per = user.last_percentages;
      if (last_per) {
        let resultArray = last_per.split("*");
        let level1 = parseInt(resultArray[0]);

        if (level1 === 0) {
          let currency = user.currency;
          let spid = user.sponsorid;
          insertTransaction = await Qry(
            "insert into transactions ( receiverid, senderid, amount, type, currency) values ( ?, ?, ?, ?, ? )",
            [spid, user.id, 0, "Level 1 Bonus", currency]
          );
          x = x + 1;
        }
      }
    }

    res.json({
      status: "success",
      message: "ok",
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.setduplicatecommission = async (req, res) => {
  try {
    const selectQuery = `SELECT senderid, receiverid, amount, currency, type, createdat, COUNT(*) AS duplicate_count FROM transactions WHERE (type = 'Level 1 Bonus' or type = 'Level 2 Bonus') GROUP BY senderid, receiverid, currency, type, createdat HAVING COUNT(*) > 1`;
    const selectResult = await Qry(selectQuery);

    let x = 1;
    for (const user of selectResult) {
      let senderid = user.senderid;
      let receiverid = user.receiverid;
      let amount = user.amount;
      let currency = user.currency;
      let type = user.type;
      let type1 = "";

      if (type === "Level 1 Bonus") {
        type1 = "Level 1 Bonus Deducted";
      }

      if (type === "Level 2 Bonus") {
        type1 = "Level 2 Bonus Deducted";
      }

      let insertTransaction = await Qry(
        "insert into transactions ( receiverid, senderid, amount, type, currency, updated_by) values ( ?, ?, ?, ?, ? , ? )",
        [receiverid, senderid, amount, type1, currency, "set duplicates"]
      );

      const selectUser = `SELECT * from usersdata where id = ?`;
      const selectResultUser = await Qry(selectUser, [receiverid]);

      if (currency === "EUR") {
        const updateLoginQuery = `UPDATE usersdata SET current_balance_eur = current_balance_eur - ? WHERE id = ?`;
        const updateLoginParams = [amount, receiverid];
        const updateLoginResult = await Qry(
          updateLoginQuery,
          updateLoginParams
        );

        const selectUseragain = `SELECT * from usersdata where id = ?`;
        const selectResultUseragain = await Qry(selectUseragain, [receiverid]);

        let insertSet = await Qry(
          "insert into set_duplicate_commission (userid, old_amount_eur, new_amount_eur) values ( ?, ?, ? )",
          [
            receiverid,
            selectResultUser[0].current_balance_eur,
            selectResultUseragain[0].current_balance_eur,
          ]
        );
      }

      if (currency === "USD") {
        const updateLoginQuery = `UPDATE usersdata SET current_balance_usd = current_balance_usd - ? WHERE id = ?`;
        const updateLoginParams = [amount, receiverid];

        const selectUseragain = `SELECT * from usersdata where id = ?`;
        const selectResultUseragain = await Qry(selectUseragain, [receiverid]);

        let insertSet = await Qry(
          "insert into set_duplicate_commission (userid, old_amount_usd, old_amount_usd) values ( ?, ?, ? )",
          [
            receiverid,
            selectResultUser[0].current_balance_usd,
            selectResultUseragain[0].current_balance_usd,
          ]
        );
      }

      x = x + 1;
    }

    res.json({
      status: "success",
      message: "ok",
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.testTransa = async (req, res) => {
  try {
    const countQuer1 = await Qry("SELECT * FROM usersdata WHERE usertype = ?", [
      "user",
    ]);

    function hasUpperCase(str) {
      return /[A-Z]/.test(str);
    }

    res.json({
      status: "success",
      message: "ok",
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.setlastmonthcommission = async (req, res) => {
  try {
    const selectQuery = `SELECT * from usersdata where usertype = ? and id = 2370`;
    const selectResult = await Qry(selectQuery, ["user"]);

    let per50BonusEUR = 0;
    let per50BonusUSD = 0;
    let perotherL1BonusEUR = 0;
    let perotherL1BonusUSD = 0;
    let perotherL2BonusEUR = 0;
    let perotherL2BonusUSD = 0;
    let perotherL1BonusEURDed = 0;
    let perotherL1BonusUSDDed = 0;
    let perotherL2BonusEURDed = 0;
    let perotherL2BonusUSDDed = 0;
    let x = 1;
    for (const user of selectResult) {
      const countQuer1 = await Qry(
        "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = 1 AND DAY(createdat) >= 28 AND YEAR(createdat) = YEAR(now())",
        [user.id, "Level 1 Bonus"]
      );

      const countQuer2 = await Qry(
        "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = 2 and YEAR(createdat) = YEAR(now())",
        [user.id, "Level 1 Bonus"]
      );

      const countQuer3 = await Qry(
        "SELECT COUNT(*) as userCount FROM usersdata WHERE sponsorid = ? AND sub_type = 'year' AND DAY(NOW()) >= DAY(createdat) AND DATEDIFF(NOW(), createdat) <= 365 AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') and MONTH(createdat) != MONTH(now())",
        [user.id]
      );

      const countQuer4 = await Qry(
        "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = 2 and YEAR(createdat) = YEAR(now())",
        [user.id, "Level 1 Bonus Deducted"]
      );

      let totalUser =
        countQuer1[0].userCount +
        countQuer2[0].userCount +
        countQuer3[0].userCount -
        countQuer4[0].userCount;

      let unilevelData;
      unilevelData = await Qry(
        "SELECT * FROM unilevels WHERE `number_of_users` <= ? ORDER BY `id` DESC LIMIT 1",
        [totalUser]
      );

      if (unilevelData.length === 0) {
        unilevelData = await Qry("SELECT * FROM unilevels WHERE id = ?", [0]);
      }

      const selectQuer1 = await Qry(
        "SELECT * FROM transactions WHERE receiverid = ? and type = ? and event_type = ? and ((MONTH(createdat) = 1 AND DAY(createdat) >= 28 AND YEAR(createdat) = YEAR(now())) or (MONTH(createdat) = 2 and YEAR(createdat) = YEAR(now())))",
        [user.id, "Level 1 Bonus", "subscription_created"]
      );
      // start 50%
      for (const trData1 of selectQuer1) {
        const selectQuer2 = await Qry("SELECT * FROM usersdata WHERE id = ?", [
          trData1.senderid,
        ]);

        let plan_amount = selectQuer2[0].plan_amount;
        let currency = trData1.currency;

        let bonus_50_per = (plan_amount / 100) * 50;

        if (currency === "EUR") {
          per50BonusEUR = per50BonusEUR + bonus_50_per;
          const updateLoginQuery = `UPDATE usersdata SET balance_eur_test = balance_eur_test + ? WHERE id = ?`;
          const updateLoginParams = [bonus_50_per, user.id];
          const updateLoginResult = await Qry(
            updateLoginQuery,
            updateLoginParams
          );
        }
        if (currency === "USD") {
          per50BonusUSD = per50BonusUSD + bonus_50_per;
          const updateLoginQuery = `UPDATE usersdata SET balance_usd_test = balance_usd_test + ? WHERE id = ?`;
          const updateLoginParams = [bonus_50_per, user.id];
          const updateLoginResult = await Qry(
            updateLoginQuery,
            updateLoginParams
          );
        }
      }
      // end 50%

      // start unilevel%
      //level 1
      const selectQuer3 = await Qry(
        "SELECT * FROM transactions WHERE receiverid = ? and type = ? and event_type != ? and ((MONTH(createdat) = 1 AND DAY(createdat) >= 28 AND YEAR(createdat) = YEAR(now())) or (MONTH(createdat) = 2 and YEAR(createdat) = YEAR(now())))",
        [user.id, "Level 1 Bonus", "subscription_created"]
      );

      for (const trData2 of selectQuer3) {
        const selectQuer4 = await Qry("SELECT * FROM usersdata WHERE id = ?", [
          trData2.senderid,
        ]);

        let plan_amount = selectQuer4[0].plan_amount;
        let currency = trData2.currency;

        let levelBonus = unilevelData[0].level1;

        let bonus = (plan_amount / 100) * levelBonus;

        if (currency === "EUR") {
          perotherL1BonusEUR = perotherL1BonusEUR + bonus;
          const updateLoginQuery = `UPDATE usersdata SET balance_eur_test = balance_eur_test + ? WHERE id = ?`;
          const updateLoginParams = [bonus, user.id];
          const updateLoginResult = await Qry(
            updateLoginQuery,
            updateLoginParams
          );
        }
        if (currency === "USD") {
          perotherL1BonusUSD = perotherL1BonusUSD + bonus;
          const updateLoginQuery = `UPDATE usersdata SET balance_usd_test = balance_usd_test + ? WHERE id = ?`;
          const updateLoginParams = [bonus, user.id];
          const updateLoginResult = await Qry(
            updateLoginQuery,
            updateLoginParams
          );
        }
      }
      //level 1

      //level 2
      const selectQuer5 = await Qry(
        "SELECT * FROM transactions WHERE receiverid = ? and type = ? and ((MONTH(createdat) = 1 AND DAY(createdat) >= 28 AND YEAR(createdat) = YEAR(now())) or (MONTH(createdat) = 2 and YEAR(createdat) = YEAR(now())))",
        [user.id, "Level 2 Bonus"]
      );

      for (const trData3 of selectQuer5) {
        const selectQuer6 = await Qry("SELECT * FROM usersdata WHERE id = ?", [
          trData3.senderid,
        ]);

        let plan_amount = selectQuer6[0].plan_amount;
        let currency = trData3.currency;

        let levelBonus = unilevelData[0].level2;

        let bonus = (plan_amount / 100) * levelBonus;

        if (currency === "EUR") {
          perotherL2BonusEUR = perotherL2BonusEUR + bonus;
          const updateLoginQuery = `UPDATE usersdata SET balance_eur_test = balance_eur_test + ? WHERE id = ?`;
          const updateLoginParams = [bonus, user.id];
          const updateLoginResult = await Qry(
            updateLoginQuery,
            updateLoginParams
          );
        }
        if (currency === "USD") {
          perotherL2BonusUSD = perotherL2BonusUSD + bonus;
          const updateLoginQuery = `UPDATE usersdata SET balance_usd_test = balance_usd_test + ? WHERE id = ?`;
          const updateLoginParams = [bonus, user.id];
          const updateLoginResult = await Qry(
            updateLoginQuery,
            updateLoginParams
          );
        }
      }
      //level 2
      // end unilevel%

      // start deductive%
      //level 1
      const selectQuer7 = await Qry(
        "SELECT * FROM transactions WHERE receiverid = ? and type = ? and ((MONTH(createdat) = 1 AND DAY(createdat) >= 28 AND YEAR(createdat) = YEAR(now())) or (MONTH(createdat) = 2 and YEAR(createdat) = YEAR(now())))",
        [user.id, "Level 1 Bonus Deducted"]
      );

      for (const trData4 of selectQuer7) {
        const selectQuer8 = await Qry("SELECT * FROM usersdata WHERE id = ?", [
          trData4.senderid,
        ]);

        let plan_amount = selectQuer8[0].plan_amount;
        let currency = trData4.currency;

        let levelBonus = unilevelData[0].level1;

        let bonus = (plan_amount / 100) * levelBonus;

        if (currency === "EUR") {
          perotherL1BonusEURDed = perotherL1BonusEURDed + bonus;
          const updateLoginQuery = `UPDATE usersdata SET balance_eur_test = balance_eur_test - ? WHERE id = ?`;
          const updateLoginParams = [bonus, user.id];
          const updateLoginResult = await Qry(
            updateLoginQuery,
            updateLoginParams
          );
        }
        if (currency === "USD") {
          perotherL1BonusUSDDed = perotherL1BonusUSDDed + bonus;
          const updateLoginQuery = `UPDATE usersdata SET balance_usd_test = balance_usd_test - ? WHERE id = ?`;
          const updateLoginParams = [bonus, user.id];
          const updateLoginResult = await Qry(
            updateLoginQuery,
            updateLoginParams
          );
        }
      }
      //level 1

      //level 2
      const selectQuer9 = await Qry(
        "SELECT * FROM transactions WHERE receiverid = ? and type = ? and ((MONTH(createdat) = 1 AND DAY(createdat) >= 28 AND YEAR(createdat) = YEAR(now())) or (MONTH(createdat) = 2 and YEAR(createdat) = YEAR(now())))",
        [user.id, "Level 2 Bonus Deducted"]
      );

      for (const trData5 of selectQuer9) {
        const selectQuer10 = await Qry("SELECT * FROM usersdata WHERE id = ?", [
          trData5.senderid,
        ]);

        let plan_amount = selectQuer10[0].plan_amount;
        let currency = trData5.currency;

        let levelBonus = unilevelData[0].level2;

        let bonus = (plan_amount / 100) * levelBonus;

        if (currency === "EUR") {
          perotherL2BonusEURDed = perotherL2BonusEURDed + bonus;
          const updateLoginQuery = `UPDATE usersdata SET balance_eur_test = balance_eur_test - ? WHERE id = ?`;
          const updateLoginParams = [bonus, user.id];
          const updateLoginResult = await Qry(
            updateLoginQuery,
            updateLoginParams
          );
        }
        if (currency === "USD") {
          perotherL2BonusUSDDed = perotherL2BonusUSDDed + bonus;
          const updateLoginQuery = `UPDATE usersdata SET balance_usd_test = balance_usd_test - ? WHERE id = ?`;
          const updateLoginParams = [bonus, user.id];
          const updateLoginResult = await Qry(
            updateLoginQuery,
            updateLoginParams
          );
        }
      }
      //level 2
      // end Deductive%

      // start event type null
      const countQuer111 = await Qry(
        "SELECT * FROM transactions WHERE receiverid = ? and (type = ? or type = ?) and MONTH(createdat) = 2 AND YEAR(createdat) = YEAR(now())",
        [user.id, "Level 1 Bonus", "Level 2 Bonus"]
      );

      for (const trData111 of countQuer111) {
        if (!trData111.event_type) {
          const selectQuer112 = await Qry(
            "SELECT * FROM usersdata WHERE id = ?",
            [trData111.senderid]
          );

          let levelBonus;

          let dateString = selectQuer112[0].createdat;
          let dateObject = new Date(dateString);
          let monthNumber = dateObject.getMonth() + 1; // JavaScript months are zero-based (0 for January), so we add 1 to get the correct month number

          if (trData111.type === "Level 1 Bonus") {
            levelBonus = unilevelData[0].level1;
            if (monthNumber === 2 || monthNumber === 1) {
              levelBonus = 50;
            }
          }

          if (trData111.type === "Level 2 Bonus") {
            levelBonus = unilevelData[0].level2;
          }

          let plan_amount = selectQuer112[0].plan_amount;
          let currency = trData111.currency;
          let bonus = (plan_amount / 100) * levelBonus;

          if (currency === "EUR") {
            if (
              trData111.type === "Level 1 Bonus" &&
              (monthNumber === 2 || monthNumber === 1)
            ) {
              per50BonusEUR = per50BonusEUR + bonus;
            }
            if (
              trData111.type === "Level 1 Bonus" &&
              (monthNumber !== 2 || monthNumber !== 1)
            ) {
              perotherL1BonusEUR = perotherL1BonusEUR + bonus;
            }
            if (trData111.type === "Level 2 Bonus") {
              perotherL2BonusEUR = perotherL2BonusEUR + bonus;
            }

            const updateLoginQuery = `UPDATE usersdata SET balance_eur_test = balance_eur_test + ? WHERE id = ?`;
            const updateLoginParams = [bonus, user.id];
            const updateLoginResult = await Qry(
              updateLoginQuery,
              updateLoginParams
            );
          }
          if (currency === "USD") {
            if (
              trData111.type === "Level 1 Bonus" &&
              (monthNumber === 2 || monthNumber === 1)
            ) {
              per50BonusUSD = per50BonusUSD + bonus;
            }
            if (
              trData111.type === "Level 1 Bonus" &&
              (monthNumber !== 2 || monthNumber !== 1)
            ) {
              perotherL1BonusUSD = perotherL1BonusUSD + bonus;
            }
            if (trData111.type === "Level 2 Bonus") {
              perotherL2BonusUSD = perotherL2BonusUSD + bonus;
            }

            const updateLoginQuery = `UPDATE usersdata SET balance_usd_test = balance_usd_test + ? WHERE id = ?`;
            const updateLoginParams = [bonus, user.id];
            const updateLoginResult = await Qry(
              updateLoginQuery,
              updateLoginParams
            );
          }
        }
      }

      x = x + 1;
    }

    const updateLoginQuery = `UPDATE setting SET keyvalue = ? WHERE id = ?`;
    const updateLoginParams = [1, 34];
    const updateLoginResult = await Qry(updateLoginQuery, updateLoginParams);

    res.json({
      status: "success",
      message: "ok",
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.setlevel2 = async (req, res) => {
  try {
    const selectQuery = `SELECT * from transactions where type = ?`;
    const selectResult = await Qry(selectQuery, ["Level 2 Bonus"]);

    let x = 1;
    for (const user of selectResult) {
      let senderid = user.senderid;
      let receiverid = user.receiverid;

      const countQuer1 = await Qry("SELECT * FROM usersdata WHERE id = ?", [
        senderid,
      ]);

      const countQuer2 = await Qry("SELECT * FROM usersdata WHERE id = ?", [
        countQuer1[0].sponsorid,
      ]);

      const updateLoginQuery = `UPDATE transactions SET receiverid = ? WHERE id = ?`;
      const updateLoginParams = [countQuer2[0].sponsorid, user.id];
      const updateLoginResult = await Qry(updateLoginQuery, updateLoginParams);

      const insertQuery = `INSERT INTO set_level2 (userid, old_level2_id, new_level2_id) VALUES (?, ?, ?)`;
      const insertParams = [senderid, receiverid, countQuer2[0].sponsorid];
      const insertResult = await Qry(insertQuery, insertParams);
    }

    res.json({
      status: "success",
      message: "ok",
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.setplanamount = async (req, res) => {
  try {
    const selectQuery = `SELECT * FROM usersdata where plan_amount = 0 and ((MONTH(createdat) = 2 and YEAR(createdat) = YEAR(now())) or (MONTH(createdat) = 1 and DAY(createdat) >= 28 and YEAR(createdat) = YEAR(now())))`;
    const selectResult = await Qry(selectQuery);

    for (const user of selectResult) {
      let userid = user.id;

      const selectQuery1 = `SELECT * FROM new_packages where userid = ?`;
      const selectResult1 = await Qry(selectQuery1, [userid]);

      let amount = selectResult1[0].amount;

      const updateLoginQuery = `UPDATE usersdata SET plan_amount = ? WHERE id = ?`;
      const updateLoginParams = [amount, userid];
      const updateLoginResult = await Qry(updateLoginQuery, updateLoginParams);
    }

    res.json({
      status: "success",
      message: "ok",
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.insertlevel2foradd = async (req, res) => {
  try {
    // const selectQuery = `SELECT * from transactions where type = ? and MONTH(createdat) = 4 and YEAR(createdat) = YEAR(now())`;
    const selectQuery = `SELECT * from transactions where type = ?`;
    const selectResult = await Qry(selectQuery, ["Level 1 Bonus"]);

    let x = 1;

    for (const user of selectResult) {
      let senderid = user.senderid;
      let receiverid = user.receiverid;

      if (senderid !== 101230) {
        const selectQuery1 = `SELECT * from transactions where type = ? and senderid = ?`;
        // const selectQuery1 = `SELECT * from transactions where type = ? and senderid = ? and MONTH(createdat) = 4 and YEAR(createdat) = YEAR(now())`;
        const selectResult1 = await Qry(selectQuery1, [
          "Level 2 Bonus",
          senderid,
        ]);

        if (selectResult1.length === 0) {
          let insertReceiver;

          if (receiverid === 1) {
            insertReceiver = 0;
          } else {
            const selectQuery2 = `SELECT * from usersdata where id = ?`;
            const selectResult2 = await Qry(selectQuery2, [receiverid]);
            insertReceiver = selectResult2[0].sponsorid;
          }

          let insertTransaction = await Qry(
            "insert into transactions ( receiverid, senderid, amount, type, details, createdat, approvedat, event_type) values ( ? , ? , ? , ? , ? , ? , ? , ?)",
            [
              insertReceiver,
              senderid,
              0,
              "Level 2 Bonus",
              "",
              user.createdat,
              user.approvedat,
              user.event_type,
            ]
          );

          const selectQuery3 = `SELECT * from usersdata where id = ?`;
          const selectResult3 = await Qry(selectQuery3, [senderid]);

          x = x + 1;
        }
      }
    }

    res.json({
      status: "success",
      message: "ok",
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.insertlevel2fordeduct1 = async (req, res) => {
  try {
    // const selectQuery = `SELECT * from transactions where type = ? and MONTH(createdat) = 4 and YEAR(createdat) = YEAR(now())`;
    const selectQuery = `SELECT * from transactions where type = ?`;
    const selectResult = await Qry(selectQuery, ["Level 1 Bonus Deducted"]);

    let x = 1;

    for (const user of selectResult) {
      let senderid = user.senderid;
      let receiverid = user.receiverid;

      if (senderid !== 101230) {
        // const selectQuery1 = `SELECT * from transactions where type = ? and senderid = ? and MONTH(createdat) = 4 and YEAR(createdat) = YEAR(now())`;
        const selectQuery1 = `SELECT * from transactions where type = ? and senderid = ?`;
        const selectResult1 = await Qry(selectQuery1, [
          "Level 2 Bonus Deducted",
          senderid,
        ]);

        if (selectResult1.length === 0) {
          let insertReceiver;

          if (receiverid === 1) {
            insertReceiver = 0;
          } else {
            const selectQuery2 = `SELECT * from usersdata where id = ?`;
            const selectResult2 = await Qry(selectQuery2, [receiverid]);
            insertReceiver = selectResult2[0].sponsorid;
          }

          let insertTransaction = await Qry(
            "insert into transactions ( receiverid, senderid, amount, type, details, createdat, approvedat, event_type) values ( ? , ? , ? , ? , ? , ? , ? , ?)",
            [
              insertReceiver,
              senderid,
              0,
              "Level 2 Bonus Deducted",
              "",
              user.createdat,
              user.approvedat,
              user.event_type,
            ]
          );

          const selectQuery3 = `SELECT * from usersdata where id = ?`;
          const selectResult3 = await Qry(selectQuery3, [senderid]);

          x = x + 1;
        }
      }
    }

    res.json({
      status: "success",
      message: "ok",
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.insertlevel2fordeduct2 = async (req, res) => {
  try {
    // const selectQuery = `SELECT * from transactions where type = ? and MONTH(createdat) = 4 and YEAR(createdat) = YEAR(now())`;
    const selectQuery = `SELECT * from transactions where type = ? and senderid = 2877`;
    // const selectQuery = `SELECT * from transactions where type = ?`;
    const selectResult = await Qry(selectQuery, ["Level 2 Bonus Deducted"]);

    let x = 1;

    for (const user of selectResult) {
      let senderid = user.senderid;

      if (senderid !== 101230) {
        // const selectQuery1 = `SELECT * from transactions where type = ? and senderid = ? and MONTH(createdat) = 4 and YEAR(createdat) = YEAR(now())`;
        const selectQuery1 = `SELECT * from transactions where type = ? and senderid = ?`;
        const selectResult1 = await Qry(selectQuery1, [
          "Level 1 Bonus Deducted",
          senderid,
        ]);

        if (selectResult1.length === 0) {
          const selectQuery2 = `SELECT * from usersdata where id = ?`;
          const selectResult2 = await Qry(selectQuery2, [senderid]);
          let insertReceiver = selectResult2[0].sponsorid;

          let insertTransaction = await Qry(
            "insert into transactions ( receiverid, senderid, amount, type, details, createdat, approvedat, event_type) values ( ? , ? , ? , ? , ? , ? , ? , ?)",
            [
              insertReceiver,
              senderid,
              0,
              "Level 1 Bonus Deducted",
              "",
              user.createdat,
              user.approvedat,
              user.event_type,
            ]
          );

          const selectQuery3 = `SELECT * from usersdata where id = ?`;
          const selectResult3 = await Qry(selectQuery3, [senderid]);

          x = x + 1;
        }
      }
    }

    res.json({
      status: "success",
      message: "ok",
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.insertlevel2fordeduct3 = async (req, res) => {
  try {
    // const selectQuery = `SELECT * from transactions where type = ? and MONTH(createdat) = 4 and YEAR(createdat) = YEAR(now())`;
    const selectQuery = `SELECT * from transactions where type = ?`;
    const selectResult = await Qry(selectQuery, ["Pool 1 Bonus Deducted"]);

    let x = 1;

    for (const user of selectResult) {
      let senderid = user.senderid;
      let receiverid = user.receiverid;

      // const selectQuery1 = `SELECT * from transactions where type = ? and senderid = ? and MONTH(createdat) = 4 and YEAR(createdat) = YEAR(now())`;
      const selectQuery1 = `SELECT * from transactions where type = ? and senderid = ?`;
      const selectResult1 = await Qry(selectQuery1, [
        "Level 1 Bonus Deducted",
        senderid,
      ]);

      // const selectQuery2 = `SELECT * from transactions where type = ? and senderid = ? and MONTH(createdat) = 4 and YEAR(createdat) = YEAR(now())`;
      const selectQuery2 = `SELECT * from transactions where type = ? and senderid = ?`;
      const selectResult2 = await Qry(selectQuery2, [
        "Level 2 Bonus Deducted",
        senderid,
      ]);

      // for level 1
      if (selectResult1.length === 0) {
        const selectQuery2 = `SELECT * from usersdata where id = ?`;
        const selectResult2 = await Qry(selectQuery2, [senderid]);
        let insertReceiver = selectResult2[0].sponsorid;

        let insertTransaction = await Qry(
          "insert into transactions ( receiverid, senderid, amount, type, details, createdat, approvedat, event_type) values ( ? , ? , ? , ? , ? , ? , ? , ?)",
          [
            insertReceiver,
            senderid,
            0,
            "Level 1 Bonus Deducted",
            "",
            user.createdat,
            user.approvedat,
            user.event_type,
          ]
        );

        const selectQuery3 = `SELECT * from usersdata where id = ?`;
        const selectResult3 = await Qry(selectQuery3, [senderid]);

        x = x + 1;
      }

      // for level 2
      if (selectResult2.length === 0) {
        const selectQuery2 = `SELECT * from usersdata where id = ?`;
        const selectResult2 = await Qry(selectQuery2, [senderid]);

        const selectQuery4 = `SELECT * from usersdata where id = ?`;
        const selectResult4 = await Qry(selectQuery4, [
          selectResult2[0].sponsorid,
        ]);

        let insertReceiver = selectResult4[0].sponsorid;

        let insertTransaction = await Qry(
          "insert into transactions ( receiverid, senderid, amount, type, details, createdat, approvedat, event_type) values ( ? , ? , ? , ? , ? , ? , ? , ?)",
          [
            insertReceiver,
            senderid,
            0,
            "Level 2 Bonus Deducted",
            "",
            user.createdat,
            user.approvedat,
            user.event_type,
          ]
        );

        const selectQuery3 = `SELECT * from usersdata where id = ?`;
        const selectResult3 = await Qry(selectQuery3, [senderid]);

        x = x + 1;
      }
    }

    res.json({
      status: "success",
      message: "ok",
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.setjan28to31 = async (req, res) => {
  try {
    const selectQuery = `SELECT * from usersdata where usertype = ? and user_type = ?`;
    const selectResult = await Qry(selectQuery, ["user", "Distributor"]);

    let x = 1;
    for (const user of selectResult) {
      const countQuer1 = await Qry(
        "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = 1 AND DAY(createdat) >= 28 AND YEAR(createdat) = YEAR(now())",
        [user.id, "Level 1 Bonus"]
      );

      const countQuer2 = await Qry(
        "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = 2 and YEAR(createdat) = YEAR(now())",
        [user.id, "Level 1 Bonus"]
      );

      const countQuer3 = await Qry(
        "SELECT COUNT(*) as userCount FROM usersdata WHERE sponsorid = ? AND sub_type = 'year' AND DAY(NOW()) >= DAY(createdat) AND DATEDIFF(NOW(), createdat) <= 365 AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') and MONTH(createdat) != MONTH(now())",
        [user.id]
      );

      const countQuer4 = await Qry(
        "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = 2 and YEAR(createdat) = YEAR(now())",
        [user.id, "Level 1 Bonus Deducted"]
      );

      let totalUser =
        countQuer1[0].userCount +
        countQuer2[0].userCount +
        countQuer3[0].userCount -
        countQuer4[0].userCount;

      let unilevelData;
      unilevelData = await Qry(
        "SELECT * FROM unilevels WHERE `number_of_users` <= ? ORDER BY `id` DESC LIMIT 1",
        [totalUser]
      );

      if (unilevelData.length === 0) {
        unilevelData = await Qry("SELECT * FROM unilevels WHERE id = ?", [0]);
      }

      const selectQuer1 = await Qry(
        "SELECT * FROM transactions WHERE receiverid = ? and type = ? and event_type = ? and MONTH(createdat) = 1 AND DAY(createdat) >= 28 AND YEAR(createdat) = YEAR(now())",
        [user.id, "Level 1 Bonus", "subscription_created"]
      );
      let balance_eur = 0;
      let balance_usd = 0;
      // start 50%
      for (const trData1 of selectQuer1) {
        const selectQuer2 = await Qry("SELECT * FROM usersdata WHERE id = ?", [
          trData1.senderid,
        ]);

        let plan_amount = selectQuer2[0].plan_amount;
        let currency = trData1.currency;

        let bonus_50_per = (plan_amount / 100) * 50;

        if (currency === "EUR") {
          balance_eur = balance_eur + bonus_50_per;
        }
        if (currency === "USD") {
          balance_usd = balance_usd + bonus_50_per;
        }
      }
      // end 50%

      const updateLoginQuery = `UPDATE set_commission_report SET new_balance_eur = ?, new_balance_usd = ? WHERE userid = ?`;
      const updateLoginParams = [balance_eur, balance_usd, user.id];
      const updateLoginResult = await Qry(updateLoginQuery, updateLoginParams);

      x = x + 1;
    }

    res.json({
      status: "success",
      message: "ok",
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.setlastoverall = async (req, res) => {
  try {
    const selectQuery = `SELECT * from usersdata where usertype = ? and id = ? `;
    const selectResult = await Qry(selectQuery, ["user", 2589]);

    let x = 1;
    for (const user of selectResult) {
      const countQuer1 = await Qry(
        "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = 1 AND DAY(createdat) >= 28 AND YEAR(createdat) = YEAR(now())",
        [user.id, "Level 1 Bonus"]
      );

      const countQuer2 = await Qry(
        "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = 2 and YEAR(createdat) = YEAR(now())",
        [user.id, "Level 1 Bonus"]
      );

      const countQuer3 = await Qry(
        "SELECT COUNT(*) as userCount FROM usersdata WHERE sponsorid = ? AND sub_type = 'year' AND DAY(NOW()) >= DAY(createdat) AND DATEDIFF(NOW(), createdat) <= 365 AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') and MONTH(createdat) != MONTH(now())",
        [user.id]
      );

      const countQuer4 = await Qry(
        "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = 2 and YEAR(createdat) = YEAR(now())",
        [user.id, "Level 1 Bonus Deducted"]
      );

      let totalUser =
        countQuer1[0].userCount +
        countQuer2[0].userCount +
        countQuer3[0].userCount -
        countQuer4[0].userCount;

      let unilevelData;
      unilevelData = await Qry(
        "SELECT * FROM unilevels WHERE `number_of_users` <= ? ORDER BY `id` DESC LIMIT 1",
        [totalUser]
      );

      if (unilevelData.length === 0) {
        unilevelData = await Qry("SELECT * FROM unilevels WHERE id = ?", [0]);
      }

      const selectQuer1 = await Qry(
        "SELECT * FROM transactions WHERE receiverid = ? and type = ? and event_type = ? and ((MONTH(createdat) = 1 AND DAY(createdat) >= 28 AND YEAR(createdat) = YEAR(now())) or (MONTH(createdat) = 2 and YEAR(createdat) = YEAR(now())))",
        [user.id, "Level 1 Bonus", "subscription_created"]
      );

      let balance_eur = 0;
      let balance_usd = 0;

      x = x + 1;
    }

    res.json({
      status: "success",
      message: "ok",
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.setfebpending = async (req, res) => {
  try {
    const data = [
      { username: "asanchez", amount: 497 },
      { username: "audepinson", amount: 141.33 },
      { username: "caroma", amount: 19.96 },
      { username: "charles007", amount: 48.5 },
      { username: "chofflet", amount: 39.4 },
      { username: "christined", amount: 117.78 },
      { username: "cobra", amount: 35.96 },
      { username: "desmonts", amount: 97 },
      { username: "elodie_g", amount: 19.96 },
      { username: "heiwa23", amount: 34.95 },
      { username: "jimenezveronique", amount: 198 },
      { username: "lager", amount: 19.96 },
      { username: "marclegreand", amount: 39.94 },
      { username: "mariedns", amount: 19.96 },
      { username: "melg888", amount: 48.5 },
      { username: "muriel", amount: 48.5 },
      { username: "oliv54", amount: 89.7 },
      { username: "pamelaigwe", amount: 138.2 },
      { username: "sandrineberthier", amount: 67.76 },
      { username: "seblegagnant", amount: 58.2 },
      { username: "stefie", amount: 48.5 },
      { username: "stephanieneri", amount: 31.99 },
      { username: "stevens", amount: 70.79 },
      { username: "valÃ©riedgl1", amount: 48.5 },
      { username: "verarocha", amount: 19.4 },
    ];

    let x = 1;
    for (const user of data) {
      const selectQuerUser = await Qry(
        "SELECT * FROM usersdata WHERE username = ?",
        [user.username]
      );
      let userid = selectQuerUser[0].id;

      const selectQuerTra = await Qry(
        "SELECT * FROM transactions WHERE type = ? and receiverid = ?",
        ["Bonus February Sales Pending", userid]
      );

      let currency = selectQuerTra[0].currency;

      const deleteUserQuery = `DELETE FROM transactions WHERE id = ?`;
      const deleteUserResult = await Qry(deleteUserQuery, [
        selectQuerTra[0].id,
      ]);

      if (currency === "EUR") {
        const updateLoginQuery = `UPDATE usersdata SET current_balance_eur_payout = current_balance_eur_payout - ? WHERE id = ?`;
        const updateLoginResult = await Qry(updateLoginQuery, [
          user.amount,
          userid,
        ]);
      }

      if (currency === "USD") {
        const updateLoginQuery = `UPDATE usersdata SET current_balance_usd_payout = current_balance_usd_payout - ? WHERE id = ?`;
        const updateLoginResult = await Qry(updateLoginQuery, [
          user.amount,
          userid,
        ]);
      }

      const selectQuerUserAgain = await Qry(
        "SELECT * FROM usersdata WHERE username = ?",
        [user.username]
      );

      let obj = {
        x: x,
        username: user.username,
        amount: user.amount,
        preamounteur: selectQuerUser[0].current_balance_eur_payout,
        preamountusd: selectQuerUser[0].current_balance_usd_payout,
        newamounteur: selectQuerUserAgain[0].current_balance_eur_payout,
        newamountusd: selectQuerUserAgain[0].current_balance_usd_payout,
        currency: currency,
      };

      x = x + 1;
    }

    res.json({
      status: "success",
      message: "ok",
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.cronjobbalancetransfersingleuser = async (req, res) => {
  try {
    // const selectSettingsQuery = `SELECT * FROM setting WHERE keyname = ?`;
    // const selectSettingsResult = await Qry(selectSettingsQuery, [
    //   "pool1_status"
    // ]);

    // let pool1_status = parseInt(selectSettingsResult[0].keyvalue)

    const selectUserQuery = `SELECT * FROM usersdata WHERE usertype = ? and user_type = ? and id = ?`;
    const selectUserResult = await Qry(selectUserQuery, [
      "user",
      "Distributor",
      2375,
    ]);

    function getLastMonthNumber() {
      var currentDate = new Date();
      var lastMonth = currentDate.getMonth(); // Get current month
      lastMonth = lastMonth === 0 ? 12 : lastMonth; // If January, set to December
      return lastMonth;
    }

    let lastMonthNumber = getLastMonthNumber();

    let x = 1;
    for (const user of selectUserResult) {
      let userID = user.id;

      const countQuer2 = await Qry(
        "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())",
        [userID, "Level 1 Bonus", lastMonthNumber]
      );

      const countQuer3 = await Qry(
        "SELECT COUNT(*) as userCount FROM usersdata WHERE sponsorid = ? AND sub_type = 'year' AND DAY(NOW()) >= DAY(createdat) AND DATEDIFF(NOW(), createdat) <= 365 AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') and MONTH(createdat) != MONTH(now())",
        [userID]
      );

      const countQuer4 = await Qry(
        "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())",
        [userID, "Level 1 Bonus Deducted", lastMonthNumber]
      );

      let totalUser =
        countQuer2[0].userCount +
        countQuer3[0].userCount -
        countQuer4[0].userCount;

      let unilevelData;
      unilevelData = await Qry(
        "SELECT * FROM unilevels WHERE `number_of_users` <= ? ORDER BY `id` DESC LIMIT 1",
        [totalUser]
      );

      if (unilevelData.length === 0) {
        unilevelData = await Qry("SELECT * FROM unilevels WHERE id = ?", [0]);
      }

      // start total payment

      let totalPaymentEUR = 0;
      let totalPaymentUSD = 0;

      // start level 1 and 2
      const selectTraLevelTpay = `SELECT * FROM transactions WHERE receiverid = ? AND (type = ? or type = ?) and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())`;
      let resultTraLevelTPay = await Qry(selectTraLevelTpay, [
        userID,
        "Level 1 Bonus",
        "Level 2 Bonus",
        lastMonthNumber,
      ]);

      for (const data of resultTraLevelTPay) {
        let senderid = data.senderid;

        const selectSender1 = `SELECT * FROM usersdata WHERE id = ?`;
        let resultSender1 = await Qry(selectSender1, [senderid]);
        let levelBonus = 0;
        let amount = resultSender1[0].plan_amount;
        let currency = data.currency;

        if (data.type === "Level 1 Bonus") {
          levelBonus = unilevelData[0].level1;
        }

        if (data.type === "Level 2 Bonus") {
          levelBonus = unilevelData[0].level2;
        }

        let bonus = (amount / 100) * levelBonus;

        if (currency === "EUR") {
          totalPaymentEUR = totalPaymentEUR + bonus;
        }

        if (currency === "USD") {
          totalPaymentUSD = totalPaymentUSD + bonus;
        }
      }

      // end level 1 and 2

      // start deduct level 1 and 2
      const selectTraLevelDedTPay = `SELECT * FROM transactions WHERE receiverid = ? AND (type = ? or type = ?) and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())`;
      let resultTraLevelDedTPAY = await Qry(selectTraLevelDedTPay, [
        userID,
        "Level 1 Bonus Deducted",
        "Level 2 Bonus Deducted",
        lastMonthNumber,
      ]);

      for (const data of resultTraLevelDedTPAY) {
        let senderid = data.senderid;

        const selectSender1 = `SELECT * FROM usersdata WHERE id = ?`;
        let resultSender1 = await Qry(selectSender1, [senderid]);
        let levelBonus = 0;
        let amount = resultSender1[0].plan_amount;
        let currency = data.currency;

        if (data.type === "Level 1 Bonus Deducted") {
          levelBonus = unilevelData[0].level1;
        }

        if (data.type === "Level 2 Bonus Deducted") {
          levelBonus = unilevelData[0].level2;
        }

        let bonus = (amount / 100) * levelBonus;

        if (currency === "EUR") {
          totalPaymentEUR = totalPaymentEUR - bonus;
        }

        if (currency === "USD") {
          totalPaymentUSD = totalPaymentUSD - bonus;
        }
      }
      // end deduct level 1 and 2

      const selectBalanceAddAdminUSD = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND type = ? AND currency = ? AND MONTH(createdat) = ? AND YEAR(createdat) = YEAR(now())`;
      let resultBalanceAddAdminUSD = await Qry(selectBalanceAddAdminUSD, [
        userID,
        "Bonus Add By Admin",
        "USD",
        lastMonthNumber,
      ]);

      if (resultBalanceAddAdminUSD[0].totalAmount === null) {
        resultBalanceAddAdminUSD[0].totalAmount = 0;
      }

      const selectBalanceDeductAdminUSD = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND type = ? AND currency = ? AND MONTH(createdat) = ? AND YEAR(createdat) = YEAR(now())`;
      let resultBalanceDeductAdminUSD = await Qry(selectBalanceDeductAdminUSD, [
        userID,
        "Bonus Deduct By Admin",
        "USD",
        lastMonthNumber,
      ]);

      if (resultBalanceDeductAdminUSD[0].totalAmount === null) {
        resultBalanceDeductAdminUSD[0].totalAmount = 0;
      }

      const selectBalanceAddAdminEUR = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND type = ? AND currency = ? AND MONTH(createdat) = ? AND YEAR(createdat) = YEAR(now())`;
      let resultBalanceAddAdminEUR = await Qry(selectBalanceAddAdminEUR, [
        userID,
        "Bonus Add By Admin",
        "EUR",
        lastMonthNumber,
      ]);

      if (resultBalanceAddAdminEUR[0].totalAmount === null) {
        resultBalanceAddAdminEUR[0].totalAmount = 0;
      }

      const selectBalanceDeductAdminEUR = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND type = ? AND currency = ? AND MONTH(createdat) = ? AND YEAR(createdat) = YEAR(now())`;
      let resultBalanceDeductAdminEUR = await Qry(selectBalanceDeductAdminEUR, [
        userID,
        "Bonus Deduct By Admin",
        "EUR",
        lastMonthNumber,
      ]);

      if (resultBalanceDeductAdminEUR[0].totalAmount === null) {
        resultBalanceDeductAdminEUR[0].totalAmount = 0;
      }

      let usdOthers =
        resultBalanceAddAdminUSD[0].totalAmount -
        resultBalanceDeductAdminUSD[0].totalAmount;
      let eurOthers =
        resultBalanceAddAdminEUR[0].totalAmount -
        resultBalanceDeductAdminEUR[0].totalAmount;

      totalPaymentEUR = totalPaymentEUR + eurOthers;
      totalPaymentUSD = totalPaymentUSD + usdOthers;
      // end total payment

      let current_balance_usd = totalPaymentUSD;
      let current_balance_eur = totalPaymentEUR;

      const updateBalanceQuery = `UPDATE usersdata SET current_balance_usd_payout = current_balance_usd_payout + ?, current_balance_eur_payout = current_balance_eur_payout + ?, current_balance_usd_lastmonth = ?, current_balance_eur_lastmonth = ?, current_balance_usd_lifetime = current_balance_usd_lifetime + ?, current_balance_eur_lifetime = current_balance_eur_lifetime + ? WHERE id = ?`;
      await Qry(updateBalanceQuery, [
        current_balance_usd,
        current_balance_eur,
        current_balance_usd,
        current_balance_eur,
        current_balance_usd,
        current_balance_eur,
        userID,
      ]);

      const insertQuery = `INSERT INTO balance_transfer_for_payout (userid, amount_usd, amount_eur) VALUE (?, ?, ?)`;
      const runQuery = await Qry(insertQuery, [
        userID,
        current_balance_usd,
        current_balance_eur,
      ]);

      x = x + 1;
    }

    const updateAllUsers = `UPDATE usersdata SET withdrawal_status = ?`;
    await Qry(updateAllUsers, [1]);

    res.status(200).json({
      status: "success",
      message: "ok",
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.setcommission = async (req, res) => {
  try {
    const selectUserQuery = `SELECT * FROM usersdata WHERE usertype = ? and user_type = ?`;
    const selectUserResult = await Qry(selectUserQuery, [
      "user",
      "Distributor",
    ]);

    function getLastMonthNumber() {
      var currentDate = new Date();
      var lastMonth = currentDate.getMonth(); // Get current month
      lastMonth = lastMonth === 0 ? 12 : lastMonth; // If January, set to December
      return lastMonth;
    }

    let lastMonthNumber = getLastMonthNumber();
    lastMonthNumber = 3;

    let x = 1;
    for (const user of selectUserResult) {
      let userID = user.id;

      const countQuer2 = await Qry(
        "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())",
        [userID, "Level 1 Bonus", lastMonthNumber]
      );

      const countQuer3 = await Qry(
        "SELECT COUNT(*) as userCount FROM usersdata WHERE sponsorid = ? AND sub_type = 'year' AND DAY(NOW()) >= DAY(createdat) AND DATEDIFF(NOW(), createdat) <= 365 AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') and MONTH(createdat) != MONTH(now())",
        [userID]
      );

      const countQuer4 = await Qry(
        "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())",
        [userID, "Level 1 Bonus Deducted", lastMonthNumber]
      );

      let totalUser =
        countQuer2[0].userCount +
        countQuer3[0].userCount -
        countQuer4[0].userCount;

      let unilevelData;
      unilevelData = await Qry(
        "SELECT * FROM unilevels WHERE `number_of_users` <= ? ORDER BY `id` DESC LIMIT 1",
        [totalUser]
      );

      if (unilevelData.length === 0) {
        unilevelData = await Qry("SELECT * FROM unilevels WHERE id = ?", [0]);
      }

      // start total payment

      let totalPaymentEUR = 0;
      let totalPaymentUSD = 0;

      // start level 1 and 2
      const selectTraLevelTpay = `SELECT * FROM transactions WHERE receiverid = ? AND (type = ? or type = ?) and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())`;
      let resultTraLevelTPay = await Qry(selectTraLevelTpay, [
        userID,
        "Level 1 Bonus",
        "Level 2 Bonus",
        lastMonthNumber,
      ]);

      for (const data of resultTraLevelTPay) {
        let senderid = data.senderid;

        const selectSender1 = `SELECT * FROM usersdata WHERE id = ?`;
        let resultSender1 = await Qry(selectSender1, [senderid]);
        let levelBonus = 0;
        let amount = resultSender1[0].plan_amount;
        let currency = data.currency;

        if (data.type === "Level 1 Bonus") {
          levelBonus = unilevelData[0].level1;
        }

        if (data.type === "Level 2 Bonus") {
          levelBonus = unilevelData[0].level2;
        }

        let bonus = (amount / 100) * levelBonus;

        if (currency === "EUR") {
          totalPaymentEUR = totalPaymentEUR + bonus;
        }

        if (currency === "USD") {
          totalPaymentUSD = totalPaymentUSD + bonus;
        }
      }

      // end level 1 and 2

      // start deduct level 1 and 2
      const selectTraLevelDedTPay = `SELECT * FROM transactions WHERE receiverid = ? AND (type = ? or type = ?) and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())`;
      let resultTraLevelDedTPAY = await Qry(selectTraLevelDedTPay, [
        userID,
        "Level 1 Bonus Deducted",
        "Level 2 Bonus Deducted",
        lastMonthNumber,
      ]);

      for (const data of resultTraLevelDedTPAY) {
        let senderid = data.senderid;

        const selectSender1 = `SELECT * FROM usersdata WHERE id = ?`;
        let resultSender1 = await Qry(selectSender1, [senderid]);
        let levelBonus = 0;
        let amount = resultSender1[0].plan_amount;
        let currency = data.currency;

        if (data.type === "Level 1 Bonus Deducted") {
          levelBonus = unilevelData[0].level1;
        }

        if (data.type === "Level 2 Bonus Deducted") {
          levelBonus = unilevelData[0].level2;
        }

        let bonus = (amount / 100) * levelBonus;

        if (currency === "EUR") {
          totalPaymentEUR = totalPaymentEUR - bonus;
        }

        if (currency === "USD") {
          totalPaymentUSD = totalPaymentUSD - bonus;
        }
      }
      // end deduct level 1 and 2

      const selectBalanceAddAdminUSD = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND type = ? AND currency = ? AND MONTH(createdat) = ? AND YEAR(createdat) = YEAR(now())`;
      let resultBalanceAddAdminUSD = await Qry(selectBalanceAddAdminUSD, [
        userID,
        "Bonus Add By Admin",
        "USD",
        lastMonthNumber,
      ]);

      if (resultBalanceAddAdminUSD[0].totalAmount === null) {
        resultBalanceAddAdminUSD[0].totalAmount = 0;
      }

      const selectBalanceDeductAdminUSD = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND type = ? AND currency = ? AND MONTH(createdat) = ? AND YEAR(createdat) = YEAR(now())`;
      let resultBalanceDeductAdminUSD = await Qry(selectBalanceDeductAdminUSD, [
        userID,
        "Bonus Deduct By Admin",
        "USD",
        lastMonthNumber,
      ]);

      if (resultBalanceDeductAdminUSD[0].totalAmount === null) {
        resultBalanceDeductAdminUSD[0].totalAmount = 0;
      }

      const selectBalanceAddAdminEUR = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND type = ? AND currency = ? AND MONTH(createdat) = ? AND YEAR(createdat) = YEAR(now())`;
      let resultBalanceAddAdminEUR = await Qry(selectBalanceAddAdminEUR, [
        userID,
        "Bonus Add By Admin",
        "EUR",
        lastMonthNumber,
      ]);

      if (resultBalanceAddAdminEUR[0].totalAmount === null) {
        resultBalanceAddAdminEUR[0].totalAmount = 0;
      }

      const selectBalanceDeductAdminEUR = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND type = ? AND currency = ? AND MONTH(createdat) = ? AND YEAR(createdat) = YEAR(now())`;
      let resultBalanceDeductAdminEUR = await Qry(selectBalanceDeductAdminEUR, [
        userID,
        "Bonus Deduct By Admin",
        "EUR",
        lastMonthNumber,
      ]);

      if (resultBalanceDeductAdminEUR[0].totalAmount === null) {
        resultBalanceDeductAdminEUR[0].totalAmount = 0;
      }

      let usdOthers =
        resultBalanceAddAdminUSD[0].totalAmount -
        resultBalanceDeductAdminUSD[0].totalAmount;
      let eurOthers =
        resultBalanceAddAdminEUR[0].totalAmount -
        resultBalanceDeductAdminEUR[0].totalAmount;

      totalPaymentEUR = totalPaymentEUR + eurOthers;
      totalPaymentUSD = totalPaymentUSD + usdOthers;
      // end total payment

      let current_balance_usd = totalPaymentUSD;
      let current_balance_eur = totalPaymentEUR;

      let ol_lastmonth_usd = user.current_balance_usd_lastmonth;
      let ol_lastmonth_eur = user.current_balance_eur_lastmonth;

      let payout_usd = user.current_balance_usd_payout;
      let payout_eur = user.current_balance_eur_payout;

      let lifetime_usd = user.current_balance_usd_lifetime;
      let lifetime_eur = user.current_balance_eur_lifetime;

      payout_usd = payout_usd - ol_lastmonth_usd;
      payout_eur = payout_eur - ol_lastmonth_eur;

      payout_usd = payout_usd + current_balance_usd;
      payout_eur = payout_eur + current_balance_eur;

      lifetime_usd = lifetime_usd - ol_lastmonth_usd;
      lifetime_eur = lifetime_eur - ol_lastmonth_eur;

      lifetime_usd = lifetime_usd + current_balance_usd;
      lifetime_eur = lifetime_eur + current_balance_eur;

      const updateBalanceQuery = `UPDATE usersdata SET current_balance_usd_payout = ?, current_balance_eur_payout = ?, current_balance_usd_lastmonth = ?, current_balance_eur_lastmonth = ?, current_balance_usd_lifetime = ?, current_balance_eur_lifetime = ? WHERE id = ?`;
      await Qry(updateBalanceQuery, [
        payout_usd,
        payout_eur,
        current_balance_usd,
        current_balance_eur,
        lifetime_usd,
        lifetime_eur,
        userID,
      ]);

      const insertQuery = `INSERT INTO balance_transfer_for_payout (userid, amount_usd, amount_eur) VALUE (?, ?, ?)`;
      const runQuery = await Qry(insertQuery, [
        userID,
        current_balance_usd,
        current_balance_eur,
      ]);

      x = x + 1;
    }

    const updateAllUsers = `UPDATE usersdata SET withdrawal_status = ?`;
    await Qry(updateAllUsers, [1]);

    res.status(200).json({
      status: "success",
      message: "ok",
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.affiliateslifetimeearning = async (req, res) => {
  try {
    // const selectSettingsQuery = `SELECT * FROM setting WHERE keyname = ?`;
    // const selectSettingsResult = await Qry(selectSettingsQuery, [
    //   "pool1_status"
    // ]);

    // let pool1_status = parseInt(selectSettingsResult[0].keyvalue)

    const selectUserQuery = `SELECT * FROM usersdata WHERE usertype = ? and user_type = ?`;
    const selectUserResult = await Qry(selectUserQuery, [
      "user",
      "Distributor",
    ]);

    let dataArray = [];

    function getLastMonthNumber() {
      var currentDate = new Date();
      var lastMonth = currentDate.getMonth(); // Get current month
      lastMonth = lastMonth === 0 ? 12 : lastMonth; // If January, set to December
      return lastMonth;
    }

    let lastMonthNumber = getLastMonthNumber();
    lastMonthNumber = 3;

    let x = 1;
    for (const user of selectUserResult) {
      const selectUsersPkgData = `SELECT * FROM new_packages WHERE userid = ?`;
      let resultUserPkgData = await Qry(selectUsersPkgData, [user.id]);

      let currentUserPlanId = resultUserPkgData[0].planid;

      const countQuer1 = await Qry(
        "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = 1 AND DAY(createdat) >= 28 AND YEAR(createdat) = YEAR(now())",
        [user.id, "Level 1 Bonus"]
      );

      const countQuer2 = await Qry(
        "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = MONTH(now()) and YEAR(createdat) = YEAR(now())",
        [user.id, "Level 1 Bonus"]
      );

      const countQuer3 = await Qry(
        "SELECT COUNT(*) as userCount FROM usersdata WHERE sponsorid = ? AND sub_type = 'year' AND DAY(NOW()) >= DAY(createdat) AND DATEDIFF(NOW(), createdat) <= 365 AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') and MONTH(createdat) != MONTH(now())",
        [user.id]
      );

      const countQuer4 = await Qry(
        "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = MONTH(now()) and YEAR(createdat) = YEAR(now())",
        [user.id, "Level 1 Bonus Deducted"]
      );

      let totalUser =
        countQuer2[0].userCount +
        countQuer3[0].userCount -
        countQuer4[0].userCount;

      let unilevelData;
      unilevelData = await Qry(
        "SELECT * FROM unilevels WHERE `number_of_users` <= ? ORDER BY `id` DESC LIMIT 1",
        [totalUser]
      );

      if (unilevelData.length === 0) {
        unilevelData = await Qry("SELECT * FROM unilevels WHERE id = ?", [0]);
      }

      // start life time earning

      let lifeTimeEarningEUR = 0;
      let lifeTimeEarningUSD = 0;

      lifeTimeEarningEUR =
        lifeTimeEarningEUR + user.current_balance_eur_lifetime;
      lifeTimeEarningUSD =
        lifeTimeEarningUSD + user.current_balance_usd_lifetime;

      const selectPoolBonus = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND type IN ('Pool 1 Bonus', 'Pool 2 Bonus', 'Pool 3 Bonus', 'Bonus February Sales', 'Bonus February Sales Pending')`;
      let resultPoolBonus = await Qry(selectPoolBonus, [user.id]);

      if (resultPoolBonus[0].totalAmount === null) {
        resultPoolBonus[0].totalAmount = 0;
      }

      lifeTimeEarningUSD = lifeTimeEarningUSD + resultPoolBonus[0].totalAmount;

      // start level 1 and 2
      const selectTraLevel1 = `SELECT * FROM transactions WHERE receiverid = ? AND (type = ? or type = ?)`;
      let resultTraLevel = await Qry(selectTraLevel1, [
        user.id,
        "Level 1 Bonus",
        "Level 2 Bonus",
      ]);

      for (const data of resultTraLevel) {
        let senderid = data.senderid;

        const selectSender1 = `SELECT * FROM usersdata WHERE id = ?`;
        let resultSender1 = await Qry(selectSender1, [senderid]);
        let levelBonus = 0;
        let amount = resultSender1[0].plan_amount;
        let currency = data.currency;

        if (data.type === "Level 1 Bonus") {
          levelBonus = unilevelData[0].level1;

          if (
            currentUserPlanId ===
            "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-USD-Monthly" ||
            currentUserPlanId ===
            "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-EUR-Monthly" ||
            currentUserPlanId ===
            "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-USD-Monthly" ||
            currentUserPlanId ===
            "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-EUR-Monthly"
          ) {
            let senderCreatedat = resultSender1[0].createdat;

            const dateString = senderCreatedat;
            const date = new Date(dateString);

            // Extract month (0-indexed, so January is 0)
            const month = date.getMonth() + 1; // Adding 1 to get 1-indexed month
            // Extract day
            const day = date.getDate();

            if (month === 4 && day >= 14 && day <= 21) {
              levelBonus = 50;
            }
          }
        }

        if (data.type === "Level 2 Bonus") {
          levelBonus = unilevelData[0].level2;
        }

        let bonus = (amount / 100) * levelBonus;

        if (currency === "EUR") {
          lifeTimeEarningEUR = lifeTimeEarningEUR + bonus;
        }

        if (currency === "USD") {
          lifeTimeEarningUSD = lifeTimeEarningUSD + bonus;
        }
      }

      // end level 1 and 2

      // start deduct level 1 and 2
      const selectTraLevelDed = `SELECT * FROM transactions WHERE receiverid = ? AND (type = ? or type = ?)`;
      let resultTraLevelDed = await Qry(selectTraLevelDed, [
        user.id,
        "Level 1 Bonus Deducted",
        "Level 2 Bonus Deducted",
      ]);

      for (const data of resultTraLevelDed) {
        let senderid = data.senderid;

        const selectSender1 = `SELECT * FROM usersdata WHERE id = ?`;
        let resultSender1 = await Qry(selectSender1, [senderid]);
        let levelBonus = 0;
        let amount = resultSender1[0].plan_amount;
        let currency = data.currency;

        if (data.type === "Level 1 Bonus Deducted") {
          levelBonus = unilevelData[0].level1;

          if (
            currentUserPlanId ===
            "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-USD-Monthly" ||
            currentUserPlanId ===
            "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-EUR-Monthly" ||
            currentUserPlanId ===
            "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-USD-Monthly" ||
            currentUserPlanId ===
            "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-EUR-Monthly"
          ) {
            let senderCreatedat = resultSender1[0].createdat;

            const dateString = senderCreatedat;
            const date = new Date(dateString);

            // Extract month (0-indexed, so January is 0)
            const month = date.getMonth() + 1; // Adding 1 to get 1-indexed month
            // Extract day
            const day = date.getDate();

            if (month === 4 && day >= 14 && day <= 21) {
              levelBonus = 50;
            }
          }
        }

        if (data.type === "Level 2 Bonus Deducted") {
          levelBonus = unilevelData[0].level2;
        }

        let bonus = (amount / 100) * levelBonus;

        if (currency === "EUR") {
          lifeTimeEarningEUR = lifeTimeEarningEUR - bonus;
        }

        if (currency === "USD") {
          lifeTimeEarningUSD = lifeTimeEarningUSD - bonus;
        }
      }
      // end deduct level 1 and 2

      let eur = lifeTimeEarningEUR.toFixed(2);
      let usd = lifeTimeEarningUSD.toFixed(2);
      let username = user.username;
      let email = user.email;
      let firstname = user.firstname;
      let lastname = user.lastname;

      let obj = {
        id: x,
        eur: eur,
        usd: usd,
        username: username,
        email: email,
        firstname: firstname,
        lastname: lastname,
      };

      dataArray.push(obj);

      // end life time earning
      x = x + 1;
    }

    res.status(200).json({
      status: "success",
      message: "ok",
      data: dataArray,
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.setpaidamount = async (req, res) => {
  try {
    const getunilevelQuery = `SELECT * FROM transactions where type IN ('Level 1 Bonus',
      'Level 2 Bonus',
      'Level 1 Bonus Deducted',
      'Level 2 Bonus Deducted',
      'Pool 1 Bonus Deducted',
      'Pool 2 Bonus Deducted',
      'Pool 3 Bonus Deducted',
      'Pool 1 Bonus Added',
      'Pool 2 Bonus Added',
      'Pool 3 Bonus Added') and MONTH(createdat)>1`;
    const levelBonusData = await Qry(getunilevelQuery);

    let x = 1;
    let plan_amount = 0;
    let amount;
    let currency;
    for (const data of levelBonusData) {
      if (
        data.type === "Level 1 Bonus" ||
        data.type === "Level 2 Bonus" ||
        data.type === "Level 1 Bonus Deducted" ||
        data.type === "Level 2 Bonus Deducted"
      ) {
        const date = new Date(data.createdat);
        const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${date
            .getDate()
            .toString()
            .padStart(2, "0")} ${date
              .getHours()
              .toString()
              .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
        if (data.event_type === "subscription_changed") {
          const getunilevelQuery1111 =
            "SELECT * FROM transactions WHERE senderid = ? AND event_type = ? and type = ? and DATE_FORMAT(createdat, '%Y-%m-%d %H:%i') = ?";
          const levelBonusData1111 = await Qry(getunilevelQuery1111, [
            data.senderid,
            "subscription_changed",
            "Pool 1 Bonus Added",
            formattedDate,
          ]);

          if (levelBonusData1111.length === 0) {
            const getunilevelQuery33 = `SELECT * FROM usersdata where id = ?`;
            const levelBonusData33 = await Qry(getunilevelQuery33, [
              data.senderid,
            ]);
            amount = levelBonusData33[0].plan_amount;
            currency = levelBonusData33[0].currency;
          } else {
            amount = levelBonusData1111[0].amount;
            currency = levelBonusData1111[0].currency;
          }

          if (levelBonusData1111.length !== 0) {
            if (currency === "EUR") {
              amount = amount / 1.06;
            }
          }

          plan_amount = amount * 100;
        }

        if (data.event_type === "subscription_created") {
          const getunilevelQuery1111 =
            "SELECT * FROM transactions WHERE senderid = ? AND event_type = ? and type = ? and DATE_FORMAT(createdat, '%Y-%m-%d %H:%i') = ?";
          const levelBonusData1111 = await Qry(getunilevelQuery1111, [
            data.senderid,
            "subscription_created",
            "Pool 1 Bonus Added",
            formattedDate,
          ]);

          if (levelBonusData1111.length === 0) {
            const getunilevelQuery33 = `SELECT * FROM usersdata where id = ?`;
            const levelBonusData33 = await Qry(getunilevelQuery33, [
              data.senderid,
            ]);
            amount = levelBonusData33[0].plan_amount;
            currency = levelBonusData33[0].currency;
          } else {
            amount = levelBonusData1111[0].amount;
            currency = levelBonusData1111[0].currency;
          }

          if (levelBonusData1111.length !== 0) {
            if (currency === "EUR") {
              amount = amount / 1.06;
            }
          }

          plan_amount = amount * 100;
        }

        if (data.event_type === "subscription_renewed") {
          const getunilevelQuery1111 =
            "SELECT * FROM transactions WHERE senderid = ? AND event_type = ? and type = ? and DATE_FORMAT(createdat, '%Y-%m-%d %H:%i') = ?";
          const levelBonusData1111 = await Qry(getunilevelQuery1111, [
            data.senderid,
            "subscription_renewed",
            "Pool 1 Bonus Added",
            formattedDate,
          ]);

          if (levelBonusData1111.length === 0) {
            const getunilevelQuery33 = `SELECT * FROM usersdata where id = ?`;
            const levelBonusData33 = await Qry(getunilevelQuery, [
              data.senderid,
            ]);
            amount = levelBonusData33[0].plan_amount;
            currency = levelBonusData33[0].currency;
          } else {
            amount = levelBonusData1111[0].amount;
            currency = levelBonusData1111[0].currency;
          }

          if (levelBonusData1111.length !== 0) {
            if (currency === "EUR") {
              amount = amount / 1.06;
            }
          }

          plan_amount = amount * 100;
        }

        if (data.event_type === "payment_succeeded") {
          const getunilevelQuery1111 =
            "SELECT * FROM transactions WHERE senderid = ? AND event_type = ? and type = ? and DATE_FORMAT(createdat, '%Y-%m-%d %H:%i') = ?";
          const levelBonusData1111 = await Qry(getunilevelQuery1111, [
            data.senderid,
            "payment_succeeded",
            "Pool 1 Bonus Added",
            formattedDate,
          ]);

          if (levelBonusData1111.length === 0) {
            const getunilevelQuery33 = `SELECT * FROM usersdata where id = ?`;
            const levelBonusData33 = await Qry(getunilevelQuery33, [
              data.senderid,
            ]);
            amount = levelBonusData33[0].plan_amount;
            currency = levelBonusData33[0].currency;
          } else {
            amount = levelBonusData1111[0].amount;
            currency = levelBonusData1111[0].currency;
          }

          if (levelBonusData1111.length !== 0) {
            if (currency === "EUR") {
              amount = amount / 1.06;
            }
          }
          plan_amount = amount * 100;
        }

        if (data.event_type === "payment_refunded") {
          const getunilevelQuery1111 =
            "SELECT * FROM transactions WHERE senderid = ? AND event_type = ? and type = ? and DATE_FORMAT(createdat, '%Y-%m-%d %H:%i') = ?";
          const levelBonusData1111 = await Qry(getunilevelQuery1111, [
            data.senderid,
            "payment_refunded",
            "Pool 1 Bonus Deducted",
            formattedDate,
          ]);

          if (levelBonusData1111.length === 0) {
            const getunilevelQuery33 = `SELECT * FROM usersdata where id = ?`;
            const levelBonusData33 = await Qry(getunilevelQuery33, [
              data.senderid,
            ]);
            amount = levelBonusData33[0].plan_amount;
            currency = levelBonusData33[0].currency;
          } else {
            amount = levelBonusData1111[0].amount;
            currency = levelBonusData1111[0].currency;
          }

          if (levelBonusData1111.length !== 0) {
            if (currency === "EUR") {
              amount = amount / 1.06;
            }
          }
          plan_amount = amount * 100;
        }

        if (!plan_amount) {
          plan_amount = 0;
        }

        const updateLoginQuery = `UPDATE transactions SET paid_amount = ? WHERE id = ?`;
        const updateLoginParams = [plan_amount, data.id];
        const updateLoginResult = await Qry(
          updateLoginQuery,
          updateLoginParams
        );
      }

      if (
        data.type === "Pool 1 Bonus Added" ||
        data.type === "Pool 2 Bonus Added" ||
        data.type === "Pool 3 Bonus Added" ||
        data.type === "Pool 1 Bonus Deducted" ||
        data.type === "Pool 2 Bonus Deducted" ||
        data.type === "Pool 3 Bonus Deducted"
      ) {
        let poolAmount = data.amount;
        let poolCurrency = data.currency;
        let poolPlanAMount = 0;

        if (poolCurrency === "EUR") {
          poolAmount = poolAmount / 1.06;
        }

        poolPlanAMount = poolAmount * 100;

        const updateLoginQuery = `UPDATE transactions SET paid_amount = ? WHERE id = ?`;
        const updateLoginParams = [poolPlanAMount, data.id];
        const updateLoginResult = await Qry(
          updateLoginQuery,
          updateLoginParams
        );
      }

      x = x + 1;
    }

    const updateSetings = `UPDATE setting SET keyvalue = ? WHERE keyname = ?`;
    await Qry(updateSetings, ["1", "set_commission_status"]);

    res.status(200).json({
      status: "success",
      message: "ok",
    });
  } catch (e) { }
};

exports.getunilevelreports111 = async (req, res) => {
  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const getunilevelQuery33 = `SELECT * FROM usersdata where usertype = ? and user_type = ? and (subscription_status = ? or subscription_status = ?)`;
      const levelBonusData33 = await Qry(getunilevelQuery33, [
        "user",
        "Distributor",
        "Active",
        "subscription_renewed",
      ]);

      let dataArry = [];

      let x = 1;
      for (const data of levelBonusData33) {
        let userid = data.id;
        let month = 4;
        let old_eur = 0;
        let old_usd = 0;
        let new_eur = 0;
        let new_usd = 0;

        let old_data = await total_payment_function1(userid, month);
        let new_data = await total_payment_function(userid, month);

        old_eur = old_data.totalPaymentEUR;
        old_usd = old_data.totalPaymentUSD;

        new_eur = new_data.totalPaymentEUR;
        new_usd = new_data.totalPaymentUSD;

        let obj = {
          id: x,
          username: data.username,
          eur: "€" + old_eur.toFixed(2) + " / " + "€" + new_eur.toFixed(2),
          usd: "$" + old_usd.toFixed(2) + " / " + "$" + new_usd.toFixed(2),
        };

        dataArry.push(obj);

        x = x + 1;
      }
      res.json({
        status: "success",
        data: dataArry,
        // data: testArr
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.charge = async (req, res) => {
  const { customerId, currency, itemPriceId } = req.body;
  // "German-Event-Frankfurt-080325-EUR"
  try {
    const createSubscription = () => {
      return new Promise((resolve, reject) => {
        chargebee.hosted_page
          .checkout_one_time_for_items({
            customer: {
              // id: "BTcd7fTcoGu7zKAB"
              id: customerId,
            },
            // currency_code: "USD",
            currency_code: currency,
            item_prices: [
              {
                // item_price_id: "Challenge-Affiliate-PRO-FR-157-USD"
                item_price_id: itemPriceId,
              },
            ],
          })
          .request(function (error, result) {
            if (error) {
              console.log('error--10755', error);
              //handle error
            } else {
              var hosted_page = result.hosted_page;
              resolve(result);
            }
          });
      });
    };

    let subscription = await createSubscription();

    res.json({
      status: "success",
      data: await subscription.hosted_page,
    });
  } catch (error) {
    console.log('error--10772', error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.setlimits2222 = async (req, res) => {
  try {
    const selectUserQuery = `SELECT * FROM new_packages where pkg_name = ? or pkg_name = ? or pkg_name = ?`;
    const selectUserResult = await Qry(selectUserQuery, [
      "Starter - Facebook + Instagram",
      "Pro - Facebook + Instagram",
      "Unlimited - Facebook + Instagram",
    ]);

    let x = 1;

    for (const user of selectUserResult) {
      let user_id = user.userid;

      const selectUserQuery11 = `SELECT * FROM usersdata where id = ?`;
      const selectUserResult11 = await Qry(selectUserQuery11, [user_id]);

      const updateUserLastPer = await Qry(
        "UPDATE usersdata SET `connection_type` = ? WHERE id = ?",
        [2, user_id]
      );

      x = x + 1;
    }

    res.json({
      status: "success",
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.getplansbyfamilyid = async (req, res) => {
  const postData = req.body;
  try {
    chargebee.item_price
      .list({
        limit: 50,
        "status[is]": "active",
        "currency_code[is]": "USD",
        "sort_by[asc]": "id",
        "period_unit[is]": "year",
        "item_family_id[is]": "Michel-Destruel",
      })
      .request(function (error, result) {
        if (error) {
        } else {
          res.json({
            status: "success",
            data: result,
          });
        }
      });
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.getResellerPlans = async (req, res) => {
  try {
    const postData = req.body;
    var result = [];
    const query = `SELECT * FROM plans where status = ?`;
    result = await Qry(query, [1]);

    res.json({
      status: "success",
      data: result,
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.testgetitems = async (req, res) => {
  const postData = req.body;
  try {
    chargebee.item
      .retrieve("Pro-Facebook-Instagram")
      .request(function (error, result) { });
  } catch (error) { }
};

exports.cancelsubscription = async (req, res) => {
  const postData = req.body;
  const authUser = await checkAuthorization(req, res);
  try {
    if (authUser) {
      const pkgSelectQuery = `SELECT * FROM new_packages WHERE userid = ? and type = ?`;
      const pkgSelectParams = [authUser, "package"];
      const pkgSelectResult = await Qry(pkgSelectQuery, pkgSelectParams);
      let subscriptionId = pkgSelectResult[0].subscriptionid;

      chargebee.subscription
        .cancel_for_items(subscriptionId, {
          credit_option_for_current_term_charges: "PRORATE",
          end_of_term: false,
        })
        .request(async function (error, result) {
          if (error) {
            //handle error
            res.json({ status: "error", message: error.message });
          } else {
            const updateUserData = await Qry(
              "update usersdata set login_status = ?, subscription_status = ? where id = ?",
              ["Block", "subscription_cancelled", authUser]
            );
            res.json({
              status: "success",
              message: "Subscription has been cancelled successfully.",
            });
          }
        });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};

exports.settrialrenewal = async (req, res) => {
  try {

    const query = `
    SELECT * 
    FROM usersdata 
    WHERE trial = ? and trial_status = ? and (subscription_status = ?)`;
    let result = await Qry(query, ['Yes', 'Active', 'subscription_renewed']);
    let x = 1
    for (data of result) {

      // const pkgSelectQuery = `SELECT * FROM transactions WHERE senderid = ? and type = ? and MONTH(createdat) = 8`;
      // const pkgSelectParams = [data.id, "Level 1 Bonus"];
      // const pkgSelectResult = await Qry(pkgSelectQuery, pkgSelectParams);


      x = x + 1
    }
    res.json({
      status: "success",
      // data: result,
    });
  } catch (error) {
    console.log('error', error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.getsubscriptionitemsupgrade = async (req, res) => {
  const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
  const postData = req.body;
  try {

    if (authUser) {

      const selectUserQuery = "SELECT * FROM usersdata WHERE id = ?";
      const selectUserResult = await Qry(selectUserQuery, [authUser]);

      let trial = 'No';

      if (postData.subdomain === 'lyriange') {
        trial = 'Yes'
      }

      const selectPlanQuery = "SELECT * FROM plans WHERE subdomain = ? and currency_code = ? and period_unit = ? and plan_type = ? and trial = ?";
      const selectPlanResult = await Qry(selectPlanQuery, [postData.subdomain, selectUserResult[0].currency, postData.period_unit, postData.plan_type, trial]);


      const selectPkgQuery = "SELECT * FROM new_packages WHERE userid = ? and type = ?";
      const selectPkgResult = await Qry(selectPkgQuery, [authUser, 'package']);

      let planId = selectPkgResult[0].planid

      const selectUserPlanQuery = "SELECT * FROM plans WHERE plan_id = ?";
      const selectUserPlanResult = await Qry(selectUserPlanQuery, [planId]);

      currentPlanData = selectUserPlanResult[0]

      let oldPlan = 'No'

      if (!selectUserPlanResult[0].plan_name) {
        oldPlan = 'Yes'
      }

      currentPlanData.oldPlan = oldPlan


      res.json({
        status: "success",
        data: selectPlanResult,
        currentPlanData: currentPlanData,
        authUserData: selectUserResult[0]
      });

    }

  } catch (error) {
    if (debugging === "true") {
      console.error("Error executing query:", error);
    }
    console.error("Error executing query:", error);

    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.checkupgradehostedpage = async (req, res) => {
  const postData = req.body;
  try {
    const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    const hostedId = CleanHTMLData(CleanDBData(postData?.hostedId));
    const checkHostedId = () => {
      return new Promise((resolve, reject) => {
        chargebee.hosted_page
          .retrieve(hostedId)
          .request(function (error, result) {
            if (error) {
              if (debugging === "true") {
                console.log(error);
              }
              reject(error);
            } else {
              resolve(result.hosted_page);
            }
          });
      });
    };

    if (authUser) {
      var subscriptionResult = await checkHostedId();
      const hostedStatus = subscriptionResult.state;

      if (hostedStatus === "succeeded") {
        res.json({
          status: "success",
          message: "You have upgrade your subscription successfully.",
        });
      }
      else {
        res.json({
          status: "error",
          message: "Server error occurred",
        });
      }

    }
  } catch (error) {
    if (debugging === "true") {
      console.error("Error executing query:", error);
    }
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
};

exports.uploadImageToS3Bucket = async (req, res) => {
  try {
    limit = req.body?.limit || 100
    let data = await ProcessBase64ImageDataFunc(limit)
    res.json({
      status: "success",
      message: "action completed",
      data
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "something went wrong",
      error
    });
  }
};

exports.setL2SponsorId = async (req, res) => {
  try {
    let data = await processL2SponsorId()
    res.json({
      status: "success",
      message: "action completed",
      data
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "something went wrong",
      error
    });
  }
};

exports.chargeBeeDatta = async (req, res) => {
  const filePath = path.join(__dirname, "userList.csv");

  fs.createReadStream(filePath).pipe(csv()).on("data", async (row) => {
    if (row.customerid && row.plan_id && row.billing_amount && row.currency) {
      try {
        const customerID = row.customerid;
        const planID = row.plan_id;
        const billingAmount = row.billing_amount;
        const currency = row.currency;

        let periodStrArr = planID.split("-");
        let periodInd = periodStrArr[periodStrArr.length - 1];
        let period = "";
        let period_unit = "";
        if (periodInd === "months") {
          period = 3;
          period_unit = "month";
        } else if (periodInd === "Monthly") {
          period = 1;
          period_unit = "month";
        } else if (periodInd === "Yearly") {
          period = 1;
          period_unit = "year";
        }

        const planLimitqry = `SELECT limits FROM plans WHERE plan_id = ?`;
        const getLimits = await Qry(planLimitqry, [planID]);
        const Limits = getLimits[0].limits;

        const updateLoginQuery = `UPDATE usersdata SET plan_price = ?, currency = ?, sub_type = ?, plan_period = ?, plan_pkg = ? WHERE customerid = ?`;
        await Qry(updateLoginQuery, [
          billingAmount,
          currency,
          period_unit,
          period,
          Limits,
          customerID,
        ]);


      } catch (error) {
        console.error(`Error processing row for customerID ${row.customerid}:`, error);
      }
    }
  })
    .on("end", () => {
      res.json({
        status: "success",
        message: "Data updated successfully",
      });
    })
    .on("error", (error) => {
      res.json({
        status: "error",
        message: "Error reading CSV file",
      });
    });
};

exports.cronjobAffiliateCalculation = async (req, res) => {
  try {
    const select_user_result = await Qry(`SELECT * FROM usersdata WHERE usertype = ? and user_type = ?`, [
      "user",
      "Distributor",
    ]);
    
    const affiliate_comission = await Qry(`SELECT * FROM affiliate_comission WHERE calculation_status = ?`, ["pending"]);
    select_user_result.forEach(async(user) => {
      //Test 2537
      if(user.id == 2537){
        
        let af_commission_usd = affiliate_comission.filter(af => af.sponser_id === user.id && af.currency === "USD");
        let af_commission_eur = affiliate_comission.filter(af => af.sponser_id === user.id && af.currency === "EUR");

        let total_usd = af_commission_usd.reduce((sum, af) => sum + af.amount, 0);
        let total_eur = af_commission_eur.reduce((sum, af) => sum + af.amount, 0);
        
        if(total_usd){
          await Qry(
              `INSERT INTO affiliate_payout 
              (user_id, total_amount, amount_after_tax, currency, created_at, updated_at) 
              VALUES (?, ?, ?, ?, NOW(), NOW())`, 
              [user.id, total_usd, total_usd, "USD"]
          );
        }

        if(total_eur){
          await Qry(
              `INSERT INTO affiliate_payout 
              (user_id, total_amount, amount_after_tax, currency, created_at, updated_at) 
              VALUES (?, ?, ?, ?, NOW(), NOW())`, 
              [user.id, total_eur, total_eur, "EUR"]
          );
        }
        
        // Extract IDs from affiliate_comission
        let af_commission_ids = affiliate_comission.filter(af => af.sponser_id === user.id).map(af => af.id);
        if (af_commission_ids.length > 0) {
            await Qry(`UPDATE affiliate_comission SET calculation_status = ? WHERE id IN (?)`, ["done", af_commission_ids]);
        }
        
        //Final Updates Doubt?
        /*
        await Qry(`UPDATE usersdata SET current_balance_usd_payout = current_balance_usd_payout + ?, current_balance_eur_payout = current_balance_eur_payout + ?, current_balance_usd_lastmonth = ?, current_balance_eur_lastmonth = ? WHERE id = ?`, [
          total_usd,
          total_eur,
          total_usd,
          total_eur,
          user.id,
        ]);

        await Qry(`INSERT INTO balance_transfer_for_payout (userid, amount_usd, amount_eur) VALUE (?, ?, ?)`, [
          user.id,
          total_usd,
          total_eur,
        ]);*/

        await Qry(`UPDATE usersdata SET withdrawal_status = ? WHERE id = ?`, [1,user.id]);
      }
    });
    res.status(200).json({
      status: "success",
      message: "ok",
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
};
