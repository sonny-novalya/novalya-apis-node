const { FacebookProfileFeature, Sequelize } = require("../../Models");
const { checkAuthorization } = require("../../helpers/functions");
let self = {};
self.createOrUpdateFeature = async (req, res) => {
    try {
        const user_id = req.authUser;

        const {
            fb_user_id,
            fb_user_name,
            following,
            total_friends,
            total_followers,
            profile_image,
        } = req.body;

        let existingProfile = await FacebookProfileFeature.findOne({
            where: { user_id },
        });

        if (existingProfile) {
            existingProfile = await existingProfile.update({
                fb_user_id,
                fb_user_name,
                following,
                total_friends,
                followers: total_followers,
                profile_image,
            });
            existingProfile = await FacebookProfileFeature.findOne({
                where: { user_id },
            });
            res
                .status(200)
                .json({
                    status: "success",
                    data: existingProfile,
                    message: "Record updated successfully.",
                });
        } else {
            const newFacebookProfileFeature = await FacebookProfileFeature.create({
                fb_user_id,
                fb_user_name,
                following,
                total_friends,
                followers: total_followers,
                user_id,
                profile_image,
            });
            res
                .status(201)
                .json({
                    status: "success",
                    data: newFacebookProfileFeature,
                    message: "Record created successfully.",
                });
        }
    } catch (error) {
        res
            .status(500)
            .json({
                status: "error",
                message: "An error occurred while creating or updating the feature.",
            });
    }
};

self.getFollowersAndFollowings = async (req, res) => {
    try {
        const user_id = req.authUser;
        const { fb_user_id = null } = req.query;

        const facebookProfile = await FacebookProfileFeature.findOne({
            where: { user_id },
        });

        if (facebookProfile) {
            // const { followers, total_friends, following } = facebookProfile;
            res
                .status(200)
                .json({
                    status: "success",
                    data: facebookProfile,
                    message: "Total followers and followings retrieved successfully.",
                });
        } else {
            res
                .status(404)
                .json({
                    status: "error",
                    message: "Facebook profile feature not found for the insta user id.",
                });
        }
    } catch (error) {
        res
            .status(500)
            .json({
                status: "error",
                message:
                    "An error occurred while retrieving total followers and followings.",
                error: error.message,
            });
    }
};

self.getSingle = async (req, res) => {
    try {
        const user_id = req.authUser;

        let existingProfile = await FacebookProfileFeature.findOne({
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

self.deleteFacebookProfileFeature = async (req, res) => {
    try {
        const user_id = req.authUser;
        const result = await FacebookProfileFeature.destroy({
            where: {
                user_id: user_id,
            },
        });

        if (result) {
            res.status(200).json({
                status: "success",
                message: "Facebook profile feature deleted successfully.",
            });
        } else {
            res.status(404).json({
                status: "error",
                message: "Facebook profile feature not found.",
            });
        }
    } catch (error) {
        res.status(500).json({
            status: "error",
            error: error,
            message: "An error occurred while deleting the Facebook profile feature.",
            error: error.message,
        });
    }
};

module.exports = self;
