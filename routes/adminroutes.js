const express = require("express");
const forever = require("forever");
const app = express();
const multer = require("multer");
const path = require("path");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto-js");
const fs = require("fs");
const { CleanHTMLData, CleanDBData } = require("../config/database/connection");
const transporter = require("../config/mail/mailconfig");
const emailTemplate = require("../helpers/emailTemplates/emailTemplates");
const logger = require("../utils/logger"); // Adjust the path according to your file structure

require("dotenv").config();

const encryptionKey = process.env.KEY;
const {
  Qry,
  adminAuthorization,
  randomToken,
  settings_data,
  binary_tree_get_users_data,
  binary_tree_get_users,
  current_month_active_referrals_function,
  current_month_organization_points_function,
  current_month_referral_points_function,
  current_month_organization_members_function,
  pre_month_active_referrals_function,
  pre_month_organization_points_function,
  pre_month_referral_points_function,
  pre_month_organization_members_function,
  currentMonthFun,
  total_payment_function,
  Grand_total_payment_function,
  pendng_commission,
  newSalesFunction,
} = require("../helpers/functions");
const chargebee = require("chargebee");
const secretKey = process.env.jwtSecretKey;
const sitename = process.env.sitename;
const sitekey = process.env.sitekey;

const backoffice_link = process.env.backOfficeLink;
const weblink = process.env.webLink;
const emailImagesLink = process.env.emailImagesLink;
const noreply_email = process.env.noReplyEmail;
const company_name = process.env.companyName;
const image_base_url = process.env.image_base_url;

// Create a multer middleware for handling the file upload
const upload = multer();
chargebee.configure({
  site: sitename,
  api_key: sitekey,
});

router.post("/login", async (req, res) => {
  const postData = req.body;
  const username = CleanHTMLData(CleanDBData(postData.username));
  const password = CleanHTMLData(CleanDBData(postData.password));

  try {
    const selectUserQuery = `SELECT * FROM usersdata WHERE username = ?`;
    const selectUserResult = await Qry(selectUserQuery, [username]);

    if (selectUserResult.length === 0) {
      res.json({
        status: "error",
        message: "Invalid login details.",
      });
      return;
    }

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
        message: "Please verify your account first. We have sent you an email.",
      });
      return;
    } else if (
      user.username === username &&
      passwordMatch &&
      (user.usertype === "admin" || user.usertype === "reseller")
    ) {
      const token = jwt.sign({ username }, secretKey, { expiresIn: "12h" });
      const date = new Date().toISOString().slice(0, 19).replace("T", " ");
      const expireat = new Date(date);
      expireat.setHours(expireat.getHours() + 1);

      const updateLoginQuery = `UPDATE usersdata SET lastlogin = ?, lastip = ? WHERE username = ?`;
      const updateLoginParams = [date, req.ip, username];
      const updateLoginResult = await Qry(updateLoginQuery, updateLoginParams);

      const userSelectQuery = `SELECT username, usertype, parent_id, randomcode, firstname, lastname, email, picture, current_balance, status, mobile, emailstatus, address1,company, country, createdat, login_status, lastlogin, lastip FROM usersdata WHERE id = ?`;
      const userSelectParams = [user.id];
      const userSelectResult = await Qry(userSelectQuery, userSelectParams);
      var userdbData = userSelectResult[0];

      if (userdbData && userdbData.parent_id) {
        var reseller_mini_admin = true;
      } else {
        var reseller_mini_admin = false;
      }

      userdbData.reseller_mini_admin = reseller_mini_admin;

      if (updateLoginResult.affectedRows > 0) {
        logger.info(
          `${selectUserResult[0].username} has been logged in successfully`,
          { type: "admin", user_id: user.id }
        );

        res.json({
          status: "success",
          message: "Login Successfully",
          token: token,
          user: userdbData,
        });
        return;
      }
    } else {
      res.json({
        status: "error",
        message: "you are not allowed to login as admin",
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//login user by admin
router.post("/loginfromadmin", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    const postData = req.body;
    const username = CleanHTMLData(CleanDBData(postData.username));

    if (authUser) {
    }
    const selectUserQuery = `SELECT * FROM usersdata WHERE username = ?`;
    const selectUserResult = await Qry(selectUserQuery, [username]);

    if (selectUserResult.length === 0) {
      res.json({
        status: "error",
        message: "Invalid user details.",
      });
      return;
    }

    res.json({
      status: "success",
      message: "Login Successfully",
      userid: selectUserResult[0].id,
    });
    return;
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//login admin data
router.post("/userdata", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token

    if (authUser) {
      const userSelectQuery = `SELECT parent_id, sponsorid, username, randomcode, firstname, lastname, email, picture, admin_logo, fav_icon, current_balance, usertype, status, mobile, emailstatus, address1,company, country, createdat, login_status, lastlogin, lastip, allowedroutes FROM usersdata WHERE id = ?`;

      const userSelectParams = [authUser.id];
      const userSelectResult = await Qry(userSelectQuery, userSelectParams);
      const userdbData = userSelectResult[0];

      const transactionSelectQuery = `SELECT COALESCE(SUM(amount), 0) AS totalpayout FROM transactions WHERE type = 'payout' AND receiverid = ?`;
      const transactionSelectParams = [authUser.id];
      const transactionSelectResult = await Qry(
        transactionSelectQuery,
        transactionSelectParams
      );
      const transactiondbData = transactionSelectResult[0];
      userdbData.totalpayout = transactiondbData.totalpayout;

      const selectTreeQuery = `SELECT COUNT(*) AS count FROM usersdata WHERE sponsorid = ? AND status = 'approved'`;
      const selectTreeParams = [authUser.id];
      const selectTreeResult = await Qry(selectTreeQuery, selectTreeParams);
      const count = selectTreeResult[0].count;
      userdbData.activereferrals = count;

      userdbData.referrallink = `${weblink}signup/${userdbData.randomcode}`;

      userdbData.profilepictureurl = `${image_base_url}uploads/userprofile/${userdbData.picture}`;
      userdbData.userProfileUrl = `${image_base_url}uploads/userprofile/${userdbData.admin_logo}`;
      userdbData.favIconUrl = `${image_base_url}uploads/userprofile/${userdbData.fav_icon}`;

      res.json({
        status: "success",
        data: userdbData,
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

router.post("/createusersession", async (req, res) => {
  const postData = req.body;
  const userid = CleanHTMLData(CleanDBData(postData.userId));
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const userSelectResult = await Qry(
        `SELECT username,email,website FROM usersdata WHERE id = ?`,
        [userid]
      );
      if (userSelectResult.length > 0) {
        const userdbData = userSelectResult[0];
        const TokenName = userdbData.email;
        const token = jwt.sign({ TokenName, createdby: authUser }, secretKey, {
          expiresIn: "10m",
        });

        const selectAdminQuery = `select * from usersdata where id = ?`;
        const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);

        logger.info(
          `${selectAdminResult[0].username} has logged in user ${userdbData.TokenName} from admin panel`,
          { type: "admin" }
        );
        const link =userdbData?.website === "nuskin" ?"https://wcy-nuskin.novalya.com/":weblink

        res.json({
          status: "success",
          accessurl: link + "login/" + token + "/manual/",
        });
      } else {
        res.json({
          status: "error",
          data: "user not found",
        });
      }
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});


router.post("/adminSetAffiliate", async (req, res) => {
  const {id,isAffiliate} = req.body;
  try {
    const updateQuery = `UPDATE usersdata SET isAffiliate = ? WHERE id = ?`;
    const updateParams = [isAffiliate, id];
    const updateResult = await Qry(updateQuery, updateParams);

    if (updateResult.affectedRows > 0) {
      res.json({
        status: "success",
        message:
          "Affiliate tab successfully updated",
      });
    } else {
      res.json({
        status: "error",
        message: "Failed to update email token",
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//forget password
router.post("/forgetpassword", async (req, res) => {
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
          res.json({
            status: "success",
            message:
              "Email sent for password reset request. Please check your email.",
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
});

//reset password
router.post("/resetpassword", async (req, res) => {
  const postData = req.body;
  const email = CleanHTMLData(CleanDBData(postData.email));
  const password = CleanHTMLData(CleanDBData(postData.password));

  try {
    const selectUserQuery = `SELECT * FROM usersdata WHERE email = ?`;
    const selectUserResult = await Qry(selectUserQuery, [email]);
    const userData = selectUserResult[0];

    if (!userData || userData.email !== email) {
      res.json({
        status: "error",
        message: "Invalid account",
      });
      return;
    }

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

    const updateQuery = `UPDATE usersdata SET password = ?, emailtoken = '' WHERE email = ?`;
    const updateParams = [encryptedPassword, email];
    const updateResult = await Qry(updateQuery, updateParams);

    if (updateResult.affectedRows > 0) {
      res.json({
        status: "success",
        message: "Password updated successfully",
      });
    } else {
      res.json({
        status: "error",
        message: "Failed to update password",
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//verify email status
router.post("/verifyemailaccount", async (req, res) => {
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
        res.json({
          status: "success",
          message: "valid token",
        });
      } else {
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
});

//validate email token
router.post("/validateemailtoken", async (req, res) => {
  const postData = req.body;
  const email = CleanHTMLData(CleanDBData(postData.email));
  const token = CleanHTMLData(CleanDBData(postData.token));

  try {
    const selectUserQuery = `SELECT * FROM usersdata WHERE email = ? AND emailtoken = ?`;
    const selectUserResult = await Qry(selectUserQuery, [email, token]);
    const userData = selectUserResult[0];

    if (userData && userData.email === email && userData.emailtoken === token) {
      res.json({
        status: "success",
        message: "Valid token",
      });
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
});

//Add News
router.post(
  "/addnews",
  upload.fields([{ name: "newsimage", maxCount: 1 }]),
  async (req, res) => {
    try {
      const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
      const postData = req.body;
      let news_image;
      const uploadDir = path.join(__dirname, "../public/uploads/news/");

      if (authUser) {
        const title = CleanHTMLData(CleanDBData(postData.title));
        const description = CleanHTMLData(CleanDBData(postData.description));

        const idCardFront = postData.newsimage?.split(";base64,");
        const idCardFrontTypeAux = idCardFront[0]?.split("image/");
        const idCardFrontType = idCardFrontTypeAux[1];
        const idCardFrontBase64 = Buffer.from(idCardFront[1], "base64");
        const idCardFrontFilename = `${Date.now()}.png`;
        const idCardFrontFilePath = path.join(uploadDir, idCardFrontFilename);
        fs.writeFileSync(idCardFrontFilePath, idCardFrontBase64);
        news_image = idCardFrontFilename;

        const insertQuery =
          "INSERT into news (title,description,image) values (?,?,?)";
        const updateParams = [title, description, news_image];
        const updateResult = await Qry(insertQuery, updateParams);

        if (updateResult.affectedRows > 0) {
          const selectAdminQuery = `select * from usersdata where id = ?`;
          const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);
          logger.info(`${selectAdminResult[0].username} has added news`, {
            type: "admin",
          });

          res.json({
            status: "success",
            message: "News has been addedd successfully!",
          });
        } else {
          res.json({
            status: "error",
            message: "Failed to insert news",
          });
        }
      }
    } catch (error) {
      res.json({
        status: "error",
        message: "Server error occurred",
      });
    }
  }
);

//Get News
router.post("/getnews", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const getNews = `SELECT * from news`;
      const NewsData = await Qry(getNews);

      res.json({
        status: "success",
        data: NewsData,
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//Delete News
router.post("/deletenews", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token

    if (authUser) {
      const postData = req.body;
      const id = CleanHTMLData(CleanDBData(postData.id));

      const deleteQuery = "DELETE from news WHERE id = ?";
      const deleteParams = [id];
      const deleteResult = await Qry(deleteQuery, deleteParams);

      if (deleteResult.affectedRows > 0) {
        const selectAdminQuery = `select * from usersdata where id = ?`;
        const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);
        logger.info(`${selectAdminResult[0].username} has deleted news`, {
          type: "admin",
        });

        res.json({
          status: "success",
          message: "News deleted successfully!",
        });
      } else {
        res.json({
          status: "error",
          message: "Failed to delete news",
        });
      }
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//Update User Current Balance
router.post("/updatecurrentbalance/", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    const postData = req.body;

    if (authUser) {
      const userid = CleanHTMLData(CleanDBData(postData.userid));
      const type = CleanHTMLData(CleanDBData(postData.type));
      const reason = CleanHTMLData(CleanDBData(postData.reason));
      const currency = CleanHTMLData(CleanDBData(postData.currency));
      const amount = CleanHTMLData(CleanDBData(postData.amount));
      const currentBalanceEUR = CleanHTMLData(
        CleanDBData(postData.currentBalanceEUR)
      );
      const currentBalanceUSD = CleanHTMLData(
        CleanDBData(postData.currentBalanceUSD)
      );
      const admin_transaction_password = CleanHTMLData(
        CleanDBData(postData.admin_transaction_password)
      );

      const selectAdminQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);

      const decryptedPassword = crypto.AES.decrypt(
        selectAdminResult[0].admin_transaction_password,
        encryptionKey
      ).toString(crypto.enc.Utf8);
      const passwordMatch = bcrypt.compareSync(
        admin_transaction_password,
        decryptedPassword
      );

      if (!passwordMatch) {
        res.json({
          status: "error",
          message: "Invalid admin transaction password",
        });
        return;
      }

      const selectUserQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectUserResult = await Qry(selectUserQuery, [userid]);

      if (selectUserResult.length === 0) {
        res.json({
          status: "error",
          message: "No account found with this username",
        });
        return;
      }

      let new_balance = 0;
      let details = "";
      let oldbalance = 0;
      if (type === "Deduct") {
        if (currency === "EUR") {
          new_balance = currentBalanceEUR - amount;
          oldbalance = currentBalanceEUR;
        }
        if (currency === "USD") {
          new_balance = currentBalanceUSD - amount;
          oldbalance = currentBalanceUSD;
        }
        details =
          amount +
          " " +
          currency +
          " has been deducted from your balance by admin";
      } else if (type === "Add") {
        if (currency === "EUR") {
          new_balance = currentBalanceEUR + amount;
          oldbalance = currentBalanceEUR;
        }
        if (currency === "USD") {
          new_balance = currentBalanceUSD + amount;
          oldbalance = currentBalanceUSD;
        }
        details =
          amount + " " + currency + " has been added to your balance by admin";
      }

      const insertQuery =
        "insert into transactions ( receiverid, senderid, amount, type, details, currency, reason) values ( ? , ? , ? ,? , ? , ?, ?)";
      const insertParams = [
        userid,
        0,
        amount,
        `Bonus ${type} By Admin`,
        details,
        currency,
        reason,
      ];
      const insertResult = await Qry(insertQuery, insertParams);

      if (insertResult.affectedRows > 0) {
        const selectAdminQuery = `select * from usersdata where id = ?`;
        const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);
        logger.info(
          `${selectAdminResult[0].username} has update user ${selectUserResult[0].username} balance. User old balance was ${oldbalance} and new balance is ${new_balance}`,
          { type: "admin" }
        );

        res.json({
          status: "success",
          message: "User balance has been " + type + "ed successfully",
        });
      } else {
        res.json({
          status: "error",
          message: "Failed to update balance",
        });
      }
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//Update User Details
router.post("/updateuserdetails/", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    const postData = req.body;

    if (authUser) {
      const userid = CleanHTMLData(CleanDBData(postData.userid));
      const username = CleanHTMLData(CleanDBData(postData.username));
      const email = CleanHTMLData(CleanDBData(postData.email));
      const firstname = CleanHTMLData(CleanDBData(postData.first_name));
      const lastname = CleanHTMLData(CleanDBData(postData.last_name));
      const admin_transaction_password = CleanHTMLData(
        CleanDBData(postData.admin_transaction_password)
      );

      const selectAdminQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);

      const decryptedPassword = crypto.AES.decrypt(
        selectAdminResult[0].admin_transaction_password,
        encryptionKey
      ).toString(crypto.enc.Utf8);
      const passwordMatch = bcrypt.compareSync(
        admin_transaction_password,
        decryptedPassword
      );

      if (!passwordMatch) {
        res.json({
          status: "error",
          message: "Invalid admin transaction password",
        });
        return;
      }

      const selectUserQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectUserResult = await Qry(selectUserQuery, [userid]);

      const oldUserName = selectUserResult[0].username;
      const oldEmail = selectUserResult[0].email;
      const oldFirstName = selectUserResult[0].firstname;
      const oldLastName = selectUserResult[0].lastname;
      const customerId = selectUserResult[0].customerid;

      if (
        username === "" ||
        username === null ||
        firstname === "" ||
        firstname === null ||
        lastname === "" ||
        lastname === null ||
        email === "" ||
        email === null
      ) {
        res.json({
          status: "error",
          message: "Invalid user details.",
        });
        return;
      }

      if (oldUserName !== username) {
        const selectCheckUserQuery = `SELECT COUNT(*) as total FROM usersdata WHERE username = ?`;
        const selectCheckUserResult = await Qry(selectCheckUserQuery, [
          username,
        ]);
        if (selectCheckUserResult[0].total > 0) {
          res.json({
            status: "error",
            message: "Username already exist.",
          });
          return;
        }
      }

      if (oldEmail !== email) {
        const selectCheckUserQuery = `SELECT COUNT(*) as total FROM usersdata WHERE email = ?`;
        const selectCheckUserResult = await Qry(selectCheckUserQuery, [email]);
        if (selectCheckUserResult[0].total > 0) {
          res.json({
            status: "error",
            message: "User with this email is already exist.",
          });
          return;
        }
      }

      // if (oldFirstName !== firstname) {
      //   const selectCheckUserQuery = `SELECT COUNT(*) as total FROM usersdata WHERE firstname = ?`;
      //   const selectCheckUserResult = await Qry(selectCheckUserQuery, [
      //     firstname,
      //   ]);
      //   if (selectCheckUserResult[0].total > 0) {
      //     res.json({
      //       status: "error",
      //       message: "User with this first name is already exist.",
      //     });
      //     return;
      //   }
      // }

      // if (oldLastName !== lastname) {
      //   const selectCheckUserQuery = `SELECT COUNT(*) as total FROM usersdata WHERE lastname = ?`;
      //   const selectCheckUserResult = await Qry(selectCheckUserQuery, [
      //     lastname,
      //   ]);
      //   if (selectCheckUserResult[0].total > 0) {
      //     res.json({
      //       status: "error",
      //       message: "User with this last name is already exist.",
      //     });
      //     return;
      //   }
      // }

      const updateQuery = `UPDATE usersdata SET username = ?, email = ?, firstname = ?, lastname = ? where id = ?`;
      const updateResult = await Qry(updateQuery, [
        username,
        email,
        firstname,
        lastname,
        userid,
      ]);

      if (updateResult.affectedRows > 0) {
        chargebee.customer.update(customerId, {
          first_name: firstname,
          last_name: lastname,
          email: email,
          cf_first_name: firstname,
          cf_last_name: lastname,
          cf_email: email,
        }).request(function (error, result) {
          if (error) {
            //handle error
            console.log(error);
          } else {
            console.log(result);
            var customer = result.customer;
            var card = result.card;
          }
        });
        logger.info(
          `${selectAdminResult[0].username} has update userdetails of user ${selectUserResult[0].username}`,
          { type: "admin" }
        );
        res.json({
          status: "success",
          message: "User details has been updated successfully.",
        });
      }
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

router.post("/chatToggle", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token

    if (!authUser) {
      res.status(401).json({
        status: "unauthorized",
        message: "User not authorized",
      });
      return;
    }
    const isChatActive = req.body.isChatActive;
    const userid=req.body.userid

    const updateQuery = `UPDATE usersdata SET isChatActive = ? where id = ?`;
    const updateResult = await Qry(updateQuery, [
      isChatActive,userid
    ]);
    if(updateResult.affectedRows > 0){
      res.json({
        status: "success",
        message: "User details has been updated successfully.",
      });
    }
  }catch(err) {
    res.status(500).json({ status: "error", message: err });
  }
  
  })

router.post("/test", async (req, res) => {
  try {
    chargebee.customer.update("198OeOUL2CdveKW", {
      first_name: "Hunain",
      last_name: "Ayyub",
      locale: "fr-CA"
    }).request(function (error, result) {
      if (error) {
        //handle error
        console.log(error);
      } else {
        console.log(result);
        var customer = result.customer;
        var card = result.card;
      }
    });
  } catch (e) {
    console.log('error===>', e.message)
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/updateuserplanlimits/", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    const postData = req.body;

    if (authUser) {
      const userid = CleanHTMLData(CleanDBData(postData.userid));
      const no_crm_group = CleanHTMLData(CleanDBData(postData.no_crm_group));
      const no_stages_group = CleanHTMLData(
        CleanDBData(postData.no_stages_group)
      );
      const no_friend_request = CleanHTMLData(
        CleanDBData(postData.no_friend_request)
      );
      const no_crm_message = CleanHTMLData(
        CleanDBData(postData.no_crm_message)
      );
      const no_ai_comment = CleanHTMLData(CleanDBData(postData.no_ai_comment));
      const advanced_novadata = CleanHTMLData(
        CleanDBData(postData.advanced_novadata)
      );
      const no_friend_requests_received = CleanHTMLData(
        CleanDBData(postData.no_friend_requests_received)
      );
      const no_of_birthday_wishes = CleanHTMLData(
        CleanDBData(postData.no_of_birthday_wishes)
      );

      const updateQuery = `UPDATE usersdata SET no_crm_group = ?, no_stages_group = ?, no_friend_request = ?, no_crm_message = ?, no_ai_comment = ?, advanced_novadata = ?, no_friend_requests_received = ? ,no_of_birthday_wishes = ? where id = ?`;
      const updateResult = await Qry(updateQuery, [
        no_crm_group,
        no_stages_group,
        no_friend_request,
        no_crm_message,
        no_ai_comment,
        advanced_novadata,
        no_friend_requests_received,
        no_of_birthday_wishes,
        userid,
      ]);

      res.json({
        status: "success",
        message: "User plan limits has been updated successfully.",
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

router.post("/updateuserunilevel/", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    const postData = req.body;

    if (authUser) {
      const userid = CleanHTMLData(CleanDBData(postData.userid));
      const level1_commission_per = CleanHTMLData(
        CleanDBData(postData.level1_commission_per)
      );
      const level2_commission_per = CleanHTMLData(
        CleanDBData(postData.level2_commission_per)
      );
      const level_commission_individual_status = CleanHTMLData(
        CleanDBData(postData.level_commission_individual_status)
      );

      const updateQuery = `UPDATE usersdata SET level1_commission_per = ?, level2_commission_per = ?, level_commission_individual_status = ? where id = ?`;
      const updateResult = await Qry(updateQuery, [
        level1_commission_per,
        level2_commission_per,
        level_commission_individual_status,
        userid,
      ]);

      res.json({
        status: "success",
        message: "User level commission has been updated successfully.",
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//Get Users List
router.post("/getuserslist", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    const userId = authUser.id;
    var getUsers = "";
    var UsersData = "";

    if (authUser) {
      getUsers = `SELECT 
      ud.id,ud.isChatActive, ud.isAffiliate ,ud.username, ud.website, ud.customerid, ud.firstname, ud.lastname, ud.email, ud.createdat, ud.mobile, ud.bank_account_title, ud.bank_account_iban, ud.bank_account_bic, ud.bank_account_country, ud.bank_account_address, ud.bank_account_city, ud.bank_account_zip_code, ud.payout_country, ud.wallet_address, ud.outside_bank_account_title, ud.outside_bank_account_number, ud.outside_bank_account_swift_code, ud.outside_bank_account_routing, ud.outside_bank_account_address, ud.outside_bank_account_city, ud.outside_bank_account_zip_code, ud.outside_bank_account_country, ud.outside_payout_country, ud.subscription_status, ud.login_status, ud.randomcode, ud.current_balance, ud.connect_status, ud.birthday_status, ud.crm_status, ud.unfollow_status, ud.connection_type,
      rn.name AS rank_name, 
      lt.name AS life_time_rank_name, 
      nfr.name AS novafree_rank_name, 
      spn.username as sponsor_name, 
      spe.email as sponsor_email 
      FROM usersdata ud 
      LEFT JOIN rank rn ON ud.rank = rn.id 
      LEFT JOIN rank lt ON ud.life_time_rank = lt.id 
      LEFT JOIN novafree_rank nfr ON ud.novarank = nfr.id 
      LEFT JOIN usersdata spn ON ud.sponsorid = spn.id 
      LEFT JOIN usersdata spe ON ud.sponsorid = spe.id 
      WHERE ud.usertype = ?`;
      UsersData = await Qry(getUsers, ["user"]);

      if (
        authUser.usertype == "reseller" ||
        (authUser.usertype == "admin" && authUser.parentId > 0)
      ) {
        getUsers = `SELECT 
        ud.id, ud.username,ud.isChatActive,ud.isAffiliate, ud.website, ud.customerid, ud.firstname, ud.lastname, ud.email, ud.createdat, ud.mobile, ud.bank_account_title, ud.bank_account_iban, ud.bank_account_bic, ud.bank_account_country, ud.bank_account_address, ud.bank_account_city, ud.bank_account_zip_code, ud.payout_country, ud.wallet_address, ud.outside_bank_account_title, ud.outside_bank_account_number, ud.outside_bank_account_swift_code, ud.outside_bank_account_routing, ud.outside_bank_account_address, ud.outside_bank_account_city, ud.outside_bank_account_zip_code, ud.outside_bank_account_country, ud.outside_payout_country, ud.subscription_status, ud.login_status, ud.randomcode, ud.current_balance, ud.connect_status, ud.birthday_status, ud.crm_status, ud.unfollow_status, ud.connection_type,
        rn.name AS rank_name,
        lt.name AS life_time_rank_name,
        nfr.name AS novafree_rank_name,
        spn.username as sponsor_name,
        spe.email as sponsor_email
        FROM usersdata ud
        LEFT JOIN rank rn ON ud.rank = rn.id
        LEFT JOIN rank lt ON ud.life_time_rank = lt.id
        LEFT JOIN novafree_rank nfr ON ud.novarank = nfr.id
        LEFT JOIN usersdata spn ON ud.sponsorid = spn.id
        LEFT JOIN usersdata spe ON ud.sponsorid = spe.id
        WHERE ud.usertype = ? and ud.parent_id = ?
        `;

        if (authUser.usertype == "reseller") {
          UsersData = await Qry(getUsers, ["user", authUser.id]);
        } else if (authUser.usertype == "admin" && authUser.parentId > 0) {
          UsersData = await Qry(getUsers, ["user", authUser.parentId]);
        }
      } else {
        const getUsers = `SELECT 
        ud.id, ud.username,ud.isChatActive, ud.website,ud.customerid,ud.isAffiliate, ud.firstname, ud.lastname, ud.email, ud.createdat, ud.mobile, ud.bank_account_title, ud.bank_account_iban, ud.bank_account_bic,
        ud.bank_account_country, ud.bank_account_address, ud.bank_account_city, ud.bank_account_zip_code, ud.payout_country, ud.wallet_address, ud.outside_bank_account_title,
        ud.outside_bank_account_number, ud.outside_bank_account_swift_code, ud.outside_bank_account_routing, ud.outside_bank_account_address, ud.outside_bank_account_city, ud.outside_bank_account_zip_code,
        ud.outside_bank_account_country, ud.outside_payout_country, ud.subscription_status, ud.login_status, ud.randomcode, ud.current_balance, ud.connect_status, ud.birthday_status, ud.crm_status,
        ud.unfollow_status, ud.connection_type,
        rn.name AS rank_name,
        lt.name AS life_time_rank_name,
        nfr.name AS novafree_rank_name,
        spn.username as sponsor_name,
        spe.email as sponsor_email
        FROM usersdata ud
        LEFT JOIN rank rn ON ud.rank = rn.id
        LEFT JOIN rank lt ON ud.life_time_rank = lt.id
        LEFT JOIN novafree_rank nfr ON ud.novarank = nfr.id
        LEFT JOIN usersdata spn ON ud.sponsorid = spn.id
        LEFT JOIN usersdata spe ON ud.sponsorid = spe.id
        WHERE ud.usertype = ? 
        `;
        UsersData = await Qry(getUsers, ["user"]);
      }

      res.json({
        status: "success",
        userdata: UsersData,
        working:"yes"
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: error.message,
    });
  }
});

router.post("/userbinarydetails", async (req, res) => {
  const postData = req.body;
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const month = postData.month;
      const month1 = postData.month1;
      const getUsers1 = `SELECT 
        pr.id, pr.userid, pr.direct_active_left_members, pr.direct_active_right_members, pr.team_active_left_members, pr.team_active_right_members, pr.left_referral_points, pr.right_referral_points, pr.left_binary_points, pr.right_binary_points, pr.dat,
        ud.id AS user_id, ud.username, ud.firstname, ud.lastname, ud.email, ud.createdat, ud.mobile, ud.bank_account_title, ud.bank_account_iban, ud.bank_account_bic, ud.bank_account_country, ud.wallet_address, ud.subscription_status, ud.login_status, ud.randomcode, ud.current_balance, ud.connect_status, ud.birthday_status, ud.crm_status, ud.unfollow_status, ud.user_type, ud.rank, 
        COALESCE(rn.name, 'Starter') AS rank_name,
        COALESCE(nfr.name, 'Starter') AS novafree_rank_name,
        sp.username as sponsor_name,
        sp.email as sponsor_email,
        rs.id AS rank_summary_id,
        rs.new_rank AS rank_new,
        CASE WHEN np.userid IS NOT NULL THEN 'Yes' ELSE 'No' END AS has_distributor_package,
        COALESCE(tb.binary_bonus_sum, 0) AS binary_bonus_sum
        FROM previous_record pr
        LEFT JOIN usersdata ud ON ud.id = pr.userid
        LEFT JOIN (
          SELECT userid, MAX(id) AS max_id
          FROM rank_summary
          WHERE MONTH(dat) = '${month}'
          GROUP BY userid
        ) max_ids ON pr.userid = max_ids.userid
        LEFT JOIN rank_summary rs ON max_ids.userid = rs.userid AND max_ids.max_id = rs.id
        LEFT JOIN rank rn ON rs.new_rank = rn.id
        LEFT JOIN novafree_rank nfr ON rs.new_rank = nfr.id
        LEFT JOIN usersdata sp ON ud.sponsorid = sp.id
        LEFT JOIN new_packages np ON np.userid = pr.userid AND np.type = 'distributor' AND MONTH(np.dat) <= '${month}'
        LEFT JOIN (
          SELECT receiverid, SUM(amount) AS binary_bonus_sum
          FROM transactions
          WHERE type = 'Binary Bonus' AND MONTH(createdat) = '${month}'
          GROUP BY receiverid
        ) tb ON pr.userid = tb.receiverid
        WHERE MONTH(pr.dat) = '${month1}'
        ORDER BY pr.id ASC;`;

      const UsersData = await Qry(getUsers1);

      function monthName(monthNumber) {
        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];

        if (monthNumber >= 1 && monthNumber <= 12) {
          return monthNames[monthNumber - 1];
        } else {
          return "Invalid Month";
        }
      }

      const result = monthName(month);

      res.json({
        status: "success",
        userdata: UsersData,
        month: result,
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//update profile data
router.post("/updateprofiledata", async (req, res) => {
  const postData = req.body;
  try {
    const authUser = await adminAuthorization(req, res);
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
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

//update profile picture
router.post(
  "/updateprofilepicture/",
  upload.single("image"),
  async (req, res) => {
    const postData = req.body;
    try {
      const authUser = await adminAuthorization(req, res);
      if (authUser) {
        const uploadDir = path.join(
          __dirname,
          "../public/uploads/userprofile/"
        );
        const imageParts = req.body.image.split(";base64,");
        const imageTypeAux = imageParts[0].split("image/");
        const imageType = imageTypeAux[1];
        const imageBase64 = Buffer.from(imageParts[1], "base64");

        const filename = `${Date.now()}.png`;
        const filePath = path.join(uploadDir, filename);

        try {
          fs.writeFileSync(filePath, imageBase64);
          const date = new Date().toISOString();

          const updateQuery = `UPDATE usersdata SET picture = '${filename}', updatedat = '${date}'  WHERE id = '${authUser}'`;
          const updateResult = await Qry(updateQuery);

          if (updateResult) {
            const pictureUrl = `${req.protocol}://${req.get(
              "host"
            )}/uploads/userprofile/${filename}`;
            res.status(200).json({
              status: "success",
              message: "Profile picture updated successfully",
              pictureurl: pictureUrl,
            });
          } else {
            res.status(500).json({
              status: "error",
              message: "Something went wrong. Please try again later.",
            });
          }
        } catch (error) {
          res.status(500).json({
            status: "error",
            message:
              "An error occurred while uploading file. Please try again later.",
          });
        }
      }
    } catch (e) {
      res.status(500).json({ status: "error", message: e });
    }
  }
);

//update profile password
router.post("/updatepassword/", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    const postData = req.body;
    const oldpassword = CleanHTMLData(CleanDBData(postData.oldpassword));
    const newpassword = CleanHTMLData(CleanDBData(postData.newpassword));

    if (authUser) {
      const selectUserQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectUserResult = await Qry(selectUserQuery, [authUser.id]);

      // Generate a salt for password hashing
      const saltRounds = 16; // The number of salt rounds determines the complexity of the hashing
      const salt = bcrypt.genSaltSync(saltRounds);

      const options = {
        cost: 12, // Specify the hashing cost (higher cost means more secure but slower)
        salt: salt, // Pass the generated salt
      };
      const hashedPassword = bcrypt.hashSync(newpassword, options.cost);
      const encryptedPassword = crypto.AES.encrypt(
        hashedPassword,
        encryptionKey
      ).toString();
      const decryptedPassword = crypto.AES.decrypt(
        selectUserResult[0].password,
        encryptionKey
      ).toString(crypto.enc.Utf8);
      const passwordMatch = bcrypt.compareSync(oldpassword, decryptedPassword);

      if (!passwordMatch) {
        res.json({
          status: "error",
          message: "Incorrect Old Password",
        });
        return;
      }

      const updateQuery = "UPDATE usersdata SET password = ? WHERE id = ?";
      const updateParams = [encryptedPassword, authUser];
      const updateResult = await Qry(updateQuery, updateParams);

      if (updateResult.affectedRows > 0) {
        const selectAdminQuery = `select * from usersdata where id = ?`;
        const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);
        logger.info(
          `${selectAdminResult[0].username} has update its account password`,
          { type: "admin" }
        );

        res.json({
          status: "success",
          message: "Password has been updated successfully",
        });
      }
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//get settings data
router.post("/getsettingsdata", async (req, res) => {
  const postData = req.body;
  const keynames = postData.keynames;

  try {
    const authUser = await adminAuthorization(req, res);
    const settingslist = {};
    if (authUser) {
      const settingSelectQuery = `SELECT * FROM setting WHERE keyname IN (${keynames})`;
      const settingSelectResult = await Qry(settingSelectQuery);
      const settingsdbData = settingSelectResult;

      settingslist["values"] = settingsdbData;

      if (Object.keys(settingslist).length > 0) {
        res.json({
          status: "success",
          data: settingslist,
        });
      }
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//update settings data
router.post("/updatesettingsdata", async (req, res) => {
  const postData = req.body;

  try {
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const selectAdminQuery = `select * from usersdata where id = ?`;
      const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);
      if (postData.image) {
        const uploadDir = path.join(
          __dirname,
          "../public/uploads/adminuploads/"
        );
        const imageParts = req.body.image.split(";base64,");
        const imageTypeAux = imageParts[0].split("image/");
        const imageType = imageTypeAux[1];
        const imageBase64 = Buffer.from(imageParts[1], "base64");
        const filename = `${Date.now()}.png`;
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, imageBase64);
        const currentDate = new Date().toISOString();

        postData.obj.walletqrcode = filename1;
        postData.obj.walletaddress = req.body.walletaddress;
        postData.obj.walletmessage = req.body.walletmessage;

        for (const [keyname, value] of Object.entries(postData.obj)) {
          const updateQuery = `UPDATE setting SET keyvalue = ? WHERE keyname = ?`;
          const updateParams = [value, keyname];
          await Qry(updateQuery, updateParams);
        }
        res.json({
          status: "success",
          message: "Deposit wallet updated successfully",
          qrpictureurl: `${backoffice_link}/backend_apis/views/uploads/walletqr/${filename1}`,
        });
      } else {
        for (const [keyname, value] of Object.entries(postData.obj)) {
          const updateQuery = `UPDATE setting SET keyvalue = ? WHERE keyname = ?`;
          const updateParams = [value, keyname];
          await Qry(updateQuery, updateParams);

          logger.info(
            `${selectAdminResult[0].username} has update ${keyname} from setting data`,
            { type: "admin" }
          );
        }

        res.json({
          status: "success",
          message: "settings data has been updated successfully",
        });
      }
    }
  } catch (error) {
    res.status(500).json({ status: "error", message: e });
  }
});

//update user password
router.post("/updateuserpassword/", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    const postData = req.body;
    const userid = CleanHTMLData(CleanDBData(postData.userid));
    const password = CleanHTMLData(CleanDBData(postData.password));
    const confirmassword = CleanHTMLData(CleanDBData(postData.confirmpassword));
    const admintransactionpassword = CleanHTMLData(
      CleanDBData(postData.admintransactionpassword)
    );

    if (authUser) {
      const selectUserQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectUserResult = await Qry(selectUserQuery, [authUser.id]);

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
      const decryptedPassword = crypto.AES.decrypt(
        selectUserResult[0].admin_transaction_password,
        encryptionKey
      ).toString(crypto.enc.Utf8);
      const passwordMatch = bcrypt.compareSync(
        admintransactionpassword,
        decryptedPassword
      );

      if (!passwordMatch) {
        res.json({
          status: "error",
          message: "Invalid admin transaction password",
        });
        return;
      }

      if (password !== confirmassword) {
        res.json({
          status: "error",
          message: "Password does not matched",
        });
        return;
      }

      const updateQuery =
        "UPDATE usersdata SET password = ?, password_status = ? WHERE id = ?";
      const updateParams = [encryptedPassword, 1, userid];
      const updateResult = await Qry(updateQuery, updateParams);

      if (updateResult.affectedRows > 0) {
        const selectAdminQuery = `select * from usersdata where id = ?`;
        const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);

        const selectUser11Query = `SELECT * FROM usersdata WHERE id = ?`;
        const selectUser11Result = await Qry(selectUser11Query, [userid]);

        logger.info(
          `${selectAdminResult[0].username} has update account password of user ${selectUser11Result[0].username}`,
          { type: "admin" }
        );

        res.json({
          status: "success",
          message: "User password has been updated successfully",
        });
      }
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//update admin transaction password
router.post("/updatetransactionpassword", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    const postData = req.body;
    const oldpassword = CleanHTMLData(CleanDBData(postData.oldpassword));
    const newpassword = CleanHTMLData(CleanDBData(postData.newpassword));

    if (authUser) {
      const selectUserQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectUserResult = await Qry(selectUserQuery, [authUser.id]);

      // Generate a salt for password hashing
      const saltRounds = 16; // The number of salt rounds determines the complexity of the hashing
      const salt = bcrypt.genSaltSync(saltRounds);

      const options = {
        cost: 12, // Specify the hashing cost (higher cost means more secure but slower)
        salt: salt, // Pass the generated salt
      };
      const hashedPassword = bcrypt.hashSync(newpassword, options.cost);
      const encryptedPassword = crypto.AES.encrypt(
        hashedPassword,
        encryptionKey
      ).toString();
      const decryptedPassword = crypto.AES.decrypt(
        selectUserResult[0].admin_transaction_password,
        encryptionKey
      ).toString(crypto.enc.Utf8);
      const passwordMatch = bcrypt.compareSync(oldpassword, decryptedPassword);

      if (!passwordMatch) {
        res.json({
          status: "error",
          message: "Incorrect old transaction password",
        });
        return;
      }

      const updateQuery =
        "UPDATE usersdata SET admin_transaction_password = ? WHERE id = ?";
      const updateParams = [encryptedPassword, authUser];
      const updateResult = await Qry(updateQuery, updateParams);

      if (updateResult.affectedRows > 0) {
        logger.info(
          `${selectUserResult[0].username} has update its transaction password`,
          { type: "admin" }
        );

        res.json({
          status: "success",
          message: "Transaction password has been updated successfully",
        });
      }
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

router.post("/blockuser", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    const postData = req.body;
    const userid = CleanHTMLData(CleanDBData(postData.userid));
    if (authUser) {
      const updateQuery = "UPDATE usersdata SET login_status = ? WHERE id = ?";
      const updateParams = [`${postData?.status}`, userid]
      const updateResult = await Qry(updateQuery, updateParams);

      if (updateResult.affectedRows > 0) {
        const selectAdminQuery = `select * from usersdata where id = ?`;
        const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);

        const selectUserQuery = `SELECT * FROM usersdata WHERE id = ?`;
        const selectUserResult = await Qry(selectUserQuery, [userid]);

        if(postData?.status == "Unblock" && (selectUserResult[0]?.subscription_status == 'subscription_cancelled' || 
          selectUserResult[0]?.subscription_status == 'payment_failed' || 
          selectUserResult[0]?.subscription_status == 'payment_refunded')
        ){
            
          const updateQuery1 = "UPDATE usersdata SET subscription_status = ? WHERE id = ?";
          const updateParams1 = ["Active", userid];
          const updateResult1 = await Qry(updateQuery1, updateParams1);
        }

        logger.info(
          `${selectAdminResult[0].username} has block login status of user ${selectUserResult[0].username}`,
          { type: "admin" }
        );

        res.json({
          status: "success",
          message: `User has been ${postData?.status} successfully`,
        });
      }
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

router.post("/unblockuser", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    const postData = req.body;
    const userid = CleanHTMLData(CleanDBData(postData.userid));
    if (authUser) {
      const updateQuery = "UPDATE usersdata SET login_status = ? WHERE id = ?";
      const updateParams = ["Unblock", userid];
      const updateResult = await Qry(updateQuery, updateParams);

      if (updateResult.affectedRows > 0) {
        const selectAdminQuery = `select * from usersdata where id = ?`;
        const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);

        const selectUserQuery = `SELECT * FROM usersdata WHERE id = ?`;
        const selectUserResult = await Qry(selectUserQuery, [userid]);

        if(selectUserResult[0]?.subscription_status == 'subscription_cancelled' || 
          selectUserResult[0]?.subscription_status == 'payment_failed' || 
          selectUserResult[0]?.subscription_status == 'payment_refunded'
        ){
            
          const updateQuery1 = "UPDATE usersdata SET subscription_status = ? WHERE id = ?";
          const updateParams1 = ["Active", userid];
          const updateResult1 = await Qry(updateQuery1, updateParams1);
        }

        logger.info(
          `${selectAdminResult[0].username} has unblock login status of user ${selectUserResult[0].username}`,
          { type: "admin" }
        );

        res.json({
          status: "success",
          message: "User has been unblock successfully",
        });
      }
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

// start kyc routs
router.post("/kycreport", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const getKYC = `SELECT k.*, ud.username, ud.firstname, ud.lastname, ud.email 
      FROM kyc k
      left join usersdata ud on k.userid = ud.id
      ORDER BY id DESC`;
      const kycData = await Qry(getKYC);
      const imageURL = `${backoffice_link}uploads/kyc/`;

      const getKYCRejected = `SELECT DISTINCT reason FROM kyc where status = ? and reason is not null`;
      const reasonData = await Qry(getKYCRejected, ['Rejected']);

      res.json({
        status: "success",
        data: kycData,
        imageURL: imageURL,
        reasonData: reasonData
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

router.post("/approvekyc", async (req, res) => {
  try {
    const postData = req.body;
    const kycId = postData.id;
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const selectkycQuery = `SELECT * FROM kyc WHERE id = ?`;
      const selectkycResult = await Qry(selectkycQuery, [kycId]);

      const updateKYC = await Qry("update kyc set status = ? where id = ?", [
        "Approved",
        kycId,
      ]);
      const updateUser = await Qry(
        "update usersdata set kyc_status = ? where id = ?",
        ["Verified", selectkycResult[0].userid]
      );

      const selectAdminQuery = `select * from usersdata where id = ?`;
      const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);

      const selectUserQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectUserResult = await Qry(selectUserQuery, [
        selectkycResult[0].userid,
      ]);
      logger.info(
        `${selectAdminResult[0].username} has approved kyc of user ${selectUserResult[0].username}`,
        { type: "admin" }
      );

      res.json({
        status: "success",
        message: "KYC has been approved successfully.",
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

router.post("/rejectkyc", async (req, res) => {
  try {
    const postData = req.body;
    const kycId = postData.id;
    const reason = postData.reason;
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const selectkycQuery = `SELECT * FROM kyc WHERE id = ?`;
      const selectkycResult = await Qry(selectkycQuery, [kycId]);

      const updateKYC = await Qry("update kyc set status = ?, reason = ? where id = ?", [
        "Rejected",
        reason,
        kycId,
      ]);
      const updateUser = await Qry(
        "update usersdata set kyc_status = ? where id = ?",
        ["Unverified", selectkycResult[0].userid]
      );

      const selectAdminQuery = `select * from usersdata where id = ?`;
      const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);

      const selectUserQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectUserResult = await Qry(selectUserQuery, [
        selectkycResult[0].userid,
      ]);
      logger.info(
        `${selectAdminResult[0].username} has rejected kyc of user ${selectUserResult[0].username}`,
        { type: "admin" }
      );

      res.json({
        status: "success",
        message: "KYC has been rejected successfully.",
      });
    }
  } catch (error) {
    console.log('error==>', error.message)
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});
// end kyc routs

// start payout details update request routs
router.post("/payoutdetailsupdatereport", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const getRequest = `SELECT po.*, ud.username, ud.firstname, ud.lastname, ud.email, ud.wallet_address AS walletaddress, ud.bank_account_title AS bankaccounttitle, ud.bank_account_country AS bankaccountcountry, ud.bank_account_bic AS bankaccountbic, ud.bank_account_iban AS bankaccountiban, ud.bank_account_address AS bankaccountaddress, ud.bank_account_city AS bankaccountcity, ud.bank_account_zip_code AS bankaccountzipcode, ud.payout_country AS payoutcountry, ud.outside_bank_account_title AS outsidebankaccounttitle, ud.outside_bank_account_country AS outsidebankaccountcountry, ud.outside_bank_account_number AS outsidebankaccountnumber, ud.outside_bank_account_swift_code AS outsidebankaccountswiftcode, ud.outside_bank_account_routing AS outsidebankaccountrouting, ud.outside_bank_account_currency AS outsidebankaccountcurrency, ud.outside_bank_account_address AS outsidebankaccountaddress, ud.outside_bank_account_city AS outsidebankaccountcity, ud.outside_bank_account_zip_code AS outsidebankaccountzipcode, ud.outside_bank_account_street AS outsidebankaccountstreet, ud.outside_payout_country AS outsidepayoutcountry FROM payout_information_request po left join usersdata ud on po.userid = ud.id ORDER BY po.id DESC`;
      const requestData = await Qry(getRequest);

      const getKYCRejected = `SELECT DISTINCT reason FROM payout_information_request where status = ? and reason is not null`;
      const reasonData = await Qry(getKYCRejected, ['Rejected']);

      res.json({
        status: "success",
        data: requestData,
        reasonData: reasonData
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

router.post("/approvepayoutupdaterequest", async (req, res) => {
  try {
    const postData = req.body;
    const requestId = postData.id;
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const selectrequestQuery = `SELECT * FROM payout_information_request WHERE id = ?`;
      const selectrequestResult = await Qry(selectrequestQuery, [requestId]);

      let walletaddress = selectrequestResult[0].wallet_address;
      let bankaccounttitle = selectrequestResult[0].bank_account_title;
      let bankaccountcountry = selectrequestResult[0].bank_account_country;
      let bankaccountiban = selectrequestResult[0].bank_account_iban;
      let bankaccountbic = selectrequestResult[0].bank_account_bic;
      let bankaccountaddress = selectrequestResult[0].bank_account_address;
      let bankaccountcity = selectrequestResult[0].bank_account_city;
      let bankaccountzipcode = selectrequestResult[0].bank_account_zip_code;
      let payoutcountry = selectrequestResult[0].payout_country;
      let outsidebankaccounttitle =
        selectrequestResult[0].outside_bank_account_title;
      let outsidebankaccountcountry =
        selectrequestResult[0].outside_bank_account_country;
      let outsidecbankaccountnumber =
        selectrequestResult[0].outside_bank_account_number;
      let outsidebankaccountswiftcode =
        selectrequestResult[0].outside_bank_account_swift_code;
      let outsidebankaccountrouting =
        selectrequestResult[0].outside_bank_account_routing;
      let outsidebankaccountcurrency =
        selectrequestResult[0].outside_bank_account_currency;
      let outsidebankaccountaddress =
        selectrequestResult[0].outside_bank_account_address;
      let outsidebankaccountcity =
        selectrequestResult[0].outside_bank_account_city;
      let outsidebankaccountzipcode =
        selectrequestResult[0].outside_bank_account_zip_code;
      let outsidebankaccountstreet =
        selectrequestResult[0].outside_bank_account_street;
      let outsidepayoutcountry = selectrequestResult[0].outside_payout_country;

      const updaterequest = await Qry(
        "update payout_information_request set status = ? where id = ?",
        ["Approved", requestId]
      );
      const updateUserQuery =
        "update usersdata set `wallet_address` = ?, `bank_account_title` = ?, `bank_account_country` = ?, `bank_account_iban` = ?, `bank_account_bic` = ?, `bank_account_address` = ?, `bank_account_city` = ?, `bank_account_zip_code` = ?, `payout_country` = ?, `outside_bank_account_title` = ?, `outside_bank_account_country` = ?, `outside_bank_account_number` = ?, `outside_bank_account_swift_code` = ?, `outside_bank_account_routing` = ?, `outside_bank_account_currency` = ?, `outside_bank_account_address` = ?, `outside_bank_account_city` = ?, `outside_bank_account_zip_code` = ?, `outside_bank_account_street` = ?, `outside_payout_country` = ? where id = ?";
      const updateUserParams = [
        walletaddress,
        bankaccounttitle,
        bankaccountcountry,
        bankaccountiban,
        bankaccountbic,
        bankaccountaddress,
        bankaccountcity,
        bankaccountzipcode,
        payoutcountry,
        outsidebankaccounttitle,
        outsidebankaccountcountry,
        outsidecbankaccountnumber,
        outsidebankaccountswiftcode,
        outsidebankaccountrouting,
        outsidebankaccountcurrency,
        outsidebankaccountaddress,
        outsidebankaccountcity,
        outsidebankaccountzipcode,
        outsidebankaccountstreet,
        outsidepayoutcountry,
        selectrequestResult[0].userid,
      ];
      const updateUser = await Qry(updateUserQuery, updateUserParams);

      const selectAdminQuery = `select * from usersdata where id = ?`;
      const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);

      const selectUserQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectUserResult = await Qry(selectUserQuery, [
        selectrequestResult[0].userid,
      ]);
      logger.info(
        `${selectAdminResult[0].username} has approved payout details update request of user ${selectUserResult[0].username}`,
        { type: "admin" }
      );

      res.json({
        status: "success",
        message: "Request has been approved successfully.",
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

router.post("/rejectpayoutupdaterequest", async (req, res) => {
  try {
    const postData = req.body;
    const requestId = postData.id;
    const reason = postData.reason;
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const selectrequestQuery = `SELECT * FROM payout_information_request WHERE id = ?`;
      const selectrequestResult = await Qry(selectrequestQuery, [requestId]);

      const updaterequest = await Qry(
        "update payout_information_request set status = ?, reason = ? where id = ?",
        ["Rejected", reason, requestId]
      );
      const updateUser = await Qry(
        "update usersdata set payout_details_update_request = ? where id = ?",
        [0, selectrequestResult[0].userid]
      );

      const selectAdminQuery = `select * from usersdata where id = ?`;
      const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);

      const selectUserQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectUserResult = await Qry(selectUserQuery, [
        selectrequestResult[0].userid,
      ]);
      logger.info(
        `${selectAdminResult[0].username} has rejected payout details update request of user ${selectUserResult[0].username}`,
        { type: "admin" }
      );

      res.json({
        status: "success",
        message: "Request has been rejected successfully.",
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});
// end payout details update request routs

router.post("/singleuserbinarydetails", async (req, res) => {
  const postData = req.body;
  const userid = postData.userid;
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const activeReferralMembers =
        await current_month_active_referrals_function(userid);
      const activeReferralPoints = await current_month_referral_points_function(
        userid
      );
      const activeBinaryMembers =
        await current_month_organization_members_function(userid);
      const activeBinaryPoints =
        await current_month_organization_points_function(userid);

      let obj = {
        activeReferralMembers: activeReferralMembers,
        activeReferralPoints: activeReferralPoints,
        activeBinaryMembers: activeBinaryMembers,
        activeBinaryPoints: activeBinaryPoints,
      };
      res.json({
        status: "success",
        data: obj,
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

// start payout
router.post("/pendingpayout", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const getRequest = `SELECT id, username, firstname, lastname, email, current_balance, bank_account_title, bank_account_country, bank_account_iban, bank_account_bic, wallet_address, bank_account_address, bank_account_city, bank_account_zip_code, payout_country, outside_bank_account_title, outside_bank_account_country, outside_bank_account_number, outside_bank_account_swift_code, outside_bank_account_routing, outside_bank_account_currency, outside_bank_account_address, outside_bank_account_city, outside_bank_account_zip_code, outside_bank_account_street, outside_payout_country, current_balance_usd_payout, current_balance_eur_payout,current_balance_eur_lastmonth,current_balance_usd_lastmonth
      FROM usersdata WHERE 
      withdrawal_status = ? and (current_balance_usd_payout > ? or current_balance_eur_payout > ?) and kyc_status = ? and (bank_account_title != ? or wallet_address != ? or outside_bank_account_title != ?) and withdrawal_processing_status = ? AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed')`;
      const requestData = await Qry(getRequest, [
        0,
        0,
        0,
        "Verified",
        "",
        "",
        "",
        0,
      ]);
      let flatFee = await settings_data("payout_flat_fee");
      let per = await settings_data("payout_percentage_fee");
      let conversion_eur_to_usd = await settings_data("conversion");
      let conversion_usd_to_eur = await settings_data("conversion1");
      let feeData = {
        flat_fee: parseFloat(flatFee[0].keyvalue),
        percentage: parseFloat(per[0].keyvalue),
        conversion_eur_to_usd: parseFloat(conversion_eur_to_usd[0].keyvalue),
        conversion_usd_to_eur: parseFloat(conversion_usd_to_eur[0].keyvalue),
      };

      res.json({
        status: "success",
        data: requestData,
        feeData: feeData,
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

router.post("/pendingpayout-old", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const getRequest = `SELECT id, username, firstname, lastname, email, current_balance, bank_account_title, bank_account_country, bank_account_iban, bank_account_bic, wallet_address, bank_account_address, bank_account_city, bank_account_zip_code, payout_country, outside_bank_account_title, outside_bank_account_country, outside_bank_account_number, outside_bank_account_swift_code, outside_bank_account_routing, outside_bank_account_currency, outside_bank_account_address, outside_bank_account_city, outside_bank_account_zip_code, outside_bank_account_street, outside_payout_country, current_balance_usd_payout, current_balance_eur_payout,current_balance_eur_lastmonth,current_balance_usd_lastmonth
      FROM usersdata WHERE 
      withdrawal_status = ? and (current_balance_usd_payout > ? or current_balance_eur_payout > ?) and kyc_status = ? and (bank_account_title != ? or wallet_address != ? or outside_bank_account_title != ?) and withdrawal_processing_status = ? AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed')`;
      const requestData = await Qry(getRequest, [
        0,
        0,
        0,
        "Verified",
        "",
        "",
        "",
        0,
      ]);
      let flatFee = await settings_data("payout_flat_fee");
      let per = await settings_data("payout_percentage_fee");
      let conversion_eur_to_usd = await settings_data("conversion");
      let conversion_usd_to_eur = await settings_data("conversion1");
      let feeData = {
        flat_fee: parseFloat(flatFee[0].keyvalue),
        percentage: parseFloat(per[0].keyvalue),
        conversion_eur_to_usd: parseFloat(conversion_eur_to_usd[0].keyvalue),
        conversion_usd_to_eur: parseFloat(conversion_usd_to_eur[0].keyvalue),
      };

      res.json({
        status: "success",
        data: requestData,
        feeData: feeData,
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

router.post("/approvedpayout", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const getRequest = `SELECT 
    tr.*, 
    ud.username, 
    ud.firstname, 
    ud.lastname, 
    ud.email
FROM 
    transactions tr
LEFT JOIN 
    usersdata ud ON tr.receiverid = ud.id
WHERE 
    tr.type = ? 
    AND ud.subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed')
ORDER BY 
    tr.id DESC`;
      const requestData = await Qry(getRequest, ["Payout"]);

      res.json({
        status: "success",
        data: requestData,
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

router.post("/approvesinglepayout", async (req, res) => {
  try {
    const postData = req.body;
    const userid = postData.userid;
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const selectrequestQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectUserResult = await Qry(selectrequestQuery, [userid]);

      const updateUser = await Qry(
        "update usersdata set withdrawal_status = ?, current_balance_usd_payout = ?, current_balance_eur_payout = ?, withdrawal_processing_status = ? where id = ?",
        [1, 0, 0, 0, userid]
      );

      let usdBalance = selectUserResult[0].current_balance_usd_payout;
      let eurBalance = selectUserResult[0].current_balance_eur_payout;

      let conversion_usd_to_eur = await settings_data("conversion1");
      let conversion_eur_to_usd = await settings_data("conversion");

      let totalUsdBalance =
        usdBalance + eurBalance * parseFloat(conversion_eur_to_usd[0].keyvalue);
      let totalEurBalance =
        eurBalance + usdBalance * parseFloat(conversion_usd_to_eur[0].keyvalue);

      if (
        selectUserResult[0].bank_account_title !== null &&
        selectUserResult[0].wallet_address === null &&
        selectUserResult[0].outside_bank_account_title === null
      ) {
        let flatFee = await settings_data("payout_flat_fee");
        // let finalAmount =
        //   selectUserResult[0].current_balance - parseInt(flatFee[0].keyvalue);
        let finalAmount = totalEurBalance - parseInt(flatFee[0].keyvalue);

        const insertQuery =
          "INSERT into transactions (receiverid, senderid, amount, final_amount, payoutmethod, payout_fee, bank_account_title, bank_account_country, bank_account_iban, bank_account_bic, bank_account_address, bank_account_city, bank_account_zip_code, payout_country, approved_by, type, currency) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const updateParams = [
          userid,
          0,
          totalEurBalance,
          finalAmount,
          "Bank",
          parseFloat(flatFee[0].keyvalue),
          selectUserResult[0].bank_account_title,
          selectUserResult[0].bank_account_country,
          selectUserResult[0].bank_account_iban,
          selectUserResult[0].bank_account_bic,
          selectUserResult[0].bank_account_address,
          selectUserResult[0].bank_account_city,
          selectUserResult[0].bank_account_zip_code,
          selectUserResult[0].payout_country,
          authUser.id,
          "Payout",
          "EUR",
        ];
        const updateResult = await Qry(insertQuery, updateParams);

        if (updateResult.affectedRows > 0) {
          const selectAdminQuery = `select * from usersdata where id = ?`;
          const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);
          logger.info(
            `${selectAdminResult[0].username} has approved payout of amount $${finalAmount} of user ${selectUserResult[0].username}`,
            { type: "admin" }
          );

          res.json({
            status: "success",
            message: "Payout has been approved successfully.",
          });
        } else {
          res.json({
            status: "error",
            message: "Failed to approve",
          });
        }
      } else if (
        selectUserResult[0].wallet_address !== null &&
        selectUserResult[0].bank_account_title === null &&
        selectUserResult[0].outside_bank_account_title === null
      ) {
        let per = await settings_data("payout_percentage_fee");
        let finalAmount =
          totalUsdBalance -
          (totalUsdBalance * parseFloat(per[0].keyvalue)) / 100;

        const insertQuery =
          "INSERT into transactions (receiverid, senderid, amount, final_amount, payoutmethod, payout_fee, wallet_address, approved_by, type, currency) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const updateParams = [
          userid,
          0,
          totalUsdBalance,
          finalAmount,
          "Crypto",
          parseFloat(per[0].keyvalue),
          selectUserResult[0].wallet_address,
          authUser.id,
          "Payout",
          "USD",
        ];
        const updateResult = await Qry(insertQuery, updateParams);

        if (updateResult.affectedRows > 0) {
          const selectAdminQuery = `select * from usersdata where id = ?`;
          const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);
          logger.info(
            `${selectAdminResult[0].username} has approved payout of amount $${finalAmount} of user ${selectUserResult[0].username}`,
            { type: "admin" }
          );

          res.json({
            status: "success",
            message: "Payout has been approved successfully.",
          });
        } else {
          res.json({
            status: "error",
            message: "Failed to approve",
          });
        }
      } else if (
        selectUserResult[0].bank_account_title === null &&
        selectUserResult[0].wallet_address === null &&
        selectUserResult[0].outside_bank_account_title !== null
      ) {
        let flatFee = await settings_data("payout_flat_fee");
        let finalAmount = totalUsdBalance - parseInt(flatFee[0].keyvalue);

        const insertQuery =
          "INSERT into transactions (receiverid, senderid, amount, final_amount, payoutmethod, payout_fee, outside_bank_account_title, outside_bank_account_country, outside_bank_account_number, outside_bank_account_swift_code, outside_bank_account_routing, outside_bank_account_currency, outside_bank_account_address, outside_bank_account_city, outside_bank_account_zip_code, outside_bank_account_street, outside_payout_country, approved_by, type, currency) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const updateParams = [
          userid,
          0,
          totalUsdBalance,
          finalAmount,
          "Bank",
          parseFloat(flatFee[0].keyvalue),
          selectUserResult[0].outside_bank_account_title,
          selectUserResult[0].outside_bank_account_country,
          selectUserResult[0].outside_bank_account_number,
          selectUserResult[0].outside_bank_account_swift_code,
          selectUserResult[0].outside_bank_account_routing,
          selectUserResult[0].outside_bank_account_currency,
          selectUserResult[0].outside_bank_account_address,
          selectUserResult[0].outside_bank_account_city,
          selectUserResult[0].outside_bank_account_zip_code,
          selectUserResult[0].outside_bank_account_street,
          selectUserResult[0].outside_payout_country,
          authUser.id,
          "Payout",
          "USD",
        ];
        const updateResult = await Qry(insertQuery, updateParams);

        if (updateResult.affectedRows > 0) {
          const selectAdminQuery = `select * from usersdata where id = ?`;
          const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);
          logger.info(
            `${selectAdminResult[0].username} has approved payout of amount $${finalAmount} of user ${selectUserResult[0].username}`,
            { type: "admin" }
          );

          res.json({
            status: "success",
            message: "Payout has been approved successfully.",
          });
        } else {
          res.json({
            status: "error",
            message: "Failed to approve",
          });
        }
      } else {
        res.json({
          status: "error",
          data: "Invalid request. Please try again later.",
        });
      }
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

router.post("/processingallpayout", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const selectAdminQuery = `select * from usersdata where id = ?`;
      const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);

      const getRequest = `SELECT id, username, firstname, lastname, email, current_balance, bank_account_title, bank_account_country, bank_account_iban, bank_account_bic, wallet_address, bank_account_address, bank_account_city, bank_account_zip_code, payout_country, outside_bank_account_title, outside_bank_account_country, outside_bank_account_number, outside_bank_account_swift_code, outside_bank_account_routing, outside_bank_account_currency, outside_bank_account_address, outside_bank_account_city, outside_bank_account_zip_code, outside_bank_account_street, outside_payout_country
      FROM usersdata WHERE 
      withdrawal_status = ? and (current_balance_usd_payout > ? or current_balance_eur_payout > ?) and kyc_status = ? and (bank_account_title != ? or wallet_address != ? or outside_bank_account_title != ?)`;
      const requestData = await Qry(getRequest, [
        0,
        0,
        0,
        "Verified",
        "",
        "",
        "",
      ]);

      for (const payoutData of requestData) {
        const updateUser = await Qry(
          "update usersdata set withdrawal_processing_status = ? where id = ?",
          [1, payoutData.id]
        );

        logger.info(
          `${selectAdminResult[0].username} has sent payout request in processing procedure of user ${payoutData.username}`,
          { type: "admin" }
        );
      }
      res.json({
        status: "success",
        message: "All payout has been sent in processing.",
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

router.post("/approveallpayout", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const selectAdminQuery = `select * from usersdata where id = ?`;
      const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);

      const getRequest = `SELECT * FROM usersdata WHERE withdrawal_processing_status = ? `;
      const requestData = await Qry(getRequest, [1]);

      for (const payoutData of requestData) {
        const updateUser = await Qry(
          "update usersdata set withdrawal_status = ?, current_balance_usd_payout = ?, current_balance_eur_payout = ?, withdrawal_processing_status = ? where id = ?",
          [1, 0, 0, 0, payoutData.id]
        );


        let usdBalance = payoutData.current_balance_usd_lastmonth;
        let eurBalance = payoutData.current_balance_eur_lastmonth;

        if (usdBalance + eurBalance < 30) {
          const updateUser = await Qry(
            "update usersdata set withdrawal_status = ?, current_balance_usd_payout = ?, current_balance_eur_payout = ?, withdrawal_processing_status = ? where id = ?",
            [1, usdBalance, eurBalance, 0, payoutData.id]
          );
          continue;
        }

        let conversion_usd_to_eur = await settings_data("conversion1");
        let conversion_eur_to_usd = await settings_data("conversion");

        let totalUsdBalance =
          usdBalance +
          eurBalance * parseFloat(conversion_eur_to_usd[0].keyvalue);
        let totalEurBalance =
          eurBalance +
          usdBalance * parseFloat(conversion_usd_to_eur[0].keyvalue);

        if (
          payoutData.bank_account_title !== null &&
          payoutData.wallet_address === null &&
          payoutData.outside_bank_account_title === null
        ) {
          let flatFee = await settings_data("payout_flat_fee");
          let finalAmount = totalEurBalance - parseFloat(flatFee[0].keyvalue);

          const insertQuery =
            "INSERT into transactions (receiverid, senderid, amount, final_amount, payoutmethod, payout_fee, bank_account_title, bank_account_country, bank_account_iban, bank_account_bic, bank_account_address, bank_account_city, bank_account_zip_code, payout_country, approved_by, type, currency) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
          const updateParams = [
            payoutData.id,
            0,
            totalEurBalance,
            finalAmount,
            "Bank",
            parseFloat(flatFee[0].keyvalue),
            payoutData.bank_account_title,
            payoutData.bank_account_country,
            payoutData.bank_account_iban,
            payoutData.bank_account_bic,
            payoutData.bank_account_address,
            payoutData.bank_account_city,
            payoutData.bank_account_zip_code,
            payoutData.payout_country,
            authUser.id,
            "Payout",
            "EUR",
          ];
          const updateResult = await Qry(insertQuery, updateParams);

          logger.info(
            `${selectAdminResult[0].username} has approved payout of amount $${finalAmount} of user ${payoutData.username}`,
            { type: "admin" }
          );
        } else if (
          payoutData.wallet_address !== null &&
          payoutData.bank_account_title === null &&
          payoutData.outside_bank_account_title === null
        ) {
          let per = await settings_data("payout_percentage_fee");
          let finalAmount =
            totalUsdBalance -
            (totalUsdBalance * parseFloat(per[0].keyvalue)) / 100;

          const insertQuery =
            "INSERT into transactions (receiverid, senderid, amount, final_amount, payoutmethod, payout_fee, wallet_address, approved_by, type, currency) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
          const updateParams = [
            payoutData.id,
            0,
            totalUsdBalance,
            finalAmount,
            "Crypto",
            parseInt(per[0].keyvalue),
            payoutData.wallet_address,
            authUser.id,
            "Payout",
            "USD",
          ];
          const updateResult = await Qry(insertQuery, updateParams);

          logger.info(
            `${selectAdminResult[0].username} has approved payout of amount $${finalAmount} of user ${payoutData.username}`,
            { type: "admin" }
          );
        }

        if (
          payoutData.bank_account_title === null &&
          payoutData.wallet_address === null &&
          payoutData.outside_bank_account_title !== null
        ) {
          let flatFee = await settings_data("payout_flat_fee");
          let finalAmount = totalUsdBalance - parseInt(flatFee[0].keyvalue);

          const insertQuery =
            "INSERT into transactions (receiverid, senderid, amount, final_amount, payoutmethod, payout_fee, outside_bank_account_title, outside_bank_account_country, outside_bank_account_number, outside_bank_account_swift_code, outside_bank_account_routing, outside_bank_account_currency, outside_bank_account_address, outside_bank_account_city, outside_bank_account_zip_code, outside_bank_account_street, outside_payout_country, approved_by, type, currency) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
          const updateParams = [
            payoutData.id,
            0,
            totalUsdBalance,
            finalAmount,
            "Bank",
            parseFloat(flatFee[0].keyvalue),
            payoutData.outside_bank_account_title,
            payoutData.outside_bank_account_country,
            payoutData.outside_bank_account_number,
            payoutData.outside_bank_account_swift_code,
            payoutData.outside_bank_account_routing,
            payoutData.outside_bank_account_currency,
            payoutData.outside_bank_account_address,
            payoutData.outside_bank_account_city,
            payoutData.outside_bank_account_zip_code,
            payoutData.outside_bank_account_street,
            payoutData.outside_payout_country,
            authUser.id,
            "Payout",
            "USD",
          ];
          const updateResult = await Qry(insertQuery, updateParams);

          logger.info(
            `${selectAdminResult[0].username} has approved payout of amount $${finalAmount} of user ${payoutData.username}`,
            { type: "admin" }
          );
        }
      }
      res.json({
        status: "success",
        message: "All payout has been approved successfully.",
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

router.post("/getallprocessingpayout", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const getRequest = `SELECT id, username, firstname, lastname, email, current_balance, bank_account_title, bank_account_country, bank_account_iban, bank_account_bic, wallet_address, bank_account_address, bank_account_city, bank_account_zip_code, payout_country, outside_bank_account_title, outside_bank_account_country, outside_bank_account_number, outside_bank_account_swift_code, outside_bank_account_routing, outside_bank_account_currency, outside_bank_account_address, outside_bank_account_city, outside_bank_account_zip_code, outside_bank_account_street, outside_payout_country, current_balance_usd_payout, current_balance_eur_payout
       ,current_balance_usd_lastmonth ,current_balance_eur_lastmonth  FROM usersdata WHERE withdrawal_processing_status = ? AND  subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed')  AND (current_balance_usd_payout + current_balance_eur_payout) > 30;`;
      const requestData = await Qry(getRequest, [1]);
      let flatFee = await settings_data("payout_flat_fee");
      let per = await settings_data("payout_percentage_fee");
      let conversion_eur_to_usd = await settings_data("conversion");
      let conversion_usd_to_eur = await settings_data("conversion1");
      let feeData = {
        flat_fee: parseFloat(flatFee[0].keyvalue),
        percentage: parseFloat(per[0].keyvalue),
        conversion_eur_to_usd: parseFloat(conversion_eur_to_usd[0].keyvalue),
        conversion_usd_to_eur: parseFloat(conversion_usd_to_eur[0].keyvalue),
      };
      res.json({
        status: "success",
        data: requestData,
        feeData: feeData,
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

// end payout

// start add deduct binary points
router.post("/adddeductbinarypoints", async (req, res) => {
  try {
    const postData = req.body;
    const userid = postData?.userid;
    const points = postData?.points;
    const type = postData?.type;
    const userType = postData?.usertype;
    const reason = postData?.reason;
    const admin_transaction_password = postData?.admin_transaction_password;

    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      let currentDate = new Date();
      let formattedDate = currentDate.toISOString().split("T")[0];

      const selectAdminQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);

      const decryptedPassword = crypto.AES.decrypt(
        selectAdminResult[0].admin_transaction_password,
        encryptionKey
      ).toString(crypto.enc.Utf8);
      const passwordMatch = bcrypt.compareSync(
        admin_transaction_password,
        decryptedPassword
      );

      if (!passwordMatch) {
        res.json({
          status: "error",
          message: "Invalid admin transaction password",
        });
        return;
      }

      if (userType === "team") {
        if (type === "add") {
          const selectLeftBinaryPointsUsers = await Qry(
            "WITH RECURSIVE UserTree AS (SELECT `id`, `userid`, `pid`, `leg` FROM `binarytree` WHERE `userid` = ? UNION ALL SELECT bt.`id`, bt.`userid`, bt.`pid`, bt.`leg` FROM `binarytree` bt JOIN UserTree ut ON bt.`userid` = ut.`pid`) SELECT * FROM UserTree WHERE leg = ? ",
            [userid, "L"]
          );
          const leftreceiverIds = selectLeftBinaryPointsUsers.map(
            (row) => row.pid
          );
          let leftDataToInsert = JSON.stringify({
            receiver_ids: leftreceiverIds,
          });

          const selectRightBinaryPointsUsers = await Qry(
            "WITH RECURSIVE UserTree AS (SELECT `id`, `userid`, `pid`, `leg` FROM `binarytree` WHERE `userid` = ? UNION ALL SELECT bt.`id`, bt.`userid`, bt.`pid`, bt.`leg` FROM `binarytree` bt JOIN UserTree ut ON bt.`userid` = ut.`pid`) SELECT * FROM UserTree WHERE leg = ? ",
            [userid, "R"]
          );
          const rightreceiverIds = selectRightBinaryPointsUsers.map(
            (row) => row.pid
          );
          let rightDataToInsert = JSON.stringify({
            receiver_ids: rightreceiverIds,
          });

          if (leftreceiverIds.length > 0) {
            const insertLeftPoints = await Qry(
              "insert into points(sender_id,points,leg,type,period,receiver_ids,dat,details) values (?, ?, ?, ?, ?, ?, ?, ?)",
              [
                userid,
                points,
                "L",
                "Add Binary Points By Admin",
                "month",
                leftDataToInsert,
                formattedDate,
                reason,
              ]
            );
          } else {
            leftDataToInsert = null;
          }
          if (rightreceiverIds.length > 0) {
            const insertRightPoints = await Qry(
              "insert into points(sender_id,points,leg,type,period,receiver_ids,dat,details) values (?, ?, ?, ?, ?, ?, ?, ?)",
              [
                userid,
                points,
                "R",
                "Add Binary Points By Admin",
                "month",
                rightDataToInsert,
                formattedDate,
                reason,
              ]
            );
          } else {
            rightDataToInsert = null;
          }
        }
        if (type === "deduct") {
          const selectLeftBinaryPointsUsers = await Qry(
            "WITH RECURSIVE UserTree AS (SELECT `id`, `userid`, `pid`, `leg` FROM `binarytree` WHERE `userid` = ? UNION ALL SELECT bt.`id`, bt.`userid`, bt.`pid`, bt.`leg` FROM `binarytree` bt JOIN UserTree ut ON bt.`userid` = ut.`pid`) SELECT * FROM UserTree WHERE leg = ? ",
            [userid, "L"]
          );
          const leftreceiverIds = selectLeftBinaryPointsUsers.map(
            (row) => row.pid
          );
          let leftDataToInsert = JSON.stringify({
            receiver_ids: leftreceiverIds,
          });

          const selectRightBinaryPointsUsers = await Qry(
            "WITH RECURSIVE UserTree AS (SELECT `id`, `userid`, `pid`, `leg` FROM `binarytree` WHERE `userid` = ? UNION ALL SELECT bt.`id`, bt.`userid`, bt.`pid`, bt.`leg` FROM `binarytree` bt JOIN UserTree ut ON bt.`userid` = ut.`pid`) SELECT * FROM UserTree WHERE leg = ? ",
            [userid, "R"]
          );
          const rightreceiverIds = selectRightBinaryPointsUsers.map(
            (row) => row.pid
          );
          let rightDataToInsert = JSON.stringify({
            receiver_ids: rightreceiverIds,
          });

          if (leftreceiverIds.length > 0) {
            const insertLeftPoints = await Qry(
              "insert into points(sender_id,points,leg,type,period,receiver_ids,dat,details) values (?, ?, ?, ?, ?, ?, ?, ?)",
              [
                userid,
                points,
                "L",
                "Deduct Binary Points By Admin",
                "month",
                leftDataToInsert,
                formattedDate,
                reason,
              ]
            );
          } else {
            leftDataToInsert = null;
          }
          if (rightreceiverIds.length > 0) {
            const insertRightPoints = await Qry(
              "insert into points(sender_id,points,leg,type,period,receiver_ids,dat,details) values (?, ?, ?, ?, ?, ?, ?, ?)",
              [
                userid,
                points,
                "R",
                "Deduct Binary Points By Admin",
                "month",
                rightDataToInsert,
                formattedDate,
                reason,
              ]
            );
          } else {
            rightDataToInsert = null;
          }
        }
      }

      if (userType === "sponsor") {
        const selectUserDataQuery = `SELECT * FROM usersdata WHERE id = ?`;
        const selectUserDataResult = await Qry(selectUserDataQuery, [userid]);

        if (type === "add") {
          const referralDataToInsert = JSON.stringify({
            receiver_ids: [selectUserDataResult[0]?.sponsorid],
          });
          const insertBinaryPoints = await Qry(
            "insert into points(sender_id,points,leg,type,period,receiver_ids,dat,details) values (?, ?, ?, ?, ?, ?, ?, ?)",
            [
              userid,
              points,
              selectUserDataResult[0].leg_position,
              "Add Binary Points By Admin",
              "month",
              referralDataToInsert,
              formattedDate,
              reason,
            ]
          );
          const insertReferralPoints = await Qry(
            "insert into points(sender_id,points,leg,type,period,receiver_ids,dat,details) values (?, ?, ?, ?, ?, ?, ?, ?)",
            [
              userid,
              points,
              selectUserDataResult[0].leg_position,
              "Add Referral Binary Points By Admin",
              "month",
              referralDataToInsert,
              formattedDate,
              reason,
            ]
          );
        }
        if (type === "deduct") {
          const referralDataToInsert = JSON.stringify({
            receiver_ids: [selectUserDataResult[0]?.sponsorid],
          });
          const insertBinaryPoints = await Qry(
            "insert into points(sender_id,points,leg,type,period,receiver_ids,dat,details) values (?, ?, ?, ?, ?, ?, ?, ?)",
            [
              userid,
              points,
              selectUserDataResult[0].leg_position,
              "Deduct Binary Points By Admin",
              "month",
              referralDataToInsert,
              formattedDate,
              reason,
            ]
          );
          const insertReferralPoints = await Qry(
            "insert into points(sender_id,points,leg,type,period,receiver_ids,dat,details) values (?, ?, ?, ?, ?, ?, ?, ?)",
            [
              userid,
              points,
              selectUserDataResult[0].leg_position,
              "Deduct Referral Binary Points By Admin",
              "month",
              referralDataToInsert,
              formattedDate,
              reason,
            ]
          );
        }
      }

      res.json({
        status: "success",
        message: "Points has been " + type + "ed successfully.",
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});
// end add deduct binary points

// reports

router.post("/subscriptionreport", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const subscriptionSelect = await Qry(`
      SELECT np.*, ud.username, ud.firstname, ud.lastname, ud.email 
      FROM new_packages np
      left join usersdata ud on np.userid = ud.id
      where type = 'package'
      ORDER BY id DESC
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
});

router.post("/affilatereport", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const subscriptionSelect = await Qry(`
      SELECT np.*, ud.username, ud.firstname, ud.lastname, ud.email 
      FROM new_packages np
      left join usersdata ud on np.userid = ud.id
      where type = 'distributor'
      ORDER BY id DESC
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
});

router.post("/payoutreport", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const transactionSelect = await Qry(`
      SELECT tr.*, ud.username, ud.firstname, ud.lastname, ud.email,
      ra.name AS rank_name
      FROM transactions tr
      left join usersdata ud on tr.receiverid = ud.id
      left join rank ra on tr.rankid = ra.id
      where type = 'Payout'
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
});

router.post("/residuelreport", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const residuelSelect = await Qry(`
      SELECT tr.*, ra.name 
      FROM transactions tr
      left join rank ra on tr.rankid = ra.id
      where type = 'Binary Bonus'
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
          message: "no data found",
        });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/rankreport", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const rankSelect = await Qry(`
      SELECT 
      rs.*, 
      ud.username, 
      ud.firstname, 
      ud.lastname, 
      ud.email,
      rn.name AS new_rank_name,
      ro.name AS old_rank_name,
      lt.name AS life_time_rank
      FROM rank_summary rs
      LEFT JOIN usersdata ud ON rs.userid = ud.id
      LEFT JOIN rank rn ON rs.new_rank = rn.id
      LEFT JOIN rank ro ON rs.old_rank = ro.id
      LEFT JOIN rank lt ON ud.life_time_rank = lt.id
      where rs.type = 'Payout Rank'
      ORDER BY rs.id DESC
    `);

      const rankdbData = rankSelect;
      const rankarray = { enteries: rankdbData };

      if (rankdbData.length > 0) {
        res.status(200).json({ status: "success", data: rankarray });
      } else {
        rankarray.enteries = [];
        res.status(200).json({ status: "success", data: rankarray });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/trialusers", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const selectQuery = await Qry(`SELECT * FROM usersdata WHERE trial = ?`, [
        "Yes",
      ]);

      if (selectQuery.length > 0) {
        res.status(200).json({ status: "success", data: selectQuery });
      } else {
        selectQuery.enteries = [];
        res.status(200).json({ status: "success", data: selectQuery });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/novarankreport", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const rankSelect = await Qry(`
      SELECT 
      rs.*, 
      ud.username, 
      ud.firstname, 
      ud.lastname, 
      ud.email,
      rn.name AS new_rank_name,
      ro.name AS old_rank_name,
      lt.name AS life_time_rank
      FROM rank_summary rs
      LEFT JOIN usersdata ud ON rs.userid = ud.id
      LEFT JOIN novafree_rank rn ON rs.new_rank = rn.id
      LEFT JOIN novafree_rank ro ON rs.old_rank = ro.id
      LEFT JOIN novafree_rank lt ON ud.nova_life_time_rank = lt.id
      where rs.type = 'NovaFree Rank'
      ORDER BY rs.id DESC
    `);

      const rankdbData = rankSelect;
      const rankarray = { enteries: rankdbData };

      if (rankdbData.length > 0) {
        res.status(200).json({ status: "success", data: rankarray });
      } else {
        rankarray.enteries = [];
        res.status(200).json({ status: "success", data: rankarray });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/binarypointsreport", async (req, res) => {
  try {
    const postData = req.body;
    const userid = postData.userid;
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const pointsSelect = await Qry(
        `SELECT SUM(amount) AS totalEarning FROM transactions WHERE receiverid = ? AND type = ?`,
        [userid, "Payout"]
      );

      let lifeTimeEarning = 0;
      if (
        pointsSelect[0].totalEarning !== "" &&
        pointsSelect[0].totalEarning !== null
      ) {
        lifeTimeEarning = pointsSelect[0].totalEarning;
      }

      const countQuer1 = await Qry(
        "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = 1 AND DAY(createdat) >= 28 AND YEAR(createdat) = YEAR(now())",
        [userid, "Level 1 Bonus"]
      );

      const countQuer2 = await Qry(
        "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = MONTH(now()) and YEAR(createdat) = YEAR(now())",
        [userid, "Level 1 Bonus"]
      );

      const countQuer3 = await Qry(
        "SELECT COUNT(*) as userCount FROM usersdata WHERE sponsorid = ? AND sub_type = 'year' AND DAY(NOW()) >= DAY(createdat) AND DATEDIFF(NOW(), createdat) <= 365 AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') and MONTH(createdat) != MONTH(now())",
        [userid]
      );

      const countQuer4 = await Qry(
        "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = MONTH(now()) and YEAR(createdat) = YEAR(now())",
        [userid, "Level 1 Bonus Deducted"]
      );

      let totalUser =
        countQuer2[0].userCount +
        countQuer3[0].userCount -
        countQuer4[0].userCount;

      let l2Active = 0;
      let l1Personal = 0;
      let l2 = 0;
      let total = 0;
      let silver = "No";
      let gold = "Yes";
      let platinum = "Yes";

      res.status(200).json({
        status: "success",
        data: {
          id: 1,
          lifeTimeEarning: lifeTimeEarning,
          directActives: totalUser,
          l2Active: l2Active,
          l1Personal: l1Personal,
          l2: l2,
          total: total,
          silver: silver,
          gold: gold,
          platinum: platinum,
        },
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/previuosmonthrecord", async (req, res) => {
  try {
    const postData = req.body;
    const userid = postData.userid;
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const selectPreviousRecordQuery = `
      SELECT pre.*, ud.username
      FROM previous_record pre
      left join usersdata ud on pre.userid = ud.id
      WHERE userid = ? ORDER BY id DESC`;
      const selectPreviousRecordResult = await Qry(selectPreviousRecordQuery, [
        userid,
      ]);

      // function getFirstDateOfCurrentMonth() {
      //   const today = new Date();
      //   const firstDateOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      //   return firstDateOfMonth.toISOString();
      // }

      // const firstDateOfCurrentMonth = getFirstDateOfCurrentMonth();

      // const currentDate = new Date();
      // const currentMonth = currentDate.getMonth();
      // const previousMonth = (currentMonth + 11) % 12 + 1;

      // let activeMembers = await pre_month_active_referrals_function(userid, previousMonth)
      // let referralPoints = await pre_month_referral_points_function(userid, previousMonth)
      // let teamMembers = await pre_month_organization_members_function(userid, previousMonth)
      // let teamPoints = await pre_month_organization_points_function(userid, previousMonth)

      // let obj = {
      //   id: 100000,
      //   userid: authUser,
      //   direct_active_left_members: activeMembers.leftPersonalActiveMembers,
      //   direct_active_right_members: activeMembers.rightPersonalActiveMembers,
      //   team_active_left_members: teamMembers.leftOrganizationMembers,
      //   team_active_right_members: teamMembers.rightOrganizationMembers,
      //   left_referral_points: referralPoints.leftReferralPoints,
      //   right_referral_points: referralPoints.rightReferralPoints,
      //   left_binary_points: teamPoints.leftOrganizationPoints,
      //   right_binary_points: teamPoints.rightOrganizationPoints,
      //   dat: firstDateOfCurrentMonth,
      //   username: selectPreviousRecordResult[0].username
      // }
      // selectPreviousRecordResult.unshift(obj);

      res.status(200).json({
        status: "success",
        data: selectPreviousRecordResult,
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/managecolumns", async (req, res) => {
  try {
    const postData = req.body;
    const userid = postData.userid;
    const columnName = postData.columnname;
    const status = postData.status;
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      let msg;
      if (columnName === "crm") {
        const updateLoginQuery = `UPDATE usersdata SET crm_status = ? WHERE id = ?`;
        const updateLoginResult = await Qry(updateLoginQuery, [status, userid]);
        msg = "CRM status has been updated successfully.";
      }
      if (columnName === "connect") {
        const updateLoginQuery = `UPDATE usersdata SET connect_status = ? WHERE id = ?`;
        const updateLoginResult = await Qry(updateLoginQuery, [status, userid]);
        msg = "Connect status has been updated successfully.";
      }
      if (columnName === "birthday") {
        const updateLoginQuery = `UPDATE usersdata SET birthday_status = ? WHERE id = ?`;
        const updateLoginResult = await Qry(updateLoginQuery, [status, userid]);
        msg = "Birthday status has been updated successfully.";
      }
      if (columnName === "unfollow") {
        const updateLoginQuery = `UPDATE usersdata SET unfollow_status = ? WHERE id = ?`;
        const updateLoginResult = await Qry(updateLoginQuery, [status, userid]);
        msg = "Unfollow status has been updated successfully.";
      }

      const selectUserQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectUserResult = await Qry(selectUserQuery, [userid]);

      const selectAdminQuery = `select * from usersdata where id = ?`;
      const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);

      logger.info(
        `User ${selectUserResult[0].username} ${msg} by ${selectAdminResult[0].username}`,
        { type: "admin" }
      );

      res.status(200).json({
        status: "success",
        message: msg,
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

// start mini admin
router.post("/createadmin", async (req, res) => {
  try {
    const postData = req.body;
    const username = postData.username;
    const email = postData.email;
    const firstname = postData.firstname;
    const lastname = postData.lastname;
    const password = postData.password;
    const mini_admin_transaction_password =
      postData.mini_admin_transaction_password;
    const admin_transaction_password = postData.admin_transaction_password;
    const allowedroutes = postData.allowedroutes;
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token

    if (authUser) {
      const selectUserDataQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectUserDataResult = await Qry(selectUserDataQuery, [
        authUser.id,
      ]);

      let adminLogo = "";
      let adminFavIcon = "";
      let adminCompanyLogo = "";

      if (authUser.usertype == "reseller") {
        adminLogo = selectUserDataResult[0].admin_logo;
        adminFavIcon = selectUserDataResult[0].fav_icon;
        adminCompanyLogo = selectUserDataResult[0].picture;
      }

      const selectUsernameQuery = `SELECT * FROM usersdata WHERE username = ?`;
      const selectUsernameResult = await Qry(selectUsernameQuery, [username]);

      if (selectUsernameResult.length > 0) {
        res.json({
          status: "error",
          message: "The username you entered is already taken",
        });
        return;
      }

      const selectEmailQuery = `SELECT * FROM usersdata WHERE email = ?`;
      const selectEmailResult = await Qry(selectEmailQuery, [email]);

      if (selectEmailResult.length > 0) {
        res.json({
          status: "error",
          message: "An account with this email address already exists",
        });
        return;
      }

      // Generate a salt for password hashing
      const saltRounds = 16; // The number of salt rounds determines the complexity of the hashing
      const salt = bcrypt.genSaltSync(saltRounds);

      const options = {
        cost: 12, // Specify the hashing cost (higher cost means more secure but slower)
        salt: salt, // Pass the generated salt
      };

      // start encrypt password
      const hashedPassword = bcrypt.hashSync(password, options.cost);
      const encryptedPassword = crypto.AES.encrypt(
        hashedPassword,
        encryptionKey
      ).toString();
      // end encrypt password

      // start encrypt mini admin transaction password
      const tranhashedPassword = bcrypt.hashSync(
        mini_admin_transaction_password,
        options.cost
      );
      const tranencryptedPassword = crypto.AES.encrypt(
        tranhashedPassword,
        encryptionKey
      ).toString();
      // end encrypt mini admin transaction password

      const decryptedPassword = crypto.AES.decrypt(
        selectUserDataResult[0].password,
        encryptionKey
      ).toString(crypto.enc.Utf8);

      const passwordMatch = bcrypt.compareSync(
        admin_transaction_password,
        decryptedPassword
      );

      if (!passwordMatch) {
        res.json({
          status: "error",
          message: "Invalid admin transaction password",
        });
        return;
      }

      if (authUser.usertype == "reseller") {
        var parent_id = authUser.id;
      } else {
        var parent_id = 0;
      }

      const insertResult = await Qry(
        `INSERT INTO usersdata (parent_id, username, password, email, firstname, lastname, allowedroutes, usertype, emailstatus, picture, admin_transaction_password, admin_logo, fav_icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          parent_id,
          username,
          encryptedPassword,
          email,
          firstname,
          lastname,
          allowedroutes,
          "admin",
          "verified",
          adminCompanyLogo,
          tranencryptedPassword,
          adminLogo,
          adminFavIcon,
        ]
      );

      const selectAdminQuery = `select * from usersdata where id = ?`;
      const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);
      logger.info(
        `${selectAdminResult[0].username} has create mini admin of name ${username}`,
        { type: "admin" }
      );

      res.json({
        status: "success",
        message: "Admin has been created successfully.",
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

// update mini admin
router.post("/updateminiadmin", async (req, res) => {
  try {
    const postData = req.body;
    const userid = postData.userid;
    const username = postData.username;
    const email = postData.email;
    const firstname = postData.firstname;
    const lastname = postData.lastname;
    const admin_transaction_password = postData.admin_transaction_password;
    const allowedroutes = postData.allowedroutes;
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const selectUserDataQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectUserDataResult = await Qry(selectUserDataQuery, [
        authUser.id,
      ]);

      const password = selectUserDataResult[0].password;

      const selectUsernameQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectUsernameResult = await Qry(selectUsernameQuery, [userid]);

      const miniAdminId = selectUsernameResult[0].id;

      // if (selectUsernameResult.length > 0) {
      //   res.json({
      //     status: "error",
      //     message: "The username you entered is already taken",
      //   });
      //   return;
      // }

      // const selectEmailQuery = `SELECT * FROM usersdata WHERE email = ?`;
      // const selectEmailResult = await Qry(selectEmailQuery, [email]);

      // if (selectEmailResult.length > 0) {
      //   res.json({
      //     status: "error",
      //     message: "An account with this email address already exists",
      //   });
      //   return;
      // }

      // Generate a salt for password hashing
      const saltRounds = 16; // The number of salt rounds determines the complexity of the hashing
      const salt = bcrypt.genSaltSync(saltRounds);

      const options = {
        cost: 12, // Specify the hashing cost (higher cost means more secure but slower)
        salt: salt, // Pass the generated salt
      };

      // start encrypt password
      const hashedPassword = bcrypt.hashSync(password, options.cost);
      const encryptedPassword = crypto.AES.encrypt(
        hashedPassword,
        encryptionKey
      ).toString();
      // end encrypt password

      const decryptedPassword = crypto.AES.decrypt(
        selectUserDataResult[0].admin_transaction_password,
        encryptionKey
      ).toString(crypto.enc.Utf8);
      const passwordMatch = bcrypt.compareSync(
        admin_transaction_password,
        decryptedPassword
      );

      if (!passwordMatch) {
        res.json({
          status: "error",
          message: "Invalid admin transaction password",
        });
        return;
      }

      const insertResult = await Qry(
        `UPDATE usersdata SET username = ?, email = ?, firstname = ?, lastname = ?, allowedroutes = ?, usertype = ?, emailstatus = ? WHERE id = ?`,
        [
          username,
          email,
          firstname,
          lastname,
          allowedroutes,
          "admin",
          "verified",
          miniAdminId,
        ]
      );

      const selectAdminQuery = `select * from usersdata where id = ?`;
      const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);
      logger.info(
        `${selectAdminResult[0].username} has create mini admin of name ${username}`,
        { type: "admin" }
      );

      res.json({
        status: "success",
        message: "Admin has been updated successfully.",
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

router.post("/getminiadmin", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      if (authUser.usertype == "reseller") {
        const selectUserQuery = `SELECT id, username, firstname, lastname, email, allowedroutes FROM usersdata WHERE usertype = ? and id != ? and parent_id=?`;
        var selectUserResult = await Qry(selectUserQuery, [
          "admin",
          authUser.id,
          authUser.id,
        ]);
      } else {
        const selectUserQuery = `SELECT id, username, firstname, lastname, email, allowedroutes FROM usersdata WHERE usertype = ? and id != ? and parent_id=0`;
        var selectUserResult = await Qry(selectUserQuery, [
          "admin",
          authUser.id,
        ]);
      }
      res.status(200).json({
        status: "success",
        data: selectUserResult,
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/deleteminiadmin", async (req, res) => {
  try {
    const postData = req.body;
    const id = postData.id;
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const selectUserQuery = `SELECT usertype, username FROM usersdata WHERE id = ?`;
      const selectUserResult = await Qry(selectUserQuery, [id]);

      if (selectUserResult[0].usertype !== "admin") {
        res.json({
          status: "error",
          message: "Invalid mini admin. Please try again later.",
        });
        return;
      }

      const deleteUserQuery = `DELETE FROM usersdata WHERE id = ?`;
      const deleteUserResult = await Qry(deleteUserQuery, [id]);

      const selectAdminQuery = `select * from usersdata where id = ?`;
      const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);

      logger.info(
        `${selectAdminResult[0].username} has deleted mini admin of name ${selectUserResult[0].username}`,
        { type: "admin" }
      );

      res.status(200).json({
        status: "success",
        message: "Admin has been deleted successfully.",
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});
// end mini admin

router.post("/get-company-logo", async (req, res) => {
  try {
    const postData = req.body;

    var data = `SELECT picture, admin_logo, fav_icon, company FROM usersdata WHERE usertype='reseller' && website = ?`;
    var result = await Qry(data, [postData.domain]);

    if (result[0]) {
      var logo = true;
      var company = result[0].company;
      var profilepictureurl = `${image_base_url}uploads/userprofile/${result[0].picture}`;
      var userProfileUrl = `${image_base_url}uploads/userprofile/${result[0].admin_logo}`;
      var favIconUrl = `${image_base_url}uploads/userprofile/${result[0].fav_icon}`;
    } else {
      var logo = false;
      var company = "";
      var profilepictureurl = "";
      var userProfileUrl = "";
      var favIconUrl = "";
    }

    return res.status(200).json({
      status: "success",
      data: {
        logo: logo,
        company: company,
        logo_val: profilepictureurl,
        user_logo_val: userProfileUrl,
        fav_icon_val: favIconUrl,
      },
    });
  } catch (error) {
    return res.status(200).json({
      status: "success",
      data: { logo: false, company: "", logo_val: "" },
    });
  }
});

router.post("/dashboarddata", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res);

    if (authUser) {
      // start payout details

      if (authUser.usertype == "reseller") {
        var selectTransactionsCurrentMonthQuery = `SELECT SUM(final_amount) as total FROM transactions WHERE type = ? and MONTH(approvedat) = MONTH(now()) and YEAR(approvedat) = YEAR(now()) and receiverid=?`;
        var selectCurrentMonthPayoutResult = await Qry(
          selectTransactionsCurrentMonthQuery,
          ["Payout", authUser.id]
        );
      } else {
        var selectTransactionsCurrentMonthQuery = `SELECT SUM(final_amount) as total FROM transactions WHERE type = ? and MONTH(approvedat) = MONTH(now()) and YEAR(approvedat) = YEAR(now())`;
        var selectCurrentMonthPayoutResult = await Qry(
          selectTransactionsCurrentMonthQuery,
          ["Payout"]
        );
      }

      if (authUser.usertype == "reseller") {
        var selectAllTimeQuery = `SELECT SUM(final_amount) as total FROM transactions WHERE type = ? and receiverid=?`;
        var selectAllTimePayoutResult = await Qry(selectAllTimeQuery, [
          "Payout",
          authUser.id,
        ]);
      } else {
        var selectAllTimeQuery = `SELECT SUM(final_amount) as total FROM transactions WHERE type = ?`;
        var selectAllTimePayoutResult = await Qry(selectAllTimeQuery, [
          "Payout",
        ]);
      }
      // end payout details

      // start count of affiliate and sipmle users
      if (authUser.usertype == "reseller") {
        var selectUserDataAffilliateQuery = `SELECT COUNT(*) as total FROM usersdata WHERE user_type = ? and parent_id=?`;
        var totalAffiliateResult = await Qry(selectUserDataAffilliateQuery, [
          "Distributor",
          authUser.id,
        ]);
      } else {
        var selectUserDataAffilliateQuery = `SELECT COUNT(*) as total FROM usersdata WHERE user_type = ?`;
        var totalAffiliateResult = await Qry(selectUserDataAffilliateQuery, [
          "Distributor",
        ]);
      }

      if (authUser.usertype == "reseller") {
        var selectUserDataSimpleUsersQuery = `SELECT COUNT(*) as total FROM usersdata WHERE usertype = ? and parent_id=?`;
        var totalSimpleUsersResult = await Qry(selectUserDataSimpleUsersQuery, [
          "Normal",
          authUser.id,
        ]);
      } else {
        var selectUserDataSimpleUsersQuery = `SELECT COUNT(*) as total FROM usersdata WHERE user_type = ?`;
        var totalSimpleUsersResult = await Qry(selectUserDataSimpleUsersQuery, [
          "Normal",
        ]);
      }

      // end count of affiliate and sipmle users

      var checkResellerAdminQuery = `SELECT id, parent_id FROM usersdata WHERE id = ?`;
      var checkResellerAdmin = await Qry(checkResellerAdminQuery, [
        authUser.id,
      ]);

      if (checkResellerAdmin && checkResellerAdmin[0].parent_id) {
        var reseller_mini_admin = true;
      } else {
        var reseller_mini_admin = false;
      }

      // start count of pending kyc, pending payout details, mini admin, total users

      if (authUser.usertype == "reseller") {
        var selecTotalUsersQuery = `SELECT COUNT(*) as total FROM usersdata WHERE usertype = ? and parent_id=?`;
        var totalUserResult = await Qry(selecTotalUsersQuery, [
          "user",
          authUser.id,
        ]);
      } else if (authUser.usertype == "admin" && reseller_mini_admin) {
        var selecTotalUsersQuery = `SELECT COUNT(*) as total FROM usersdata WHERE usertype = ? and parent_id=?`;
        var totalUserResult = await Qry(selecTotalUsersQuery, [
          "user",
          checkResellerAdmin[0].parent_id,
        ]);
      } else {
        var selecTotalUsersQuery = `SELECT COUNT(*) as total FROM usersdata WHERE usertype = ?`;
        var totalUserResult = await Qry(selecTotalUsersQuery, ["user"]);
      }

      if (authUser.usertype == "reseller") {
        var selectkycQuery = `SELECT COUNT(*) as total FROM kyc WHERE status = ? and userid=?`;
        var totalKycResult = await Qry(selectkycQuery, [
          "Pending",
          authUser.id,
        ]);
      } else {
        var selectkycQuery = `SELECT COUNT(*) as total FROM kyc WHERE status = ?`;
        var totalKycResult = await Qry(selectkycQuery, ["Pending"]);
      }

      if (authUser.usertype == "reseller") {
        var selectPayoutRequestQuery = `SELECT COUNT(*) as total FROM payout_information_request WHERE status = ? and userid=?`;
        var totalPayoutRequestResult = await Qry(selectPayoutRequestQuery, [
          "Pending",
          authUser.id,
        ]);
      } else {
        var selectPayoutRequestQuery = `SELECT COUNT(*) as total FROM payout_information_request WHERE status = ?`;
        var totalPayoutRequestResult = await Qry(selectPayoutRequestQuery, [
          "Pending",
        ]);
      }

      if (authUser.usertype == "reseller") {
        var selecMiniAdminQuery = `SELECT COUNT(*) as total FROM usersdata WHERE usertype = ? and parent_id=?`;
        var totalMiniAdminResult = await Qry(selecMiniAdminQuery, [
          "admin",
          authUser.id,
        ]);
      } else {
        var selecMiniAdminQuery = `SELECT COUNT(*) as total FROM usersdata WHERE usertype = ?`;
        var totalMiniAdminResult = await Qry(selecMiniAdminQuery, [
          "mini admin",
        ]);
      }

      // end count of pending kyc, pending payout details, mini admin, total users

      res.status(200).json({
        status: "success",
        payout: {
          currentMonth: selectCurrentMonthPayoutResult[0].total,
          allTime: selectAllTimePayoutResult[0].total,
        },
        users: {
          affiliate: totalAffiliateResult[0].total,
          normal: totalSimpleUsersResult[0].total,
        },
        totalUsers: totalUserResult[0].total,
        pendingKyc: totalKycResult[0].total,
        pendingPayoutDetailsRequest: totalPayoutRequestResult[0].total,
        totalMiniAdmin: totalMiniAdminResult[0].total,
        reseller_mini_admin: reseller_mini_admin,
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/getrank", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const selectRankQuery = `SELECT * From rank`;
      const selectRankResult = await Qry(selectRankQuery);
      res.status(200).json({
        status: "success",
        ranks: selectRankResult,
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/getlimitsdata", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const selectRankQuery = `SELECT * From chargbee_packages_limits`;
      const selectRankResult = await Qry(selectRankQuery);
      res.status(200).json({
        status: "success",
        data: selectRankResult,
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/updatelimitsdata", async (req, res) => {
  try {
    const postData = req.body;
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      // let pkg_plane = postData.pkg_plane;
      // let plan1_id = postData.plan1_id;


      // let plan2_id = postData.plan2_id;
     

      // let plan3_id = postData.plan3_id;


      // if (pkg_plane === "FaceBook") {
      //   const updateQuery = `UPDATE chargbee_packages_limits SET pkg_id = ?, fb_no_crm_group = ?, fb_no_stages_group = ?, fb_no_friend_request = ?, fb_no_crm_message = ?, fb_no_ai_comment = ?, fb_advanced_novadata = ?, fb_no_friend_requests_received = ? ,fb_no_of_birthday_wishes = ? WHERE id = ?`;
      //   await Qry(updateQuery, [
      //     plan1_id,
      //     plan1_fb_no_crm_group,
      //     plan1_fb_no_stages_group,
      //     plan1_fb_no_friend_request,
      //     plan1_fb_no_crm_message,
      //     plan1_fb_no_ai_comment,
      //     plan1_fb_advanced_novadata,
      //     plan1_fb_no_friend_requests_received,
      //     plan1_fb_no_of_birthday_wishes,
      //     1,
      //   ]);

      //   const updateQuery2 = `UPDATE chargbee_packages_limits SET pkg_id = ?, fb_no_crm_group = ?, fb_no_stages_group = ?, fb_no_friend_request = ?, fb_no_crm_message = ?, fb_no_ai_comment = ?, fb_advanced_novadata = ?, fb_no_friend_requests_received = ? , fb_no_of_birthday_wishes = ? WHERE id = ?`;
      //   await Qry(updateQuery, [
      //     plan2_id,
      //     plan2_fb_no_crm_group,
      //     plan2_fb_no_stages_group,
      //     plan2_fb_no_friend_request,
      //     plan2_fb_no_crm_message,
      //     plan2_fb_no_ai_comment,
      //     plan2_fb_advanced_novadata,
      //     plan2_fb_no_friend_requests_received,
      //     plan2_fb_no_of_birthday_wishes,
      //     2,
      //   ]);

      //   const updateQuery3 = `UPDATE chargbee_packages_limits SET pkg_id = ?, fb_no_crm_group = ?, fb_no_stages_group = ?, fb_no_friend_request = ?, fb_no_crm_message = ?, fb_no_ai_comment = ?, fb_advanced_novadata = ?, fb_no_friend_requests_received = ? , fb_no_of_birthday_wishes = ? WHERE id = ?`;
      //   await Qry(updateQuery, [
      //     plan3_id,
      //     plan3_fb_no_crm_group,
      //     plan3_fb_no_stages_group,
      //     plan3_fb_no_friend_request,
      //     plan3_fb_no_crm_message,
      //     plan3_fb_no_ai_comment,
      //     plan3_fb_advanced_novadata,
      //     plan3_fb_no_friend_requests_received,
      //     plan3_fb_no_of_birthday_wishes,
      //     3,
      //   ]);

      //   res.status(200).json({
      //     status: "success",
      //     message: "Limits has been updated successfully.",
      //   });
      // } else if (pkg_plane === "Instagram") {
      //   const updateQuery = `UPDATE chargbee_packages_limits SET pkg_id = ?, inst_no_crm_group = ?, inst_no_stages_group = ?, inst_no_friend_request = ?, inst_no_crm_message = ?, inst_no_ai_comment = ?, inst_advanced_novadata = ?, inst_no_friend_requests_received = ? ,inst_no_of_birthday_wishes = ? WHERE id = ?`;
      //   await Qry(updateQuery, [
      //     plan1_id,
      //     plan1_inst_no_crm_group,
      //     plan1_inst_no_stages_group,
      //     plan1_inst_no_friend_request,
      //     plan1_inst_no_crm_message,
      //     plan1_inst_no_ai_comment,
      //     plan1_inst_advanced_novadata,
      //     plan1_inst_no_friend_requests_received,
      //     plan1_inst_no_of_birthday_wishes,
      //     1,
      //   ]);

      //   const updateQuery2 = `UPDATE chargbee_packages_limits SET pkg_id = ?, inst_no_crm_group = ?, inst_no_stages_group = ?, inst_no_friend_request = ?, inst_no_crm_message = ?, inst_no_ai_comment = ?, inst_advanced_novadata = ?, inst_no_friend_requests_received = ? , inst_no_of_birthday_wishes = ? WHERE id = ?`;
      //   await Qry(updateQuery, [
      //     plan2_id,
      //     plan2_inst_no_crm_group,
      //     plan2_inst_no_stages_group,
      //     plan2_inst_no_friend_request,
      //     plan2_inst_no_crm_message,
      //     plan2_inst_no_ai_comment,
      //     plan2_inst_advanced_novadata,
      //     plan2_inst_no_friend_requests_received,
      //     plan2_inst_no_of_birthday_wishes,
      //     2,
      //   ]);

      //   const updateQuery3 = `UPDATE chargbee_packages_limits SET pkg_id = ?, inst_no_crm_group = ?, inst_no_stages_group = ?, inst_no_friend_request = ?, inst_no_crm_message = ?, inst_no_ai_comment = ?, inst_advanced_novadata = ?, inst_no_friend_requests_received = ? , inst_no_of_birthday_wishes = ? WHERE id = ?`;
      //   await Qry(updateQuery, [
      //     plan3_id,
      //     plan3_inst_no_crm_group,
      //     plan3_inst_no_stages_group,
      //     plan3_inst_no_friend_request,
      //     plan3_inst_no_crm_message,
      //     plan3_inst_no_ai_comment,
      //     plan3_inst_advanced_novadata,
      //     plan3_inst_no_friend_requests_received,
      //     plan3_inst_no_of_birthday_wishes,
      //     3,
      //   ]);

      //   res.status(200).json({
      //     status: "success",
      //     message: "Limits has been updated successfully.",
      //   });
      // }
    

      const updateQuery = `UPDATE chargbee_packages_limits SET message_limit=?, ai_credits_new = ?, tags_pipelines = ?  WHERE  id = ?`;
      await Qry(updateQuery, [
       postData.plan1_message_limit,
       postData.plan1_AI_credits,
       postData.plan1_Tags_pipelines,
        10,
      ]);

      await Qry(updateQuery, [
       postData.plan2_message_limit,
       postData.plan2_AI_credits,
       postData.plan2_Tags_pipelines,
      11,
      ]);

      await Qry(updateQuery, [
        postData.plan3_message_limit,
        postData.plan3_AI_credits,
        postData.plan3_Tags_pipelines,
        12,
      ]);

      res.status(200).json({
        status: "success",
        message: "new Limits has been updated successfully.",
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/getnovafreeranks", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const selectUserQuery = `SELECT * FROM novafree_rank WHERE id > ?`;
      const selectUserResult = await Qry(selectUserQuery, [0]);
      res.status(200).json({
        status: "success",
        data: selectUserResult,
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/autocoupon", async (req, res) => {
  const postData = req.body;
  try {
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const admin_transaction_password =
        postData.obj.admin_transaction_password;
      const selectAdminQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectAdminResult = await Qry(selectAdminQuery, [authUser.id]);

      const decryptedPassword = crypto.AES.decrypt(
        selectAdminResult[0].admin_transaction_password,
        encryptionKey
      ).toString(crypto.enc.Utf8);
      const passwordMatch = bcrypt.compareSync(
        admin_transaction_password,
        decryptedPassword
      );

      if (!passwordMatch) {
        res.json({
          status: "error",
          message: "Invalid admin transaction password",
        });
        return;
      }

      for (const [keyname, value] of Object.entries(postData.obj)) {
        if (keyname !== admin_transaction_password) {
          const updateQuery = `UPDATE novafree_rank SET coupon = ? WHERE name = ?`;
          const updateParams = [value, keyname];
          await Qry(updateQuery, updateParams);
        }
      }

      res.json({
        status: "success",
        message: "Coupon has been updated successfully",
      });
    }
  } catch (error) {
    res.status(500).json({ status: "error", message: error });
  }
});

router.post("/getautocoupon", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const selectAutoCouponQuery = `SELECT 
      ac.id, ac.coupon, ac.dat,
      rf.name AS rank_from,
      rt.name AS rank_to
      FROM auto_coupon ac
      LEFT JOIN rank rf ON ac.rank_from = rf.id
      LEFT JOIN rank rt ON ac.rank_to = rt.id
      ORDER BY ac.id DESC`;
      const selectAutoCouponResult = await Qry(selectAutoCouponQuery);
      res.status(200).json({
        status: "success",
        data: selectAutoCouponResult,
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/deleteautocoupon", async (req, res) => {
  try {
    const postData = req.body;
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      let id = postData.id;
      const selectAutoCouponQuery = `Delete From auto_coupon where id = ?`;
      const selectAutoCouponResult = await Qry(selectAutoCouponQuery, [id]);
      res.status(200).json({
        status: "success",
        message: "Auto coupon has been deleted successfully",
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

// start binary tree
router.post("/binarytree", async (req, res) => {
  try {
    const postData = req.body;
    let userrandomcode = postData.userrandomcode;
    const authUser = await adminAuthorization(req, res);
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
});

router.post("/singleuserbinarytreedata", async (req, res) => {
  try {
    const postData = req.body;
    let treeuserid = postData.id;
    let topuserid = postData.topid;
    const authUser = await adminAuthorization(req, res);
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
        SELECT ud.username, ud.rank, ud.novarank, ud.firstname, ud.lastname, ud.user_type, ud.sponsorid, ud.email, ud.mobile, ud.randomcode,
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
});
// end binary tree

//single user data
router.post("/singleuserdata", async (req, res) => {
  try {
    const postData = req.body;
    const userid = CleanHTMLData(CleanDBData(postData.userid));
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const userSelectQuery = `SELECT usersdata.sponsorid,usersdata.username, usersdata.randomcode, usersdata.firstname, usersdata.lastname, usersdata.email, usersdata.picture, usersdata.current_balance,usersdata.referral_side,  usersdata.status, usersdata.mobile, usersdata.emailstatus, usersdata.address1,usersdata.company, usersdata.country, usersdata.createdat, usersdata.login_status, usersdata.lastlogin, usersdata.lastip, usersdata.customerid, usersdata.kyc_status, usersdata.connect_status, usersdata.birthday_status, usersdata.crm_status, usersdata.unfollow_status, usersdata.no_crm_group, usersdata.no_stages_group, usersdata.no_friend_request, usersdata.no_crm_message, usersdata.no_ai_comment, usersdata.advanced_novadata, usersdata.no_friend_requests_received, usersdata.no_of_birthday_wishes, usersdata.level1_commission_per, usersdata.level2_commission_per, usersdata.level_commission_individual_status, usersdata.subscription_status,         usersdata.wallet_address, usersdata.bank_account_title, usersdata.bank_account_country, usersdata.bank_account_iban, usersdata.bank_account_bic, usersdata.bank_account_address, usersdata.bank_account_city, usersdata.bank_account_zip_code, usersdata.payout_country, usersdata.outside_bank_account_title, usersdata.outside_bank_account_country, usersdata.outside_bank_account_number, usersdata.outside_bank_account_swift_code, usersdata.outside_bank_account_routing, usersdata.outside_bank_account_currency, usersdata.outside_bank_account_address, usersdata.outside_bank_account_city, usersdata.outside_bank_account_zip_code, usersdata.outside_bank_account_street, usersdata.outside_payout_country, sp.username AS sponsorName FROM usersdata JOIN usersdata sp ON sp.id = usersdata.sponsorid WHERE usersdata.id = ?`;
      const userSelectParams = [userid];
      const userSelectResult = await Qry(userSelectQuery, userSelectParams);

      res.json({
        status: "success",
        data: userSelectResult,
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//get mini user allowed routes
router.get("/userallowedroutes", async (req, res) => {
  try {

    const postData = req.body;
    // const username = CleanHTMLData(CleanDBData(postData.username));

    const authUser = await adminAuthorization(req, res);

    if (authUser) {

      const userSelectQuery = `SELECT allowedroutes,username from usersdata WHERE id = ?`;

      const userSelectResult = await Qry(userSelectQuery, authUser.id);
      // console.log(userSelectResult)


      res.json({
        status: "success",
        data: userSelectResult,
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});



router.post("/adminlogs", async (req, res) => {
  try {
    const postData = req.body;
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      if (authUser.usertype == "reseller") {
        let type = postData.type;
        const userSelectQuery = `SELECT * from logs WHERE type = ? and user_id=? ORDER BY id DESC LIMIT 500`;

        const userSelectParams = [type, authUser.id];
        var userSelectResult = await Qry(userSelectQuery, userSelectParams);
      } else {
        let type = postData.type;
        const userSelectQuery = `SELECT * from logs WHERE type = ? ORDER BY id DESC LIMIT 500`;

        const userSelectParams = [type];
        var userSelectResult = await Qry(userSelectQuery, userSelectParams);
      }

      res.json({
        status: "success",
        data: userSelectResult,
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

router.post("/adminaccountsettings", async (req, res) => {
  try {
    const postData = req.body;
    const authUser = await adminAuthorization(req, res);

    if (authUser) {
      const userSelectQuery = `SELECT * from account_settings`;

      const userSelectParams = [];
      const userSelectResult = await Qry(userSelectQuery, userSelectParams);

      let extension_version = postData.extension_version;
      if (userSelectResult.length == 0) {
        const insertResult = await Qry(
          `INSERT INTO account_settings (extension_version) VALUES (?)`,
          [extension_version]
        );
      } else {
        const updateQuery = `UPDATE account_settings SET extension_version = ?`;
        const updateParams = [extension_version];
        await Qry(updateQuery, updateParams);
      }
      res.json({
        status: "success",
        data: userSelectResult,
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

router.get("/getadminaccountsettings", async (req, res) => {
  try {
    const userSelectQuery = `SELECT * from account_settings`;

    const userSelectParams = [];
    const userSelectResult = await Qry(userSelectQuery, userSelectParams);

    res.json({
      status: "success",
      data: userSelectResult,
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});
router.post("/unilevelstructure", async (req, res) => {
  try {
    const postData = req.body;
    let type = postData.type;
    const userSelectQuery = ` SELECT u.id AS user_id, u.username, COUNT(DISTINCT CASE WHEN u1.id IS NOT NULL THEN u1.id END) AS level_1_count, COUNT(DISTINCT CASE WHEN u2.id IS NOT NULL THEN u2.id END) AS level_2_count, COUNT(DISTINCT CASE WHEN u3.id IS NOT NULL THEN u3.id END) AS level_3_count FROM usersdata u LEFT JOIN usersdata u1 ON u1.sponsorid = u.id LEFT JOIN usersdata u2 ON u2.sponsorid = u1.id LEFT JOIN usersdata u3 ON u3.sponsorid = u2.id LEFT JOIN points p ON p.sender_id = u.id AND p.type = 'Referral Binary Points' AND MONTH(p.dat) = 11 GROUP BY u.id, u.username `;
    const userSelectResult = await Qry(userSelectQuery);

    res.json({
      status: "success",
      data: "ok",
    });
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

// Get Unilevels
router.post("/getunilevel", async (req, res) => {
  try {
    const postData = req.body;
    const authUser = await adminAuthorization(req, res);

    if (authUser) {
      const selectUnilevelQuery = `SELECT * FROM unilevels WHERE id != ?`;
      const unilevelResult = await Qry(selectUnilevelQuery, [0]);

      res.json({
        status: "success",
        data: unilevelResult,
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

// Update Unilevels
router.post("/updateunilevel", async (req, res) => {
  try {
    const postData = req.body;
    const authUser = await adminAuthorization(req, res);

    if (authUser) {
      const id = CleanHTMLData(CleanDBData(postData.id));
      const level1 = CleanHTMLData(CleanDBData(postData.level1));
      const level2 = CleanHTMLData(CleanDBData(postData.level2));
      const number_of_users = CleanHTMLData(
        CleanDBData(postData.number_of_users)
      );

      if (id === 1) {
        const updateUnilevelQuery = `UPDATE unilevels SET level1 = ?, level2 = ?, number_of_users = ? WHERE id = ?`;
        const unilevelResult = await Qry(updateUnilevelQuery, [
          level1,
          level2,
          number_of_users,
          id,
        ]);

        const updateQuery = `UPDATE unilevels set number_of_users = ? WHERE id = ?`;
        const updateResult = await Qry(updateQuery, [number_of_users, 0]);

        if (unilevelResult.affectedRows > 0) {
          res.json({
            status: "success",
            message: "Unilevel updated successfully.",
          });
        } else {
          res.json({
            status: "error",
            message: "Failed to update unilevel.",
          });
        }
      } else {
        const selectUnilevelQuery = `UPDATE unilevels SET level1 = ?, level2 = ?, number_of_users = ? WHERE id = ?`;
        const unilevelResult = await Qry(selectUnilevelQuery, [
          level1,
          level2,
          number_of_users,
          id,
        ]);
        if (unilevelResult.affectedRows > 0) {
          res.json({
            status: "success",
            message: "Unilevel updated successfully.",
          });
        } else {
          res.json({
            status: "error",
            message: "Failed to update unilevel.",
          });
        }
      }
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

// Get Pool
router.post("/getpool", async (req, res) => {
  try {
    const postData = req.body;
    const authUser = await adminAuthorization(req, res);

    if (authUser) {
      const selectPoolQuery = `SELECT * FROM pool WHERE id != ?`;
      const poolResult = await Qry(selectPoolQuery, [0]);

      res.json({
        status: "success",
        data: poolResult,
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

// Update Pool
router.post("/updatepool", async (req, res) => {
  try {
    const postData = req.body;
    const authUser = await adminAuthorization(req, res);

    if (authUser) {
      const id = CleanHTMLData(CleanDBData(postData.id));
      const pool_name = CleanHTMLData(CleanDBData(postData.pool_name));
      const percentage = CleanHTMLData(CleanDBData(postData.percentage));
      const amount = CleanHTMLData(CleanDBData(postData.amount));
      const number_of_user = CleanHTMLData(
        CleanDBData(postData.number_of_user)
      );

      if (id === 1) {
        const updateUnilevelQuery = `UPDATE pool SET pool_name = ?, percentage = ?, amount = ?, number_of_users = ? WHERE id = ?`;
        const unilevelResult = await Qry(updateUnilevelQuery, [
          pool_name,
          percentage,
          amount,
          number_of_user,
          id,
        ]);

        const updateQuery = `UPDATE pool SET number_of_users = ? WHERE id = ?`;
        const updateResult = await Qry(updateQuery, [number_of_user, 0]);

        if (unilevelResult.affectedRows > 0) {
          res.json({
            status: "success",
            message: "Pool updated successfully.",
          });
        } else {
          res.json({
            status: "error",
            message: "Failed to update pool.",
          });
        }
      } else {
        const selectUnilevelQuery = `UPDATE pool SET pool_name = ?, percentage = ?, amount = ?, number_of_users = ? WHERE id = ?`;
        const unilevelResult = await Qry(selectUnilevelQuery, [
          pool_name,
          percentage,
          amount,
          number_of_user,
          id,
        ]);

        if (unilevelResult.affectedRows > 0) {
          res.json({
            status: "success",
            message: "Pool updated successfully.",
          });
        } else {
          res.json({
            status: "error",
            message: "Failed to update pool.",
          });
        }
      }
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//select Unilevel Bonus Data
router.post("/getunilevelreports", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const getunilevelQuery =
        "SELECT t.*, ud_sender.username AS sender_username, ud_receiver.username AS receiver_username FROM transactions AS t JOIN usersdata AS ud_sender ON t.senderid = ud_sender.id JOIN usersdata AS ud_receiver ON t.receiverid = ud_receiver.id WHERE t.type IN ('Level 1 Bonus Deducted', 'Level 2 Bonus Deducted', 'Level 1 Bonus', 'Level 2 Bonus') and t.amount != 0 order by t.id desc";
      const levelBonusData = await Qry(getunilevelQuery);
      res.json({
        status: "success",
        data: levelBonusData,
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//select Pool Distribution Data
router.post("/getpooldistributionreports", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res);
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
});

//select Unilevel Bonus Data
router.post("/getpoolreports", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const getunilevelQuery =
        "SELECT t.*, ud_receiver.username AS receiver_username FROM transactions AS t JOIN usersdata AS ud_receiver ON t.receiverid = ud_receiver.id WHERE t.type = ? OR t.type = ? OR t.type = ?";
      const levelBonusData = await Qry(getunilevelQuery, [
        "Pool 1 Bonus",
        "Pool 2 Bonus",
        "Pool 3 Bonus",
      ]);
      res.json({
        status: "success",
        data: levelBonusData,
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//select level Bonus Deducted
router.post("/getlevelbonusdedcuted", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const getLevelBonusDeducted =
        "SELECT t.*, ud_sender.username AS sender_username, ud_receiver.username AS receiver_username FROM transactions AS t JOIN usersdata AS ud_sender ON t.senderid = ud_sender.id JOIN usersdata AS ud_receiver ON t.receiverid = ud_receiver.id WHERE t.type IN ('Level 1 Bonus Deducted', 'Level 2 Bonus Deducted')";
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
});

//update current balance
router.post("/updatebalance", async (req, res) => {
  try {
    const userData = await Qry(`SELECT * FROM usersdata`);

    for (const user of userData) {
      let userId = user.id;
      let usdBalance = user.current_balance_usd;
      let eurBalance = user.current_balance_eur;

      const updateQuery = await Qry(
        `UPDATE usersdata SET current_balance_usd = ?, current_balance_eur = ?, current_balance_usd_payout = current_balance_usd_payout + ?, current_balance_eur_payout = current_balance_eur_payout + ? WHERE id = ?`,
        [0, 0, usdBalance, eurBalance, userId]
      );
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//update sponsor
router.post("/updatesponsor", async (req, res) => {
  try {
    const postData = req.body;
    const userid = CleanHTMLData(CleanDBData(postData.userid));
    const sponsorid = CleanHTMLData(CleanDBData(postData.sponsorid));
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const userData = await Qry(`SELECT * FROM usersdata WHERE id = ?`, [
        userid,
      ]);

      const customerId = userData[0].customerid;

      const updateSponsor = await Qry(
        `UPDATE usersdata SET sponsorid = ?  WHERE id = ?`,
        [sponsorid, userid]
      );
      const selectTra = await Qry(
        `SELECT * FROM transactions WHERE senderid = ? and (type = ? or type = ?) and MONTH(createdat) = MONTH(now())`,
        [userid, "Level 1 Bonus", "Level 1 Bonus Deducted"]
      );

      let transactions_level1_old_receiver_id = 0;
      let transactions_level1_new_receiver_id = 0;
      let transactions_level2_old_receiver_id = 0;
      let transactions_level2_new_receiver_id = 0;
      let update_level1_transactions = "no";
      let update_level2_transactions = "no";

      if (selectTra.length > 0) {
        update_level1_transactions = "yes";
        transactions_level1_old_receiver_id = userData[0].sponsorid;
        transactions_level1_new_receiver_id = sponsorid;
        const updateTransactions = await Qry(
          `UPDATE transactions SET receiverid = ? WHERE id = ?`,
          [sponsorid, selectTra[0].id]
        );
        const selectTra2 = await Qry(
          `SELECT * FROM transactions WHERE senderid = ? and (type = ? or type = ?) and MONTH(createdat) = MONTH(now())`,
          [userid, "Level 2 Bonus", "Level 2 Bonus Deducted"]
        );
        if (selectTra2.length > 0) {
          update_level2_transactions = "yes";
          const selectuserSponsor11 = await Qry(
            `SELECT * FROM usersdata WHERE id = ?`,
            [userData[0].sponsorid]
          );
          const selectuserSponsor = await Qry(
            `SELECT * FROM usersdata WHERE id = ?`,
            [sponsorid]
          );
          transactions_level2_old_receiver_id =
            selectuserSponsor11[0].sponsorid;
          transactions_level2_new_receiver_id = selectuserSponsor[0].sponsorid;
          const updateTransactions2 = await Qry(
            `UPDATE transactions SET receiverid = ? WHERE id = ?`,
            [selectuserSponsor[0].sponsorid, selectTra2[0].id]
          );
        }
      }

      const insertQuery =
        "INSERT into change_sponsor (userid,old_sponsor_id,new_sponsor_id,transactions_level1_old_receiver_id,transactions_level1_new_receiver_id,transactions_level2_old_receiver_id,transactions_level2_new_receiver_id,update_level1_transactions,update_level2_transactions) values (?,?,?,?,?,?,?,?,?)";
      const updateParams = [
        userid,
        userData[0].sponsorid,
        sponsorid,
        transactions_level1_old_receiver_id,
        transactions_level1_new_receiver_id,
        transactions_level2_old_receiver_id,
        transactions_level2_new_receiver_id,
        update_level1_transactions,
        update_level2_transactions,
      ];
      const updateResult = await Qry(insertQuery, updateParams);

      const sponsorData = await Qry(
        `SELECT username, email FROM usersdata WHERE id = ?`,
        [sponsorid]
      );
      let sponsorUsername = sponsorData[0].username;
      let sponsorEmail = sponsorData[0].email;
      // console.log(sponsorEmail)
      if (updateSponsor.affectedRows > 0) {
        chargebee.customer.update(customerId, {
          cf_sponsor_username: sponsorUsername,
          cf_sponsor_email: sponsorEmail
        }).request(function (error, result) {
          if (error) {
            //handle error
            console.log(error);
          } else {
          }
        });
        logger.info(
          `Admin has been updated the sponsor of ${userData[0].username}. New sposnor is ${sponsorData[0].username}`,
          { type: "admin" }
        );
        res.json({
          status: "success",
          message: "Sponsor updated successfully",
        });
      } else {
        res.json({
          status: "error",
          message: "Failed to update sponsor",
        });
      }
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

router.post("/binarypointsreportfordavina", async (req, res) => {
  try {
    const postData = req.body;
    const userid = postData.userid;
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const pointsSelect = await Qry(`
      SELECT p.*, ud.username, ud.email
      FROM points p
      left join usersdata ud on p.sender_id = ud.id
      WHERE p.leg = 'L' and MONTH(dat) = 1 and JSON_SEARCH(p.receiver_ids, 'one', '2305', NULL, '$.receiver_ids')
      IS NOT NULL
    `);

      const pointsdbData = pointsSelect;
      let pointsarray = { enteries: pointsdbData };

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
});

//single user data
router.post("/userbalance", async (req, res) => {
  try {
    const postData = req.body;
    const userid = CleanHTMLData(CleanDBData(postData.userid));
    const authUser = await adminAuthorization(req, res);
    // if (authUser) {
    //   const countQuer1 = await Qry(
    //     "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = 1 AND DAY(createdat) >= 28 AND YEAR(createdat) = YEAR(now())",
    //     [userid, "Level 1 Bonus"]
    //   );

    //   const countQuer2 = await Qry(
    //     "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = MONTH(now()) and YEAR(createdat) = YEAR(now())",
    //     [userid, "Level 1 Bonus"]
    //   );

    //   const countQuer3 = await Qry(
    //     "SELECT COUNT(*) as userCount FROM usersdata WHERE sponsorid = ? AND sub_type = 'year' AND DAY(NOW()) >= DAY(createdat) AND DATEDIFF(NOW(), createdat) <= 365 AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') and MONTH(createdat) != MONTH(now())",
    //     [userid]
    //   );

    //   const countQuer4 = await Qry(
    //     "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = MONTH(now()) and YEAR(createdat) = YEAR(now())",
    //     [userid, "Level 1 Bonus Deducted"]
    //   );

    //   let totalUser =
    //     countQuer2[0].userCount +
    //     countQuer3[0].userCount -
    //     countQuer4[0].userCount;

    //   let unilevelData;
    //   unilevelData = await Qry(
    //     "SELECT * FROM unilevels WHERE number_of_users <= ? ORDER BY id DESC LIMIT 1",
    //     [totalUser]
    //   );

    //   if (unilevelData.length === 0) {
    //     unilevelData = await Qry("SELECT * FROM unilevels WHERE id = ?", [0]);
    //   }

    //   // start total payment
    //   let totalPaymentEUR = 0;
    //   let totalPaymentUSD = 0;

    //   // start level 1 and 2
    //   const selectTraLevelTpay = `SELECT * FROM transactions WHERE receiverid = ? AND (type = ? or type = ?) and MONTH(createdat) = MONTH(now()) and YEAR(createdat) = YEAR(now())`;
    //   let resultTraLevelTPay = await Qry(selectTraLevelTpay, [
    //     userid,
    //     "Level 1 Bonus",
    //     "Level 2 Bonus",
    //   ]);

    //   for (const data of resultTraLevelTPay) {
    //     let senderid = data.senderid;
    //     const selectSender1 = `SELECT * FROM usersdata WHERE id = ?`;
    //     let resultSender1 = await Qry(selectSender1, [senderid]);
    //     let levelBonus = 0;
    //     let amount = resultSender1[0].plan_amount;
    //     let currency = data.currency;
    //     if (data.type === "Level 1 Bonus") {
    //       levelBonus = unilevelData[0].level1;
    //     }
    //     if (data.type === "Level 2 Bonus") {
    //       levelBonus = unilevelData[0].level2;
    //     }
    //     let bonus = (amount / 100) * levelBonus;
    //     if (currency === "EUR") {
    //       totalPaymentEUR = totalPaymentEUR + bonus;
    //     }
    //     if (currency === "USD") {
    //       totalPaymentUSD = totalPaymentUSD + bonus;
    //     }
    //   }
    //   // end level 1 and 2

    //   // start deduct level 1 and 2
    //   const selectTraLevelDedTPay = `SELECT * FROM transactions WHERE receiverid = ? AND (type = ? or type = ?) and MONTH(createdat) = MONTH(now()) and YEAR(createdat) = YEAR(now())`;
    //   let resultTraLevelDedTPAY = await Qry(selectTraLevelDedTPay, [
    //     userid,
    //     "Level 1 Bonus Deducted",
    //     "Level 2 Bonus Deducted",
    //   ]);

    //   for (const data of resultTraLevelDedTPAY) {
    //     let senderid = data.senderid;
    //     const selectSender1 = `SELECT * FROM usersdata WHERE id = ?`;
    //     let resultSender1 = await Qry(selectSender1, [senderid]);
    //     let levelBonus = 0;
    //     let amount = resultSender1[0].plan_amount;
    //     let currency = data.currency;

    //     if (data.type === "Level 1 Bonus Deducted") {
    //       levelBonus = unilevelData[0].level1;
    //     }
    //     if (data.type === "Level 2 Bonus Deducted") {
    //       levelBonus = unilevelData[0].level2;
    //     }
    //     let bonus = (amount / 100) * levelBonus;
    //     if (currency === "EUR") {
    //       totalPaymentEUR = totalPaymentEUR - bonus;
    //     }
    //     if (currency === "USD") {
    //       totalPaymentUSD = totalPaymentUSD - bonus;
    //     }
    //   }
    //   // end deduct level 1 and 2
    //   const selectPoolBonusUSD = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND (type = ? or type = ? or type = ?) AND status = ? AND MONTH(createdat) = MONTH(now()) AND YEAR(createdat) = YEAR(now())`;
    //   let resultPoolBonusUSD = await Qry(selectPoolBonusUSD, [
    //     userid,
    //     "Pool 1 Bonus",
    //     "Pool 2 Bonus",
    //     "Pool 3 Bonus",
    //     "Pending",
    //   ]);
    //   if (resultPoolBonusUSD[0].totalAmount === null) {
    //     resultPoolBonusUSD[0].totalAmount = 0;
    //   }
    //   let bonusUSD = resultPoolBonusUSD[0].totalAmount;
    //   totalPaymentUSD = totalPaymentUSD + bonusUSD;

    //   // start add and deduct usd by admin

    //   const selectAddedBonusUSD = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND type = ? AND currency = ? AND MONTH(createdat) = MONTH(now()) AND YEAR(createdat) = YEAR(now())`;
    //   let resultAddedBonusUSD = await Qry(selectAddedBonusUSD, [
    //     userid,
    //     "Bonus Add By Admin",
    //     "USD",
    //   ]);

    //   if (resultAddedBonusUSD[0].totalAmount === null) {
    //     resultAddedBonusUSD[0].totalAmount = 0;
    //   }

    //   const selectDeductedBonusUSD = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND type = ? AND currency = ? AND MONTH(createdat) = MONTH(now()) AND YEAR(createdat) = YEAR(now())`;
    //   let resultDeductedBonusUSD = await Qry(selectDeductedBonusUSD, [
    //     userid,
    //     "Bonus Deduct By Admin",
    //     "USD",
    //   ]);

    //   if (resultDeductedBonusUSD[0].totalAmount === null) {
    //     resultDeductedBonusUSD[0].totalAmount = 0;
    //   }

    //   // end add and deduct usd by admin

    //   // start add and deduct eur by admin

    //   const selectAddedBonusEUR = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND type = ? AND currency = ? AND MONTH(createdat) = MONTH(now()) AND YEAR(createdat) = YEAR(now())`;
    //   let resultAddedBonusEUR = await Qry(selectAddedBonusEUR, [
    //     userid,
    //     "Bonus Add By Admin",
    //     "EUR",
    //   ]);

    //   if (resultAddedBonusEUR[0].totalAmount === null) {
    //     resultAddedBonusEUR[0].totalAmount = 0;
    //   }

    //   const selectDeductedBonusEUR = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND type = ? AND currency = ? AND MONTH(createdat) = MONTH(now()) AND YEAR(createdat) = YEAR(now())`;
    //   let resultDeductedBonusEUR = await Qry(selectDeductedBonusEUR, [
    //     userid,
    //     "Bonus Deduct By Admin",
    //     "EUR",
    //   ]);

    //   if (resultDeductedBonusEUR[0].totalAmount === null) {
    //     resultDeductedBonusEUR[0].totalAmount = 0;
    //   }

    //   // end add and deduct usd by admin

    //   totalPaymentEUR =
    //     totalPaymentEUR +
    //     resultAddedBonusEUR[0].totalAmount -
    //     resultDeductedBonusEUR[0].totalAmount;
    //   totalPaymentUSD =
    //     totalPaymentUSD +
    //     resultAddedBonusUSD[0].totalAmount -
    //     resultDeductedBonusUSD[0].totalAmount;

    //   let totalPayment = {
    //     eur: totalPaymentEUR,
    //     usd: totalPaymentUSD,
    //   };
    //   // end total payment
    //   res.json({
    //     status: "success",
    //     data: totalPayment,
    //   });
    // }
    if (authUser) {
      // const selectQuery = await Qry(`SELECT * FROM usersdata WHERE id = ?`, [
      //   userid,
      // ]);
      let currentMonthNumber = currentMonthFun();
      let commissionData = await total_payment_function(
        userid,
        currentMonthNumber
      );

      let totalPayment = {
        eur: commissionData.totalPaymentEUR || 0,
        usd: commissionData.totalPaymentUSD || 0,
      };
   
       res.json({
        status: "success",
        data: totalPayment,
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//Unlock user
router.post("/unlockuser", async (req, res) => {
  try {
    const postData = req.body;
    const userid = postData.userid;
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const selectQuery = await Qry(`SELECT * FROM usersdata WHERE id = ?`, [
        userid,
      ]);
      const userName = selectQuery[0].username;
      const joinDate = new Date(selectQuery[0].createdat);
      const currentDate = new Date();

      let status = "";

      if (
        joinDate.getMonth() === currentDate.getMonth() &&
        joinDate.getFullYear() === currentDate.getFullYear()
      ) {
        status = "Active";
      } else {
        status = "subscription_renewed";
      }

      const updateQuery = await Qry(
        `UPDATE usersdata SET subscription_status = ?, login_status = ? WHERE id = ?`,
        [status, "Unblock", userid]
      );

      res.json({
        status: "success",
        message: `${userName} unblock successfully.`,
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

//get user sales
router.post("/getusersales", async (req, res) => {
  try {
    const postData = req.body;
    const sales = postData.sales;
    const month = postData.month;
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const selectUsers = await Qry(
        `SELECT * FROM usersdata WHERE usertype = ? AND user_type = ?`,
        ["user", "Distributor"]
      );

      // Initialize an empty array to store matched users
      const matchedUsers = [];

      for (const user of selectUsers) {
        // For each user, perform your count queries
        let userID = user.id;
        let totalUser = await newSalesFunction(userID, month);

        // Check if the user's sales match the provided sales value
        if (sales === "1") {
          if (totalUser === 1) {
            // Pushing only required user data into matchedUsers array
            matchedUsers.push({
              id: user.id,
              username: user.username,
              firstname: user.firstname,
              lastname: user.lastname,
              email: user.email,
              totalUser,
            });
          }
        } else if (sales === "2") {
          if (totalUser === 2) {
            // Pushing only required user data into matchedUsers array
            matchedUsers.push({
              id: user.id,
              username: user.username,
              firstname: user.firstname,
              lastname: user.lastname,
              email: user.email,
              totalUser,
            });
          }
        } else if (sales === "3") {
          if (totalUser >= 3 && totalUser <= 4) {
            // Pushing only required user data into matchedUsers array
            matchedUsers.push({
              id: user.id,
              username: user.username,
              firstname: user.firstname,
              lastname: user.lastname,
              email: user.email,
              totalUser,
            });
          }
        } else if (sales === "5") {
          if (totalUser >= 5 && totalUser <= 9) {
            // Pushing only required user data into matchedUsers array
            matchedUsers.push({
              id: user.id,
              username: user.username,
              firstname: user.firstname,
              lastname: user.lastname,
              email: user.email,
              totalUser,
            });
          }
        } else if (sales === "10") {
          if (totalUser >= 10) {
            // Pushing only required user data into matchedUsers array
            matchedUsers.push({
              id: user.id,
              username: user.username,
              firstname: user.firstname,
              lastname: user.lastname,
              email: user.email,
              totalUser,
            });
          }
        }
      }

      res.json({
        status: "success",
        data: matchedUsers,
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/userlimit", async (req, res) => {
  try {
    const postData = req.body;
    const userid = postData.userid;
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const userlimit = await Qry(
        `SELECT * FROM users_limits WHERE userid = ?`,
        [userid]
      );
      res.json({
        status: "success",
        data: userlimit,
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/updateuserlimits", async (req, res) => {
  try {
    const postData = req.body;
    const {
      userid,
     message_limit,
      ai_credits_new,
      tags_pipelines,
    } = postData;
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const updateQuery = `
      UPDATE users_limits SET 
        message_limit = ?, ai_credits_new = ?, tags_pipelines = ?  WHERE userid = ?`;

      await Qry(updateQuery, [
       message_limit,
      ai_credits_new,
      tags_pipelines,
        userid,
      ]);

      res.json({
        status: "success",
        message: "User plan limits has been updated successfully.",
      });
    }else{
      const updateQuery = `
      UPDATE users_limits SET 
        fb_messages = ?, insta_messages = ?  WHERE userid = ?`;

      await Qry(updateQuery, [
        fb_messages,
      insta_messages,
        userid,
      ]);

      res.json({
        status: "success",
        message: "User plan limits has been updated successfully.",
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/updateConnectionlimits", async (req, res) => {
  try {
    const postData = req.body;
    const {
      userid,
      fb_messages,
      insta_messages,
     
    } = postData;

  
      const updateQuery = `
      UPDATE users_limits SET 
        fb_messages = ?, insta_messages = ?  WHERE userid = ?`;

      await Qry(updateQuery, [
        fb_messages,
      insta_messages,
        userid,
      ]);

      res.json({
        status: "success",
        message: "User plan limits has been updated successfully.",
      });
  
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

// router.post("/pool-report", async (req, res) => {
//   try {
//     const postData = req.body;

//     if (true) {
//       const selectUserQuery = `SELECT * FROM usersdata WHERE usertype = ? and user_type = ?`;
//       const selectUserResult = await Qry(selectUserQuery, [
//         "user",
//         "Distributor",
//       ]);
//       function getLastMonthNumber() {
//         var currentDate = new Date();
//         var lastMonth = currentDate.getMonth() - 2; // Get current month
//         lastMonth = lastMonth === 0 ? 12 : lastMonth; // If January, set to December
//         return lastMonth;
//       }

//       let lastMonthNumber = getLastMonthNumber();
//       lastMonthNumber = 4;
//       let data = [];
//       let x = 0;
//       for (const user of selectUserResult) {
//         let userID = user.id;
//         x++;

//         let countActiveQuery;
//         if (lastMonthNumber === 2) {
//           countActiveQuery = await Qry(
//             "SELECT COUNT(*) as userCount FROM transactions WHERE event_type = ? AND type = ? AND receiverid = ? AND ((MONTH(createdat) = ? AND YEAR(createdat) = YEAR(NOW())) OR (MONTH(createdat) = 1 AND DAY(createdat) >= 28 AND YEAR(createdat) = YEAR(NOW())))",
//             ["subscription_created", "Level 1 Bonus", userID, lastMonthNumber]
//           );
//         } else {
//           countActiveQuery = await Qry(
//             "SELECT COUNT(*) as userCount FROM transactions WHERE event_type = ? AND type = ? AND receiverid = ? AND ((MONTH(createdat) = ? AND YEAR(createdat) = YEAR(NOW())))",
//             ["subscription_created", "Level 1 Bonus", userID, lastMonthNumber]
//           );
//         }

//         const countActiveQuery1 = await Qry(
//           `SELECT COUNT(*) as userCount, t.senderid as tid 
//           FROM transactions t
//           JOIN usersdata u ON t.senderid = u.id
//           WHERE t.event_type = ? 
//             AND t.type = ? 
//             AND t.receiverid = ? 
//             AND ((MONTH(t.createdat) = ? AND YEAR(t.createdat) = YEAR(NOW())))
//             AND u.subscription_status = 'payment_refunded'`,
//           [
//             "payment_refunded",
//             "Level 1 Bonus Deducted",
//             userID,
//             lastMonthNumber,
//           ]
//         );

//         let totalActiveUser =
//           countActiveQuery[0].userCount - countActiveQuery1[0].userCount;

//         let silver = "No";
//         let gold = "No";
//         let platinum = "No";

//         if (totalActiveUser >= 3) {
//           silver = "Yes";
//         }

//         if (totalActiveUser >= 5) {
//           gold = "Yes";
//         }

//         if (totalActiveUser >= 10) {
//           platinum = "Yes";
//         }

//         let obj = {
//           id: x,
//           username: user.username,
//           month: "April",
//           email: user.email,
//           silver,
//           gold,
//           platinum,
//         };
//         data.push(obj);
//       }

//       res.json({
//         status: "success",
//         data,
//       });
//     }
//   } catch (e) {
//     res.status(500).json({ status: "error", message: e });
//   }
// });

router.post("/pool-report", async (req, res) => {
  try {
    const postData = req.body;
    let data = [];
    let monthArray = [8]
    let i = 3;
    function getMonthName(monthNumber) {
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      // Check if the monthNumber is valid (1-12)
      if (monthNumber < 1 || monthNumber > 12) {
        return 'Invalid month number';
      }

      // Subtract 1 from monthNumber because array indices start from 0
      return months[monthNumber - 1];
    }

    for (const month of monthArray) {
      let totalAmount
      if (month === 5) {
        totalAmount = 2160.33
      }
      else {
        totalAmount = 3812.48
      }

      const selectPoolData = await Qry(`
        SELECT transactions.id, transactions.amount, usersdata.username, usersdata.firstname, usersdata.lastname, usersdata.email 
        FROM transactions JOIN usersdata ON transactions.receiverid = usersdata.id WHERE transactions.type = ? AND MONTH(transactions.createdat) = ?`, ['Pool 3 Bonus', month]);
      for (let user of selectPoolData) {

        const countQuery = await Qry(`SELECT COUNT(*) AS total FROM transactions WHERE type = ? AND MONTH(createdat) = ?`, ['Pool 3 Bonus', month])

        let totalUser = countQuery[0].total;

        let poolMonth = getMonthName(month - 1)

        data.push({
          id: user.id,
          username: user.username,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          poolamount: user.amount,
          totalamount: totalAmount,
          totaluser: totalUser,
          poolmonth: poolMonth,
        })
      }
      i++
    }
    res.json({
      status: "success",
      data,
    });
  } catch (e) {
    console.log('error==>', e.message)
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/updatepayoutdetails", async (req, res) => {
  const postData = req.body;
  try {
    const authUser = await adminAuthorization(req, res);
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
        const userid = postData.userid;

        // const selectUserQuery = `select * from usersdata where id = ?`;
        // const selectUserResult = await Qry(selectUserQuery, [authUser.id]);

        const updatePayoutData = await Qry(
          "UPDATE usersdata SET `wallet_address` = NULL, `bank_account_title` = NULL, `bank_account_country` = NULL, `bank_account_iban` = NULL, `bank_account_bic` = NULL, `bank_account_address` = NULL, `bank_account_city` = NULL, `bank_account_zip_code` = NULL, `payout_country` = NULL, `outside_bank_account_title` = NULL, `outside_bank_account_country` = NULL, `outside_bank_account_number` = NULL, `outside_bank_account_swift_code` = NULL, `outside_bank_account_routing` = NULL, `outside_bank_account_currency` = NULL, `outside_bank_account_address` = NULL, `outside_bank_account_city` = NULL, `outside_bank_account_zip_code` = NULL, `outside_bank_account_street` = NULL, `outside_payout_country` = NULL WHERE id = ?",
          [userid]
        );

        const insertPayoutRequest = await Qry(
          "UPDATE usersdata SET `bank_account_title` = ?, `bank_account_country` = ?, `bank_account_iban` = ?, `bank_account_bic` = ?, `bank_account_address` = ?, `bank_account_city` = ?, `bank_account_zip_code` = ?, `payout_country` = ? WHERE id = ?",
          [
            bankAccountName,
            country,
            bankAccountIBAN,
            bankAccountBIC,
            bankAccountAddress,
            bankAccountCity,
            bankAccountZipCode,
            paymentCountry,
            userid,
          ]
        );
        if (insertPayoutRequest.affectedRows > 0) {
          // logger.info(
          //   `User ${selectUserResult[0].username} has updated payout details Account Title from ${selectUserResult[0].bank_account_title} to ${bankAccountName}, IBAN from ${selectUserResult[0].bank_account_iban} to ${bankAccountIBAN}, BIC from ${selectUserResult[0].bank_account_bic} to ${bankAccountBIC} and Country from ${selectUserResult[0].bank_account_country} to ${country}`,
          //   { type: "user" }
          // );

          res.status(200).json({
            status: "success",
            message: "Payout detail updated successfully.",
          });
        }
      } else if (payoutType === "Crypto") {
        const address = postData.wallet_address;
        const userid = postData.userid;

        // const selectUserQuery = `select * from usersdata where id = ?`;
        // const selectUserResult = await Qry(selectUserQuery, [authUser.id]);

        const updatePayoutData = await Qry(
          "UPDATE usersdata SET `wallet_address` = NULL, `bank_account_title` = NULL, `bank_account_country` = NULL, `bank_account_iban` = NULL, `bank_account_bic` = NULL, `bank_account_address` = NULL, `bank_account_city` = NULL, `bank_account_zip_code` = NULL, `payout_country` = NULL, `outside_bank_account_title` = NULL, `outside_bank_account_country` = NULL, `outside_bank_account_number` = NULL, `outside_bank_account_swift_code` = NULL, `outside_bank_account_routing` = NULL, `outside_bank_account_currency` = NULL, `outside_bank_account_address` = NULL, `outside_bank_account_city` = NULL, `outside_bank_account_zip_code` = NULL, `outside_bank_account_street` = NULL, `outside_payout_country` = NULL WHERE id = ?",
          [userid]
        );

        const insertPayoutRequest = await Qry(
          "UPDATE `usersdata` SET  `wallet_address` = ? WHERE id = ?",
          [address, userid]
        );
        if (insertPayoutRequest.affectedRows > 0) {
          // logger.info(
          //   `User ${selectUserResult[0].username} has updated wallet address from ${selectUserResult[0].wallet_address} to ${address}`,
          //   { type: "user" }
          // );

          res.status(200).json({
            status: "success",
            message: "Payout detail updated successfully.",
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
        const userid = postData.userid;

        // const selectUserQuery = `select * from usersdata where id = ?`;
        // const selectUserResult = await Qry(selectUserQuery, [authUser.id]);

        const updatePayoutData = await Qry(
          "UPDATE usersdata SET `wallet_address` = NULL, `bank_account_title` = NULL, `bank_account_country` = NULL, `bank_account_iban` = NULL, `bank_account_bic` = NULL, `bank_account_address` = NULL, `bank_account_city` = NULL, `bank_account_zip_code` = NULL, `payout_country` = NULL, `outside_bank_account_title` = NULL, `outside_bank_account_country` = NULL, `outside_bank_account_number` = NULL, `outside_bank_account_swift_code` = NULL, `outside_bank_account_routing` = NULL, `outside_bank_account_currency` = NULL, `outside_bank_account_address` = NULL, `outside_bank_account_city` = NULL, `outside_bank_account_zip_code` = NULL, `outside_bank_account_street` = NULL, `outside_payout_country` = NULL WHERE id = ?",
          [userid]
        );

        const insertPayoutRequest = await Qry(
          "UPDATE `usersdata` SET `outside_bank_account_title` = ?, `outside_bank_account_country` = ?, `outside_bank_account_number` = ?, `outside_bank_account_swift_code` = ?, `outside_bank_account_routing` = ?, `outside_bank_account_address` = ?, `outside_bank_account_city` = ?, `outside_bank_account_zip_code` = ?, `outside_payout_country` = ? WHERE id = ?",
          [
            bankAccountName,
            country,
            bankAccountNumber,
            bankAccountSwiftCode,
            bankAccountRouting,
            bankAccountAddress,
            bankAccountCity,
            bankAccountZipCode,
            paymentCountry,
            userid,
          ]
        );
        if (insertPayoutRequest.affectedRows > 0) {
          // logger.info(
          //   `User ${selectUserResult[0].username} has updated payout details Account Title from ${selectUserResult[0].outside_bank_account_title} to ${bankAccountName}, Account Number from ${selectUserResult[0].outside_bank_account_number} to ${bankAccountNumber}, Swift Code from ${selectUserResult[0].outside_bank_account_swift_code} to ${bankAccountSwiftCode}, Account Routing from ${selectUserResult[0].outside_bank_account_routing} to ${bankAccountRouting}, Address from ${selectUserResult[0].outside_bank_account_address} to ${bankAccountAddress}, City from ${selectUserResult[0].outside_bank_account_city} to ${bankAccountCity}, Zip Code from ${selectUserResult[0].outside_bank_account_zip_code} to ${bankAccountZipCode} and Country from ${selectUserResult[0].outside_bank_account_country} to ${country}`,
          //   { type: "user" }
          // );

          res.status(200).json({
            status: "success",
            message: "Payout detail updated successfully.",
          });
        }
      } else {
        res
          .status(400)
          .json({ status: "error", message: "Invalid payout type selected." });
      }
    }
  } catch (e) {
    if (debugging === "true") {
    }

    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/getpendingcomission", async (req, res) => {
  try {
    const postData = req.body;

    if (true) {
      const selectUserQuery = `SELECT * FROM usersdata WHERE usertype = ? and user_type = ?`;
      const selectUserResult = await Qry(selectUserQuery, [
        "user",
        "Distributor",
      ]);

      let resultsArray = [];

      const month = new Date().getMonth() + 1;

      for (let user of selectUserResult) {
        const userid = user.id;
        let new_data = await pendng_commission(userid, month);
        resultsArray.push({
          id: userid,
          username: user.username,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          totalPaymentEUR: new_data.totalPaymentEUR,
          totalPaymentUSD: new_data.totalPaymentUSD,
        });
      }

      res.json({
        status: "success",
        data: resultsArray,
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/getunpaidcomission", async (req, res) => {
  try {
    const postData = req.body;

    if (true) {
      const selectUserQuery = `SELECT id, username, firstname, lastname, email, current_balance_usd_payout, current_balance_eur_payout FROM usersdata WHERE usertype = ? and user_type = ?`;
      const selectUserResult = await Qry(selectUserQuery, [
        "user",
        "Distributor",
      ]);

      res.json({
        status: "success",
        data: selectUserResult,
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

//Update Connection
router.post("/updateconnection", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    const postData = req.body;
    if (authUser) {
      const userid = CleanHTMLData(CleanDBData(postData.userId));
      const connection = CleanHTMLData(CleanDBData(postData.connection));

      const updateQuery = await Qry(`UPDATE usersdata SET connection_type = ? WHERE id = ?`, [connection, userid])


      if (updateQuery.affectedRows > 0) {
        res.json({
          status: "success",
          message: "Connection updated successfully.",
        });
        return;
      } else {
        res.json({
          status: "error",
          message: "Faild to update connection.",
        });
      }
    }
  } catch (error) {
    console.error("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});


//update user data to chargebee api
router.get("/updatechargebeedata", async (req, res) => {
  try {
    // const postData = req.body;

    const selectUsersQuery = await Qry(`SELECT * FROM usersdata WHERE usertype = ? AND updated = ? LIMIT 10`, ['user', 'No']);

    for (const user of selectUsersQuery) {
      const {
        id,
        username,
        firstname,
        lastname,
        email,
        sponsorid,
        customerid
      } = user;

      const selectSponsorData = await Qry(
        `SELECT * FROM usersdata WHERE id = ?`,
        [sponsorid]
      );

      const sponsor = selectSponsorData[0];
      const sponsorUsername = sponsor?.username;
      const sponsorEmail = sponsor?.email;

      //Update Chargebee
      try {
        await chargebee.customer.update(customerid, {
          username: username,
          first_name: firstname,
          last_name: lastname,
          email: email,
          cf_username: username,
          cf_first_name: firstname,
          cf_last_name: lastname,
          cf_email: email,
          cf_sponsor_username: sponsorUsername,
          cf_sponsor_email: sponsorEmail
        }).request();

        await Qry(`UPDATE usersdata SET updated = 'Yes' WHERE id = ?`, [id])



      } catch (error) {
        console.error(`Error updating user ${username}:`, error);
      }

    }

    res.json({
      status: 'success',
      message: 'User data updated from chargbee api',
    })
  } catch (error) {
    console.error("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});


// Getting all users' total pending payments for the current month
router.post("/current-month-total-pending", async (req, res) => {
  try {
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      // Get all users from the database
      // const selectUsersQuery = await Qry(`SELECT * FROM usersdata LIMIT 20`);
      const queries = [
        Qry(`SELECT * FROM usersdata`),
        Qry(`SELECT * FROM transactions`),
        Qry(`SELECT * FROM unilevels`),
        Qry(`SELECT * FROM new_packages`),
      ];

      // Execute queries in parallel
      // const [usersdata, transactions, unilevels, new_packages] = await Promise.all(queries);

      const selectUsersQuery = await Qry(`SELECT * FROM usersdata where usertype = ? and user_type = ? and (subscription_status = 'Active' OR subscription_status = 'subscription_renewed' OR subscription_status = 'subscription_changed' OR subscription_status = 'payment_succeeded')`, ['user', 'Distributor']);
      const selectTransQuery = await Qry(`SELECT * FROM transactions`);
      const selectUniQuery = await Qry(`SELECT * FROM unilevels`);
      const selectNewQuery = await Qry(`SELECT * FROM new_packages`);

      const month = new Date().getMonth() + 1;

      // Initialize arrays to store the results for all users
      const usersPayments = [];
      let totalAmountUSD = 0;
      let totalAmountEUR = 0;

      // Send the response with the data for all users and the total amounts
      for (let user of selectUsersQuery) {
        const userid = user.id;
        const obj = await Grand_total_payment_function(userid, month, selectUsersQuery, selectTransQuery, selectUniQuery, selectNewQuery)

        // Extract USD and EUR amounts, defaulting to 0 if null/undefined
        const amountUSD = obj?.totalPaymentUSD || 0;
        const amountEUR = obj?.totalPaymentEUR || 0;
        if (amountUSD > 0 || amountEUR > 0) {
          const userPaymentObj = {
            userId: user.id,
            username: user.username,
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            amountUSD: amountUSD,
            amountEUR: amountEUR,
          };
          usersPayments.push(userPaymentObj);

          totalAmountUSD += amountUSD;
          totalAmountEUR += amountEUR;
        }
      }

      res.status(200).json({
        status: 'success',
        data: {
          users: usersPayments,
          totalAmountUSD,
          totalAmountEUR,
        }
      });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({
      status: "error",
      message: "Server error occurred"
    });
  }
});


//pending pay of all users
router.post("/pending-pay-of-all-users", async (req, res) => {
  try {
    // console.log('hicalling')
    const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token

    if (authUser) {

      const selectUsersQuery = await Qry(`
        SELECT username, firstname, lastname, email, current_balance_usd_payout, current_balance_eur_payout
        FROM usersdata 
        WHERE (current_balance_usd_payout != 0 OR current_balance_eur_payout != 0) and (subscription_status = 'Active' OR subscription_status = 'subscription_renewed' OR subscription_status = 'subscription_changed' OR subscription_status = 'payment_succeeded')
      `);

      let total_usd_pay = 0;
      let total_eur_pay = 0;
      for(let user of selectUsersQuery){
        total_usd_pay += user.current_balance_usd_payout;
        total_eur_pay += user.current_balance_eur_payout;
      }
      if (selectUsersQuery) {
        res.json({
          status: "success",
          data: selectUsersQuery,
          total_usd_pay: total_usd_pay,
          total_eur_pay: total_eur_pay
        });
        return;
      } else {
        res.json({
          status: "error",
          message: "Faild to Get Resources.",
        });
      }
    }
  } catch (error) {
    console.error("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

module.exports = router;
