const {
  TargetFriendSettings,
  Group,
  MessageData,
  MessageSection,
  Section,
  Sequelize,
  Prospects,
  Novadata,
  Whitelist,
  Unfriend,
  Deactivated,
  Lost,
} = require("../../Models");
const db = require("../../Models/crm");
const Response = require("../../helpers/response");
const UploadImageOnS3Bucket = require("../../utils/s3BucketUploadImage");
const { getAuthUser, Qry} = require("../../helpers/functions");
const taggedusers = db.taggedusers;
const taggedUser = db.instataggedusers;
const Op = Sequelize.Op;
let self = {};


taggedUser.belongsTo(db.instatag, {
  foreignKey: 'is_primary',  // Reference to the `id` of the `tags` table
  as: 'tag',  // Alias for association
});

Novadata.hasOne(db.taggedusers, {
  foreignKey: 'fb_user_id',   // Ensuring correct key reference
  sourceKey: 'fbId',
  as: 'taggedusers',
});

// taggedusers belongs to a tag (fixing the incorrect foreign key)
db.taggedusers.belongsTo(db.tag, {
  foreignKey: 'is_primary',  // Correct reference to the `id` field of the `tags` table
  as: 'tag',
});

db.taggedusers.belongsTo(db.tag, {
  foreignKey: 'tag_id',  // Correct reference to the `id` field of the `tags` table
  as: 'assignTag',
});

self.createUnfollow = async (req, res) => {
  try {
    const user_id = req.authUser;
    const {
      type,
      fbId,
      user_name,
      gender,
      status,
      profile,
      image,
      lived,
      friendship_age,
      reactions,
      comments,
      tier,
      has_conversection,
      messages,
      Tag,
      Tag_id,
      rgb,isTagUpdate
    } = req.body;
    if (isTagUpdate) {
     
     
     
        const results =  Promise.all(fbId.map( (fb_id) => {
          return Novadata.update({  
            Tag: Tag,
            Tag_id: Tag_id,
            rgb: rgb}, {
            where: {
              user_id:{[Op.eq]: user_id,},
              fbId:{
                [Op.eq]: fb_id,
              } ,
            },
          });
        }));
    
        res.status(200).json({ status: "success", message: "Record Updated" , results});
      
      
      
      
    }else{
    Novadata.findOne({
      where: { user_id: user_id, fbId: fbId },
    })
      .then(async (record) => {
        if (record) {
      
            const newTargetFriendSetting = await Novadata.update(
              {
                status,
                user_name,
                gender,
                has_conversection,
                messages,
              },
              {
                where: { user_id: user_id, fbId: fbId },
              }
            );
            res
              .status(200)
              .json({ status: "success", message: "Record Updated" });
          
       
        } else {
          const result = await Novadata.create({
            user_id,
            type,
            fbId,
            status,
            user_name,
            gender,
            profile,
            image,
            lived,
            friendship_age,
            reactions,
            comments,
            tier,
            has_conversection,
            messages,
          });
          res
            .status(200)
            .json({ status: "success", message: "record created" });
        }
      })
      .catch((error) => {
        res.status(500).json({
          status: "error",
          message: "An error occurred while creating Prospect setting.",
        });
      });}
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while creating Prospect setting.",
    });
  }
};

self.createUnfollowNew = async (req, res) => {
  try {
    const user_id = req.authUser;
    const userDataArray = req.body;
    const folderName = "fb-novatdata"
    await Novadata.destroy({ where: { user_id: user_id } });

    // Use Promise.all to handle asynchronous operations for all user data
    await Promise.all(
      userDataArray.map(async (userData) => {
        const {
          id,
          name,
          image,
          url,
          gender,
          status,
          email,
          contact,
          lives,
          facebook,
          linkedIn,
          youTube,
          instagram,
          twitter,
          pinterest,
          reactions,
          comments,
          mutual_friend,
        } = userData;

        let imageId = `${id}-${user_id}`;
        let imageUrl = await UploadImageOnS3Bucket(image, folderName, imageId);
        const reactionsValue = reactions === "NA" ? null : parseInt(reactions);
        if (status == 0) {
          await Novadata.create({
            user_id,
            fbId: id,
            status,
            user_name: name,
            gender,
            profile: url,
            image: imageUrl,
            contact,
            lived: lives,
            email,
            facebook,
            linkedIn,
            youTube,
            instagram,
            twitter,
            pinterest,
            reactions: reactionsValue,
            comments,
            mutual_friend,
          });
        } else {
          await Deactivated.create({
            user_id,
            fbId: id,
            status,
            user_name: name,
            gender,
            profile: url,
            image: imageUrl,
            contact,
            lived: lives,
            email,
            facebook,
            linkedIn,
            youTube,
            instagram,
            twitter,
            pinterest,
            reactions,
            comments,
            mutual_friend,
          });
        }
      })
    );

    res
      .status(200)
      .json({ status: "success", message: "Records Updated or Created" });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while processing the request.",
      error: error.message,
    });
  }
};

self.getAllUnfollow = async (req, res) => {
  try {
    const user_id = req.authUser;

    if (!user_id) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

  

    const { page = 1, limit = 25 } = req.query;
    const offset = (page - 1) * limit;
    const limitValue = parseInt(limit, 10);
    const whereOptions = user_id ? { user_id: user_id } : {};
    const totalCount = await Novadata.count({ where: whereOptions });


    if (limitValue === 11) {
    const groups = await Novadata.findAll({
      where: whereOptions,
      order: [["id", "DESC"]],
    });

    res.status(200).json({
      status: "success",
      data: groups,
      totalCount:totalCount,
      currentPage: 1,
      totalPages: 1,
    });
    }else{
      const groups = await Novadata.findAll({
        where: whereOptions,
        offset: offset,
        limit: limitValue,
        order: [["id", "DESC"]],
      });
  
      res.status(200).json({
        status: "success",
        data: groups,
        totalCount: parseInt(totalCount),
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limitValue),
      });
    }

   
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: error.message || "An error occurred" });
  }
};

self.getFbFriendsWithTags = async (req, res) => {
  try {

    const user_id = req.authUser;
    if (!user_id) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    // Extract pagination and sorting
    const { page = 1, limit = 25, sort = "DESC", field = "id", search} = req.query;
    const offset = (page - 1) * limit;
    const limitValue = parseInt(limit, 10);
    let plan_pkg = null;

    // Validate pagination
    if (page < 1 || limitValue < 1) {
      return res.status(400).json({ status: "error", message: "Invalid page or limit" });
    }

    // Validate sorting fields
    const validFields = ["id", "name", "createdAt"];
    const orderField = validFields.includes(field) ? field : "id";
    const orderSort = (sort === "ASC" || sort === "DESC") ? [orderField, sort] : ["id", "DESC"];
    const whereOptions = user_id ? { user_id: user_id } : {};

    if (search) {
      whereOptions[Op.or] = [
        { user_name: { [Op.like]: `%${search}%` } }
      ];
    }

    const totalCount = await Novadata.count({ where: whereOptions });
    // Fetch count and records
    const rows = await Novadata.findAll({
      where: whereOptions,
      offset: offset,
      limit: limitValue,
      order: [orderSort],
      include: [
        {
          model: db.taggedusers,
          as: 'taggedusers',
          attributes: ["tag_id"],
          required: false, // LEFT JOIN
          include: [
            {
              model: db.tag,
              as: 'assignTag',
              attributes: ['id', 'name', 'custom_color'],
            },
          ],
          where: {
            fb_user_id: Sequelize.col("Novadata.fbId"), // Ensure fb_user_id matches Novadata.fbId
            user_id: user_id,
          },
        },
      ],
      group: ['Novadata.fbId', 'taggedusers.is_primary'],
    });

    if(page == 1){
      const userSelectQuery = `SELECT plan_pkg FROM usersdata WHERE id = ?`;

      const userSelectParams = [user_id];
      const userSelectResult = await Qry(userSelectQuery, userSelectParams);
      plan_pkg = userSelectResult[0].plan_pkg;

    }

    // Return response
    return Response.resWith202(
      res,
      "Opration completed",
      {
        data: rows,
        plan_pkg: plan_pkg,
        totalCount: totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limitValue)
      }
    );

  } catch (error) {
    return Response.resWith422(res, error.message);

  }
};

self.getFbNovaData = async (req, res)=>{
  try{
    const user_id = req.authUser;
    const {selected_users} = req.body

    if (!user_id) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    if(selected_users.length > 0){
      const novaUsers = await Novadata.findAll({
        where: { user_id: user_id, id: selected_users},
        attributes: ['id', 'user_id', 'fbId', 'status', 'user_name', 'gender', 'profile', 'image']
      });

      // Extract fbIds from fetched users
      const fbIds = novaUsers.map(user => user.fbId);
      
      // Step 2: Check for matches in taggedUsers
      const taggedUsers = await taggedusers.findAll({
        where: { user_id: user_id, fb_user_id: fbIds },
        attributes: ['fb_user_id', 'fb_user_e2ee_id']
      });

      // Create a lookup for fb_user_id -> fb_user_e2ee_id
      const fbIdToE2eeIdMap = {};
      taggedUsers.forEach(taggedUser => {
        fbIdToE2eeIdMap[taggedUser.fb_user_id] = taggedUser.fb_user_e2ee_id;
      });

      // Step 3: Attach e2ee_id to each NovaData user
      const finalResult = novaUsers.map(user => ({
        ...user.toJSON(), // Convert Sequelize object to plain JSON
        e2ee_id: fbIdToE2eeIdMap[user.fbId] || null // Assign e2ee_id or null
      }));

      // Send response
      res.status(200).json({ status: "success", data: finalResult });

    }else{
      res.status(500).json({ status: "error", message: "Please provide user id" });
    }

  }catch(error){
    res.status(500).json({ status: "error", message: error });
  }
}

self.getAllWhitelist = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { page = 1, limit = 50, orderBy = "desc", search} = req.query;
    const offset = (page - 1) * limit;
    const whereOptions = user_id ? { user_id: user_id } : {};

    if (search) {
      whereOptions[Op.or] = [
        { user_name: { [Op.like]: `%${search}%` } }
      ];
    }

    const fetchParams = {
      where: whereOptions,
      order: [["id", orderBy === "desc" ? "DESC" : "ASC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    };

    const totalWhitelist = await Whitelist.count({ where: whereOptions });
    const groups = await Whitelist.findAll(fetchParams);
  
    return Response.resWith202(res,
      "whitelist success",
      {
        data: groups,
        totalCount: totalWhitelist,
        totalPages: Math.ceil(totalWhitelist / limit),
        currentPage: page,
      }
    );
  } catch (error) {
    return Response.resWith422(res, error.message);
  }
};

self.getAllUnfriendlist = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { page = 1, limit = 50, orderBy = "desc", search} = req.query;
    const offset = (page - 1) * limit;
    const whereOptions = user_id ? { user_id: user_id } : {};

    if (search) {
      whereOptions[Op.or] = [
        { user_name: { [Op.like]: `%${search}%` } },
        { lived: { [Op.like]: `%${search}%` } },
      ];
    }

    const fetchParams = {
      where: whereOptions,
      order: [["id", orderBy === "desc" ? "DESC" : "ASC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    };

    const totalUnfriends = await Unfriend.count({ where: whereOptions });
    const groups = await Unfriend.findAll(fetchParams);

    return Response.resWith202(
      res, "Opration completed",
      {
        data: groups,
        totalCount: totalUnfriends,
        totalPages: Math.ceil(totalUnfriends / limit),
        currentPage: page,
      }
    );
  } catch (error) {
    return Response.resWith422(res, error.message);
  }
};

self.getAllLostlist = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { page = 1, limit = 50, orderBy = "desc" } = req.query;
    const offset = (page - 1) * limit;
    const whereOptions = user_id ? { user_id: user_id } : {};
    const fetchParams = {
      where: whereOptions,
      order: [["id", orderBy === "desc" ? "DESC" : "ASC"]],
    };

    const groups = await Lost.findAll(fetchParams);
    res.status(200).json({ status: "success", data: groups });
  } catch (error) {
    res.status(500).json({ status: "error", message: error });
  }
};

self.getAllDeactivated = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { page = 1, limit = 50, orderBy = "desc", search } = req.query;
    const offset = (page - 1) * limit;
    const whereOptions = user_id ? { user_id: user_id } : {};

    if (search) {
      whereOptions[Op.or] = [
        { user_name: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const fetchParams = {
      where: whereOptions,
      order: [["id", orderBy === "desc" ? "DESC" : "ASC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    };

    const totalGroups = await Deactivated.count({ where: whereOptions });
    const groups = await Deactivated.findAll(fetchParams);
    // res.status(200).json({ status: "success", data: groups });
    return Response.resWith202(res,
      "Deactivate success", 
      {
        data: groups,
        totalCount: totalGroups,
        totalPages: Math.ceil(totalGroups / limit),
        currentPage: page,
      }
    );
  } catch (error) {
    return Response.resWith422(res, error.message);
  }
};

self.getUnfriendlist = async (req, res) => {
  try {
    const user_id = req.authUser;

    const {
      type,
      fbId,
      user_name,
      gender,
      status,
      profile,
      image,
      lived,
      userIds,
    } = req.body;
    Novadata.findAll({
      where: {
        user_id: user_id,
        id: {
          [Op.in]: userIds,
        },
      },
    })
      .then(async (records) => {
        if (records) {
          res.status(200).json({ status: "success", data: records });
        }
      })
      .catch((error) => {
        res.status(500).json({ status: "error", message: error });
      });
  } catch (error) {
    res.status(500).json({ status: "error", message: error });
  }
};

self.getDeactivatedlist = async (req, res) => {
  try {
    const user_id = req.authUser;

    const {
      type,
      fbId,
      user_name,
      gender,
      status,
      profile,
      image,
      lived,
      userIds,
    } = req.body;
    Deactivated.findAll({
      where: {
        user_id: user_id,
        id: {
          [Op.in]: userIds,
        },
      },
    })
      .then(async (records) => {
        if (records) {
          res.status(200).json({ status: "success", data: records });
        }
      })
      .catch((error) => {
        res.status(500).json({ status: "error", message: error });
      });
  } catch (error) {
    res.status(500).json({ status: "error", message: error });
  }
};

self.removeWhitelist = async (req, res) => {
  try {
    const user_id = req.authUser;

    const { ids } = req.body;

    Whitelist.destroy({
      where: {
        user_id: user_id,
        id: {
          [Op.in]: ids,
        },
      },
    })
      .then((rowsDeleted) => {
        return Response.resWith202(res, "Record deleted", {});
      })
      .catch((error) => {
        return Response.resWith422(res, error.message);
      });
  } catch (error) {
    return Response.resWith422(res, error.message);
  }
};

self.saveUnfriendlist = async (req, res) => {
  try {
    const user_id = req.authUser;

    const {
      id,
      type,
      fbId,
      status,
      user_name,
      gender,
      profile,
      image,
      lived,
      friendship_age,
      reactions,
      comments,
      has_conversection,
      tier,
      messages,
      mutual_friend
    } = req.body;
    const result = await Unfriend.create({
      user_id,
      type,
      fbId,
      status,
      user_name,
      gender,
      profile,
      image,
      lived,
      friendship_age,
      reactions,
      comments,
      tier,
      has_conversection,
      messages,
      mutual_friend
    });
    await Novadata.destroy({ where: { id: id } }); // Delete existing types
    return Response.resWith202(res, "record created", {});
  } catch (error) {
    return Response.resWith422(res, error.message);
  }
};

self.deleteDeactivated = async (req, res) => {
  try {
    const user_id = req.authUser;

    const {
      id,
      type,
      fbId,
      status,
      user_name,
      gender,
      profile,
      image,
      lived,
      friendship_age,
      reactions,
      comments,
      has_conversection,
      tier,
      messages,
    } = req.body;
    await Deactivated.destroy({ where: { id: id } }); // Delete existing types
    res.status(200).json({ status: "success", message: "record delete" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error });
  }
};

self.saveWhitelist = async (req, res) => {
  try {
    const user_id = req.authUser;

    const {
      type,
      fbId,
      user_name,
      gender,
      status,
      profile,
      image,
      lived,
      ids,
    } = req.body;
    Novadata.findAll({
      where: {
        user_id: user_id,
        id: {
          [Op.in]: ids,
        },
      },
    })
      .then(async (records) => {
        if (records) {
          if (records.length > 0) {
            // If there are records in the array, you might want to loop through them
            records.forEach(async (record) => {
              try {
                const existingWhitelistRecord = await Whitelist.findOne({
                  where: {
                    user_id: record.user_id,
                    fbId: record.fbId,
                  },
                });
                if (!existingWhitelistRecord) {
                  // Create a new record in the Whitelist table
                  await Whitelist.create({
                    user_id: record.user_id,
                    fbId: record.fbId,
                    status: record.status,
                    user_name: record.user_name,
                    gender: record.gender,
                    profile: record.profile,
                    mutual_friends: record.mutual_friend,
                    image: record.image,
                    lived: record.lived,
                    friendship_age: record.friendship_age,
                    reactions: record.reactions,
                    comments: record.comments,
                    tier: record.tier,
                    has_conversection: record.has_conversection,
                    messages: record.messages,
                  });
                }
              } catch (error) {
                return Response.resWith422(res, error.message);
              }
            });
          }
        }
        return Response.resWith202(res, "User whitelisted", {});
      })
      .catch((error) => {
        return Response.resWith422(res, error.message);
      });
  } catch (error) {
    return Response.resWith422(res, error.message);
  }
};

module.exports = self;