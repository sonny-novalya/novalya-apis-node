const { InstagramProfileFeature, Sequelize } = require("../../Models");
const { checkAuthorization } = require("../../helpers/functions");
let self = {};

self.createOrUpdateFeature = async (req, res) => {
    try {
        const user_id = req.authUser;
        const { insta_user_id, insta_numeric_id, insta_user_name, following, total_followers, is_verified_acc, profile_image ,posts} = req.body;

        let existingProfile = await InstagramProfileFeature.findOne({ where: { user_id } });

        if (existingProfile) {
            existingProfile = await existingProfile.update({
                insta_user_id,
                insta_numeric_id,
                insta_user_name,
                following,
                total_followers,
                is_verified_acc: typeof is_verified_acc !== "undefined" ? Boolean(Number(is_verified_acc)) : false,
                profile_image,
                posts
            });
            existingProfile = await InstagramProfileFeature.findOne({ where: { user_id } });
            res.status(200).json({ status: 'success', data: existingProfile, message: 'Record updated successfully.' });
        } else {
            const newInstagramProfileFeature = await InstagramProfileFeature.create({
                insta_user_id,
                insta_numeric_id,
                insta_user_name,
                following,
                total_followers,
                is_verified_acc: typeof is_verified_acc !== "undefined" ? Boolean(Number(is_verified_acc)) : false,
                user_id,
                profile_image,
                posts
            });
            res.status(201).json({ status: 'success', data: newInstagramProfileFeature, message: 'Record created successfully.' });
        }
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'An error occurred while creating or updating the feature.' });
    }
};

self.syncFeature = async (req, res) => {
    try {
        const { id, follower } = req.body;

        let existingProfile = await InstagramProfileFeature.findOne({ where: { id } });

        if (existingProfile) {
            existingProfile = await existingProfile.update({
                total_followers: follower,
            });
            res.status(200).json({ status: 'success', data: existingProfile, message: 'Group members sync successfully' });
        } else {
            res.status(400).json({ status: 'error', message: 'No record found for this id' });
        }
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'An error occurred while syncing Group members.', error: error.message });
    }
};

self.getFollowersAndFollowings = async (req, res) => {
    try {

        const user_id = req.authUser;
        const { insta_user_id = null } = req.query;

        const instagramProfile = await InstagramProfileFeature.findOne({ where: { user_id } });

        if (instagramProfile) {
            // const { total_followers, following } = instagramProfile;
            res.status(200).json({ status: 'success', data: instagramProfile, message: 'Total followers and followings retrieved successfully.' });
        } else {
            res.status(404).json({ status: 'error', message: 'Instagram profile feature not found for the insta user id.' });
        }
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'An error occurred while retrieving total followers and followings.', error: error.message });
    }
};

self.getSingle = async (req, res) => {
  try {
    const user_id = req.authUser;

    let existingProfile = await InstagramProfileFeature.findOne({
      where: { user_id },
    });

    if (existingProfile) {
      res.status(200).json({
        status: "success",
        data: existingProfile,
        message: "Record fetched successfully.",
      });
    } else {
      res.status(200).json({
        status: "success",
        data: existingProfile,
        message: "No Record found.",
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error.message,
      message: "An error occurred while creating or updating the feature.",
    });
  }
};

self.deleteInstagramProfileFeature = async (req, res) => {
    try {
        const user_id = req.authUser;

        const result = await InstagramProfileFeature.destroy({
            where: {
                user_id,
            },
        });

        if (result) {
            res.status(200).json({
                status: "success",
                message: "Instagram profile feature deleted successfully.",
            });
        } else {
            res.status(404).json({
                status: "error",
                message: "Instagram profile feature not found.",
            });
        }
    } catch (error) {
        res.status(500).json({
            status: "error",
            message:
                "An error occurred while deleting the Instagram profile feature.",
            error: error.message,
        });
    }
};


module.exports = self