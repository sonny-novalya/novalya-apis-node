const express = require("express");
const app = express();
const multer = require("multer");
const path = require("path");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto-js");
const fs = require("fs");
const {
  CleanHTMLData,
  CleanDBData,
} = require("../../config/database/connection");
const transporter = require("../../config/mail/mailconfig");
const { Reseller, UsersData, Sequelize } = require("../../Models");
const Response = require("../../helpers/response");

require("dotenv").config();
const encryptionKey = process.env.KEY;
const {
  Qry,
  checkAuthorization,
  randomToken,
} = require("../../helpers/functions");
const secretKey = process.env.jwtSecretKey;

// Create a multer middleware for handling the file upload
const upload = multer();

const auth = {
  getListing: async (req, res) => {
    try {
      var user = req.user;
      var body = req.body;
      // const data = await Qry(`SELECT * FROM resellers WHERE status=1'`, []);

      const data = await UsersData.findAll({
        where: { usertype: "reseller" },
        attributes: { exclude: ["password"] }, // Exclude the 'password' attribute from the result
      });

      if (data) {
        return res
          .status(200)
          .json({ status: true, message: "listing", data: data });
      } else {
        return res
          .status(200)
          .json({ status: true, message: "listing", data: [] });
      }
    } catch (err) {
      return res
        .status(200)
        .json({ status: true, message: "listing", data: [] });
    }
  },

  addNew: async (req, res) => {
    try {
      var user = req.user;
      var body = req.body;

      const {
        company_name,
        first_name,
        last_name,
        email,
        username,
        phone,
        company_address,
        password,
        website,
        brand_color,
        allowedroutes,
      } = req.body;

      const checkAlready = await UsersData.findOne({
        where: { email: email },
        attributes: ["id", "email"],
      });

      if (checkAlready) {
        return Response.resWith422(res, "This email is already exists");
      }

      const checkUser = await UsersData.findOne({
        where: { username: username },
        attributes: ["id", "username"],
      });

      if (checkUser) {
        return Response.resWith422(res, "This username is already exists");
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

      // this is for image
      var filename = "";
      let myCompanyLogo = "";
      if (req.body.image) {
        const uploadDir = path.join(
          __dirname,
          "../../public/uploads/userprofile/"
        );
        const imageParts = req.body.image.split(";base64,");
        const imageTypeAux = imageParts[0].split("image/");
        const imageType = imageTypeAux[1];
        const imageBase64 = Buffer.from(imageParts[1], "base64");

        var filename = `${Date.now()}.png`;
        const filePath = path.join(uploadDir, filename);

        myCompanyLogo = await fs.promises.writeFile(filePath, imageBase64);
      }

      let profileImg = "";
      let myProfileImage = "";
      if (req.body.profileImage) {
        const uploadDir = path.join(
          __dirname,
          "../../public/uploads/userprofile/"
        );
        const imageParts = req.body.profileImage.split(";base64,");
        const imageTypeAux = imageParts[0].split("image/");
        const imageType = imageTypeAux[1];
        const imageBase64 = Buffer.from(imageParts[1], "base64");

        profileImg = `${Date.now()}.png`;
        const filePath = path.join(uploadDir, profileImg);

        myProfileImage = await fs.promises.writeFile(filePath, imageBase64);
      }

      let favIcon = "";
      let myFavIcon = "";
      if (req.body.favIconImage) {
        const uploadDir = path.join(
          __dirname,
          "../../public/uploads/userprofile/"
        );
        const imageParts = req.body.favIconImage.split(";base64,");
        const imageTypeAux = imageParts[0].split("image/");
        const imageType = imageTypeAux[1];
        const imageBase64 = Buffer.from(imageParts[1], "base64");

        favIcon = `${Date.now()}.png`;
        const filePath = path.join(uploadDir, favIcon);

        myFavIcon = await fs.promises.writeFile(filePath, imageBase64);
      }

      var create_data = {
        company: company_name,
        firstname: first_name,
        lastname: last_name,
        email: email,
        username: username,
        password: encryptedPassword,
        mobile: phone,
        address1: company_address,
        usertype: "reseller",
        status: "Approved",
        randomcode: "",
        sponsorid: "",
        l2_sponsorid: "",
        leg_position: "",
        country: "",
        bank_account_country: "",
        bank_account_iban: "",
        bank_account_bic: "",
        withdrawal_status: 0,
        address2: "",
        zip_code: "",
        city: "",
        masked_number: "",
        left_referral_points: 0,
        total_left_referral_points: 0,
        total_right_referral_points: 0,
        birth_date: "",
        total_direct_active_left_members: 0,
        total_direct_active_right_members: 0,
        right_referral_points: 0,
        allowedroutes: allowedroutes,
        picture: filename ? filename : "",
        website: website ? website : "",
        brand_color: brand_color ? brand_color : "",
        admin_logo: profileImg ? profileImg : "",
        fav_icon: favIcon ? favIcon : "",
      };

      const create = await UsersData.create(create_data);

      return Response.resWith202(res, "create new successfully");
    } catch (err) {
      return Response.resWith422(res, err.message);
    }
  },

  updateStatus: async (req, res) => {
    try {
      var user = req.user;
      var body = req.body;

      const { id, status } = req.body;

      const checkAlready = await UsersData.findOne({ where: { id: id } });

      if (!checkAlready) {
        return Response.resWith422(res, "Reseller does not exists");
      }

      if (status == 1) {
        var new_status = "Approved";
      } else {
        var new_status = "Deactivate";
      }
      const update_data = {
        status: new_status,
      };

      const update = await UsersData.update(update_data, {
        where: { id: id },
      });

      return Response.resWith202(res, "update successfully");
    } catch (err) {
      return Response.resWith422(res, err.message);
    }
  },

  delete: async (req, res) => {
    try {
      var user = req.user;
      var body = req.body;

      const { id } = req.body;

      const checkAlready = await UsersData.findOne({ where: { id: id } });

      if (!checkAlready) {
        return Response.resWith422(res, "Reseller does not exists");
      }

      const update_data = {
        status: "deleted",
      };

      const update = await UsersData.update(update_data, {
        where: { id: id },
      });

      return Response.resWith202(res, "Delete successfully");
    } catch (err) {
      return Response.resWith422(res, err.message);
    }
  },

  getDetails: async (req, res) => {
    try {
      var user = req.user;
      var body = req.body;

      const { id } = req.body;

      const checkAlready = await UsersData.findOne({
        where: { id: id },
        attributes: { exclude: ["password"] },
      });

      if (!checkAlready) {
        return Response.resWith422(res, "Reseller does not exists");
      }

      if (checkAlready) {
        return res
          .status(200)
          .json({ status: true, message: "details", data: checkAlready });
      } else {
        return res
          .status(200)
          .json({ status: true, message: "details", data: {} });
      }
    } catch (err) {
      return res
        .status(200)
        .json({ status: true, message: "details", data: {} });
    }
  },

  updateProfile: async (req, res) => {
    try {
      var user = req.user;
      var body = req.body;

      const { id, first_name, last_name, phone, company_address } = req.body;

      const checkAlready = await UsersData.findOne({
        where: { id: id, usertype: "reseller" },
      });

      if (!checkAlready) {
        return Response.resWith422(res, "Reseller does not exists");
      }

      var update_data = {
        firstname: first_name,
        lastname: last_name,
        mobile: phone,
        address1: company_address,
      };

      const update = await UsersData.update(update_data, {
        where: { id: id },
      });

      return Response.resWith202(res, "profile update successfully");
    } catch (err) {
      return Response.resWith422(res, err.message);
    }
  },

  editReseller: async (req, res) => {
    try {
      var user = req.user;
      var body = req.body;
      const messagesSelect = await Qry(
        `SELECT * FROM groups WHERE user_id = '${user.id}'`
      );

      if (messagesSelect.length > 0) {
        const messagesArray = { enteries: messagesSelect };
        return res.status(200).json({ status: "success", data: messagesArray });
      } else {
        const messagesArray = {
          enteries: [{ id: 1, type: "empty", details: "no new message" }],
        };
        return res.status(200).json({ status: "success", data: messagesArray });
      }
    } catch (err) {
      const messagesArray = {
        enteries: [{ id: 1, type: "empty", details: "no new message" }],
      };
      return res.status(200).json({ status: "success", data: messagesArray });
    }
  },

  checkDomainExist: async (req, res) => {
    try {
      var user = req.user;
      var body = req.body;

      const { name } = req.body;

      const checkAlready = await UsersData.findOne({
        where: { website: name },
      });

      if (checkAlready) {
        return Response.resWith422(res, "Domain already exists");
      } else {
        return res
          .status(200)
          .json({ status: true, message: "Domain available" });
      }
    } catch (err) {
      return res.status(200).json({ status: true, message: err.message });
    }
  },
};

module.exports = auth;
