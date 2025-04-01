const express = require("express");
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
require("dotenv").config();
const encryptionKey = process.env.KEY;
const {
  Qry,
  checkAuthorization,
  randomToken,
} = require("../helpers/functions");
const secretKey = process.env.jwtSecretKey;
const db = require("../Models/crm");
// const { Model } = require("sequelize");
const taggedUser = db.taggedusers;
const tagModel = db.tag;
const { Sequelize } = require("../Models/crm");
const {  Novadata } = require("../Models");
const { where } = require("sequelize");
const Op = Sequelize.Op;

const backoffice_link = "https://novalyabackend.threearrowstech.com/";
const weblink = "https://dashboard.novalya.com/";
const emailImagesLink =
  "https://threearrowstech.com/projects/gdsg/public/images/email-images/";
const noreply_email = "noreply@threearrowstech.com";
const company_name = "Novalya";

// Create a multer middleware for handling the file upload
const upload = multer();

router.post("/fetch-group", async (req, res) => {
  const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token

  if (authUser) {
    const messagesSelect = await Qry(
      `SELECT * FROM groups WHERE user_id = '${authUser}'`
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
  } else {
    res.status(401).json({ status: "error", message: "Invalid User." });
  }
});

router.post("/segment-message", async (req, res) => {
  const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token

  if (authUser) {
    const messagesSelect = await Qry(
      `SELECT * FROM segment_message WHERE user_id = '${authUser}'`
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
  } else {
    res.status(401).json({ status: "error", message: "Invalid User." });
  }
});

router.post("/taggeduser-api", async (req, res) => {
  const {
    type,
    fb_user_id,
    fb_user_alphanumeric_id,
    fb_image_id,
    fb_name,
    profile_pic,
    is_primary,
  } = req.body;
  var { tag_id } = req.body;
 
  const user_id = await checkAuthorization(req, res);

  if (type == "add") {
    if (
      !fb_user_id ||
      !fb_user_alphanumeric_id ||
      !fb_image_id ||
      !fb_name ||
      !profile_pic ||
      !is_primary ||
      !tag_id ||
      !Array.isArray(tag_id)
    ) {
      return res.status(400).json({ error: "Missing or invalid parameters" });
    }

    tag_id = tag_id.join(", ");

    // Create a new tagged user object
    const taggedUserData = {
      user_id,
      fb_user_id,
      fb_user_alphanumeric_id,
      fb_image_id,
      fb_name,
      profile_pic,
      is_primary,
      tag_id,
    };

    taggedUser
      .findOne({
        where: {
          user_id: user_id,
        },
      })
      .then(async (record) => {
        if (record) {
          const newTaggedUser = await taggedUser.update(
            {
              fb_user_id,
              fb_user_alphanumeric_id,
              fb_image_id,
              fb_name,
              profile_pic,
              is_primary,
              tag_id,
            },
            {
              where: { user_id },
            }
          );
          taggedUser
            .findOne({
              where: {
                user_id: user_id,
              },
            })
            .then(async (record) => {
              return res.status(200).json({ status: "success", data: record });
            });
        } else {
          const result = await taggedUser.create(taggedUserData);
          return res
            .status(200)
            .json({
              status: "success",
              data: result,
              message: "tagged user created successfully",
            });
        }
      })
      .catch((error) => {
        return res
          .status(500)
          .json({
            status: "error",
            message: "Error creating send request message",
            error: error.message,
          });
      });

    // Add the tagged user to the database
    // const newtaggedUser = await taggedUser.create(taggedUserData);
    // return res.status(200).json({ status: 'success', data: newtaggedUser });
  }

  const tags = await tagModel.findAll();

  if (type == "single_get") {
    // Find the Facebook user by fb_user_id

    taggedUser
      .findAll({
        where: {
          fb_user_id: fb_user_id,
        },
      })
      .then(async (record) => {
        if (record) {
          // Attach the tags data to each tagged user based on the tag_id
          const taggedUsersWithTags = record.map((user) => {
            // Split the comma-separated tag_ids of the user
            const userTagIds = user.tag_id
              .split(",")
              .map((tagId) => tagId.trim());

            // Find the corresponding tags for the user's tag_ids
            const userTags = tags.filter((tag) =>
              userTagIds.includes(tag.id.toString())
            );

            // Attach the tags to the user object
            return {
              ...user.toJSON(),
              tags: userTags,
            };
          });
          return res
            .status(200)
            .json({
              status: "success",
              message: "tagged user fetched successfully",
              data: taggedUsersWithTags,
            });
        }
      })
      .catch((error) => {
        res
          .status(500)
          .json({
            status: "error",
            message: "An error occurred while fetching.",
          });
      });

    // return res.status(200).json({ tagged });
  }

  if (type == "get") {
    try {
      // Find the Facebook user by fb_user_id
      const records = await taggedUser.findAll({
        where: {
          user_id: user_id,
          tag_id: {
            [Op.notIn]: ["", "0"],
            [Op.ne]: null,
          },
        },
      });
  
      if (!records || records.length === 0) {
        const allRecords = await Novadata.findAll({where: {user_id: user_id}})

        if(allRecords.length === 0){
          return res.status(200).json({
            status: "success",
            message: "No tagged users found.",
            data: []
          });
        }

        return res.status(200).json({
          status: "success",
          message: "Tagged user fetched successfully",
          data: allRecords
        });
        
      }
  
      const taggedUsersWithTags = await Promise.all(
        records.map(async (user) => {
          if (user.tag_id && typeof user.tag_id === "string") {
            const userTagIds = user.tag_id.split(",").map((tagId) => tagId.trim());
            const userTags = await tagModel.findAll({
              where: {
                id: { [Op.in]: userTagIds },
              },
            });
            return {
              ...user.toJSON(),
              tags: userTags
            };
          } else {
            return user.toJSON();
          }
        })
      );
  
      return res.status(200).json({
        status: "success",
        message: "Tagged user fetched successfully",
        data: taggedUsersWithTags,
      });
    } catch (error) {
      // console.error("Error fetching tagged users:", error.message);
      return res.status(500).json({
        status: "error",
        message: "An error occurred while fetching tagged users.",
        error: error.message,
      });
    }
  }
});

// Add more routes as needed

module.exports = router;
