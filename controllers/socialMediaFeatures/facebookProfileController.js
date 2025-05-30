const { FacebookProfileFeature, InstagramProfileFeature, Sequelize 
} = require("../../Models");
const db = require("../../Models/crm");
const Statistic = db.Statistic;
const taggedusers = db.taggedusers;
const instataggedusers = db.instataggedusers;
const { checkAuthorization, Qry } = require("../../helpers/functions");
const { Op, fn, col, literal } = require("sequelize");
const moment = require("moment");

const { tag } = require("../../Models/crm");
let tagsTable = tag;
let instaGramTag = db.instatag;

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
            is_verified_acc	,
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
                is_verified_acc: typeof is_verified_acc !== "undefined" ? Boolean(Number(is_verified_acc)) : false,
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
                is_verified_acc: typeof is_verified_acc !== "undefined" ? Boolean(Number(is_verified_acc)) : false,
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

self.getDashboardSocialAccountData = async (req, res) => {
    
    try {

        const user_id = req.authUser;
        const {type = null } = req.query;

        var facebookProfile = {};
        var instagramProfile = {};

        facebookProfile = await FacebookProfileFeature.findOne({ where: { user_id }});

        instagramProfile = await InstagramProfileFeature.findOne({ where: { user_id } });

        if(type == "extension"){
            return res.status(200).json({
                status: "success",
                data: {
                    facebook_data: facebookProfile,
                    instagram_data: instagramProfile
                },
                message: "data get successfully.",
            });
        }
        

        const startOfMonth = moment().startOf("month").toDate();
        const endOfMonth = moment().endOf("month").toDate();

        const statistics = await Statistic.findAll({
            where: {
                user_id: user_id,
                created_at: {
                [Op.between]: [startOfMonth, endOfMonth],
                },
            },
            attributes: [
                [fn("SUM", literal("CASE WHEN type IN ('fb_prospection', 'birthday', 'requests') THEN message_count ELSE 0 END")), "fbMessageLimit"],
                [fn("SUM", literal("CASE WHEN type = 'ig_prospection' THEN message_count ELSE 0 END")), "igMessageLimit"],
                [fn("SUM", literal("CASE WHEN type IN ('fb_crm', 'ig_crm') THEN message_count ELSE 0 END")), "tagsLimit"],
                [fn("SUM", literal("CASE WHEN type IN ('ig_ai', 'fb_ai') THEN message_count ELSE 0 END")), "aiLimits"],
            ],
            raw: true, 
        });

        const totalFbContact = await taggedusers.count({
            where: {
                    user_id: user_id,
                    createdAt: {
                    [Op.between]: [startOfMonth, endOfMonth],
                },
            },
        });

        const totalInstaContact = await instataggedusers.count({
            where: {
                    user_id: user_id,
                    createdAt: {
                    [Op.between]: [startOfMonth, endOfMonth],
                },
            },
        });

        const totalContactLimit = totalFbContact + totalInstaContact;

        var tagFBAiLimit = tagsTable.findAll({ where: { user_id } });
        var tagIGAiLimit = instaGramTag.findAll({ where: { user_id } });
        var final_ai_limit = tagFBAiLimit.length + tagIGAiLimit.length;


        const limit_response = {
            fbMessageLimit: statistics[0]?.fbMessageLimit || 0,
            igMessageLimit: statistics[0]?.igMessageLimit || 0,
            tagsLimit: statistics[0]?.tagsLimit || 0,
            // aiLimits: statistics[0]?.aiLimits || 0,
            aiLimits: final_ai_limit || 0,
            totalContactLimit,
        };

        const userSelectQuery = `SELECT extension_version from account_settings limit 1`;

        const userSelectParams = [];
        const userSelectResult = await Qry(userSelectQuery, userSelectParams);

        return res.status(200).json({
            status: "success",
            data: {
                facebook_data: facebookProfile,
                instagram_data: instagramProfile,
                limit_data: limit_response,
                app_config: (userSelectResult) ? userSelectResult[0]: {},
            },
            message: "data get successfully.",
        });
        
    } catch (error) {
        console.log('error-181', error);
        return res.status(500).json({
            status: "error",
            message: "some went wrong",
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
