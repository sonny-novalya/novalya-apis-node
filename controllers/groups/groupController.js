const { Group, Sequelize, ProspectionGrpFolders, TargetFriendSettings } = require("../../Models");
const UploadImageOnS3Bucket = require("../../utils/s3BucketUploadImage");
const Response = require("../../helpers/response");
const Op = Sequelize.Op;
const literal = Sequelize.literal;
let self = {};

// Fetch all groups with pagination and optional ordering
self.getAllGroups = async (req, res) => {
  try {
    const user_id = req.authUser;

    const {
      page = 1,
      limit = 50,
      orderBy = "desc",
      prospection_type = null,
    } = req.query;
    const offset = (page - 1) * limit;

    const whereOptions = user_id ? { user_id: user_id } : {};

    whereOptions.prospection_type = prospection_type;

    const fetchParams = {
      where: whereOptions,
      // offset,
      // limit: limit != null ? parseInt(limit) : undefined,
      order: [["order", "asc"]],
    };

    const groups = await Group.findAll(fetchParams);
    res.status(200).json({ status: "success", data: groups });
  } catch (error) {
    res.status(500).json({ status: "error", message: error });
  }
};

// Create a new group
self.createGroup = async (req, res) => {
  try {
    const user_id = req.authUser;

    const { name, type, total_member, url } = req.body;
    const segments = url.split("/");

    // Check if a group with the same URL already exists
    const existingGroup = await Group.findOne({ where: { url } });

    if (existingGroup) {
      return res.status(400).json({
        status: "error",
        message: "A group with the same URL already exists.",
      });
    }

    // Get the last segment
    const group_type = segments[segments.length - 1];

    // Create the group with the provided data
    const newGroup = await Group.create({
      name,
      user_id,
      type,
      total_member,
      group_type,
      url,
    });

    res.status(200).json({ status: "success", data: newGroup });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while creating the group.",
    });
  }
};

// Fetch a group by its ID
self.getGroupByID = async (req, res) => {
  try {
    const groupID = req.params.groupID;

    const group = await Group.findByPk(groupID);

    if (!group) {
      return res
        .status(404)
        .json({ status: "error", message: "Group not found." });
    }

    res.status(200).json({ status: "success", data: group });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while fetching group details.",
    });
  }
};

// Update a group by its ID
self.updateGroup = async (req, res) => {
  try {
    const groupID = req.params.groupID;
    const { name, type, total_member, group_type, url } = req.body;

    const group = await Group.findByPk(groupID);

    if (!group) {
      return res
        .status(404)
        .json({ status: "error", message: "Group not found." });
    } 

    // Update group attributes
    group.name = name;
    group.type = type;
    group.total_member = total_member;
    group.group_type = group_type;
    group.url = url;

    await group.save();
    res.status(200).json({ status: "success", data: group });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while updating the group.",
    });
  }
};

// Delete a group by its ID
self.deleteGroup = async (req, res) => {
  try {
    const groupID = req.params.groupID;

    const group = await Group.findByPk(groupID);

    if (!group) {
      return res
        .status(404)
        .json({ status: "error", message: "Group not found." });
    }

    await group.destroy();
    res
      .status(200)
      .json({ status: "success", message: "Group deleted successfully." });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while deleting the group.",
    });
  }
};

// Reorder groups
self.reorderGroups = async (req, res) => {
  try {
    const { groupIDs } = req.body;

    for (let i = 0; i < groupIDs.length; i++) {
      const groupID = groupIDs[i];
      const group = await Group.findByPk(groupID);
      group.order = i + 1;
      await group.save();
    }

    res
      .status(200)
      .json({ status: "success", message: "Groups reordered successfully." });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while reordering the groups.",
    });
  }
};

self.updateGroupMembers = async (req, res) => {
  try {
    const groupID = req.params.groupID;

    const group = await Group.findByPk(groupID);

    if (!group) {
      return res
        .status(404)
        .json({ status: "error", message: "Group not found." });
    }
    const { total_member, post_image, comment_member, privacy, is_verified_acc } = req.body;

    if(total_member){
      group.total_member = total_member;
    }

    if(	comment_member){
      group.comment_member = 	comment_member;
    }

    if(privacy){
      group.privacy = privacy;
    }

    if (typeof is_verified_acc !== "undefined") {
      group.is_verified_acc = Boolean(Number(is_verified_acc));
    }

    if(post_image && !group.post_image) {
      try {
        let folderName = "groups";
        let imageUrl = await UploadImageOnS3Bucket(post_image, folderName, group.id);
        group.post_image = imageUrl;
      } catch (error) {
        console.error("Error uploading image:", error);
      }
    }

    await group.save();
    res.status(200).json({ status: "success", data: group });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while reordering the groups.",
      error: error,
    });
  }
};

self.createProspectFolder = async (req, res)=>{
  try {
    const user_id = req.authUser;

    const { folder_name, social_type, selectedGroups, prospect_folder,isFav=0} = req.body;

    // Check if a group with the same URL already exists
    const existingFolder = await ProspectionGrpFolders.findOne({ where: { user_id, folder_name } });
    let grpMsg = "No Group Selected to Assign Folder"

    if (existingFolder) {
      return res.status(400).json({
        status: "error",
        message: "A Folder with the same name already exists.",
      });
    }

    // Get max order_num for current user's folders under the same prospect_folder
    const maxOrderNumFolder = await ProspectionGrpFolders.findOne({
      where: { user_id, prospect_folder },
      order: [["order_num", "DESC"]],
    });
    const newOrderNum = maxOrderNumFolder ? maxOrderNumFolder.order_num + 1 : 1;

    if(selectedGroups.length <= 0){
      return res.status(400).json({
        status: "error",
        message: "Groups can't be empty.",
      });
    }

    const newFolder = await ProspectionGrpFolders.create({
      user_id,
      folder_name,
      social_type,
      prospect_folder,
      order_num: newOrderNum,
      isFav
    });

    // group map
    await Promise.all(
      selectedGroups.map(async (grpData) => {
        const {id, group_name, url} = grpData
        let grpDataToInsert;
        // let folderIds = [];
        
        const checkGrp = await Group.findOne({ where: { user_id, url } });
        
        if(!checkGrp){
          throw new Error(`Selected group with id "${id}" not found.`);
        }
        
        let previousData = checkGrp.grp_folder_ids
        
        
        if(previousData != null && previousData != ""){  // merge folder ids
          let parsedId = JSON.parse(previousData)
          parsedId.push(newFolder.id)
          grpDataToInsert = JSON.stringify(parsedId)
        }else{
          grpDataToInsert = JSON.stringify([newFolder.id])
        }
        
        await checkGrp.update({
          grp_social_type: social_type,
          grp_folder_ids: grpDataToInsert, // stringyfy [1,2]
        });
        
      })
    )
    grpMsg = "Group Added Successfully"
  
    // res.status(200).json({ status: "success", newFolder: newFolder, message: grpMsg});
    return Response.resWith202(
      res,
      "Opration completed",
      {
        newFolder: newFolder,
        message: grpMsg
      }
    );
  } catch (error) {
    return Response.resWith422(res, error.message || "An error occurred while creating the folder.");
  }
}

self.updateProspectFolder = async (req, res) => {
  try {
    const user_id = req.authUser;
    const {
      folder_id,
      folder_name,
      social_type,
      selectedGroups = [],
      isFav = 0,
      type
    } = req.body;

    let grpMsg = "No group selected to assign folder";

    const existingFolder = await ProspectionGrpFolders.findOne({
      where: { user_id, id: folder_id }
    });

    if (!existingFolder) {
      return Response.resWith400(res, "Folder does not exist.");
    }

    // Only toggling favorite
    if (type === "fav") {
      const updated = await existingFolder.update({ isFav });
      return Response.resWith202(res, "Operation completed", {
        newFolder: updated,
        message: grpMsg
      });
    }

    // Update full folder details
    const updatedFolder = await existingFolder.update({
      user_id,
      folder_name,
      social_type,
      isFav
    });

    // Group assignment
    if (selectedGroups.length > 0) {
      await Promise.all(
        selectedGroups.map(async (grpData) => {
          const { id, url } = grpData;
          const group = await Group.findOne({ where: { user_id, url } });

          if (!group) {
            throw new Error(`Selected group with ID "${id}" not found.`);
          }

          let folderIds = [];
          if (group.grp_folder_ids) {
            try {
              folderIds = JSON.parse(group.grp_folder_ids);
              if (!Array.isArray(folderIds)) folderIds = [];
            } catch {
              folderIds = [];
            }
          }

          if (!folderIds.includes(updatedFolder.id)) {
            folderIds.push(updatedFolder.id);
          }

          await group.update({
            grp_social_type: social_type,
            grp_folder_ids: JSON.stringify(folderIds)
          });
        })
      );
      grpMsg = "Group(s) updated successfully.";
    }

    return Response.resWith202(res, "Operation completed", {
      newFolder: updatedFolder,
      message: grpMsg
    });

  } catch (error) {
    return Response.resWith422(res, error.message || "An error occurred.");
  }
};


self.deleteProspectFolder = async (req, res)=>{
  try {
    const user_id = req.authUser;

    const { folder_id, selectedGroups} = req.body;

    // destroy the group.
    await ProspectionGrpFolders.destroy({ where: { user_id, id: folder_id } });
    let grpMsg = "No Group Selected."

    // group map
    if(selectedGroups.length > 0){
      await Promise.all(
        selectedGroups.map(async (grpData) => {
          const {id, group_name, url} = grpData
          let grpDataToInsert;
          // let folderIds = [];
          
          const checkGrp = await Group.findOne({ where: { user_id, url } });
          
          if(!checkGrp){
            throw new Error(`Selected group with id "${id}" not found.`);
          }
          
          let previousData = checkGrp.grp_folder_ids
          
          if(previousData != null && previousData != ""){  // merge folder ids
            let parsedId = JSON.parse(previousData)

            let newArray = parsedId.filter(num => num != folder_id);

            if(newArray.length <= 0){
              grpDataToInsert = null
            }else{
              grpDataToInsert = JSON.stringify(newArray)
            }
          }

          await checkGrp.update({
            grp_folder_ids: grpDataToInsert, // stringyfy [1,2]
          });
          
        })
      )
      grpMsg = "Group updated Successfully"
    }
    
    // res.status(200).json({ status: "success", folder: "Folder deleted successfully", group: grpMsg});
    return Response.resWith202(
      res,
      "Opration completed",
      {
        folder: "Folder deleted successfully",
        group: grpMsg
      }
    );
  } catch (error) {
    return Response.resWith422(res, error.message || "An error occurred while deleting the folder.");

  }
}

self.getProspectFolders = async (req, res)=>{
  try {
    const user_id = req.authUser;

    const { social_type = null, prospect_folder} = req.query;

    const whereOptions = user_id ? { user_id: user_id } : {};

    if(social_type){
      whereOptions.social_type = social_type;
    }

    if(prospect_folder){
      whereOptions.prospect_folder = prospect_folder;
    }

    const fetchParams = {
      where: whereOptions,
    };

    const folders = await ProspectionGrpFolders.findAll(fetchParams);
    // res.status(200).json({ status: "success", data: folders });
    return Response.resWith202(
      res,
      "Opration completed",
      folders      
    );
  } catch (error) {
    return Response.resWith422(res, error.message || "An error occurred.");
  }
}

self.reorderProspectFolder = async(req, res) => {
  try {
    const user_id = req.authUser;
    const { source, destination, prospect_folder } = req.body;

    if (typeof prospect_folder !== "string" || prospect_folder.trim() === "") {
      return Response.resWith422(res, "prospect_folder is required.");
    }

    // Fetch folders for the given user and prospect_folder
    const folders = await ProspectionGrpFolders.findAll({
      where: {
        user_id: user_id,
        prospect_folder,
      },
      order: [["order_num", "DESC"]],
    });

    if (!folders || folders.length === 0) {
      return Response.resWith422(res, "No folders found for the specified prospect_folder.");
    }

    const updatedFolders = [...folders];

    // Move folder from source index to destination index
    const [reorderedFolder] = updatedFolders.splice(source, 1);
    updatedFolders.splice(destination, 0, reorderedFolder);

    // Update order_num in the database
    for (let i = updatedFolders.length - 1; i >= 0; i--) {
      await updatedFolders[i].update({ order_num: updatedFolders.length - i });
    }

    return Response.resWith202(res, updatedFolders);
  } catch (error) {
    console.log("error", error);
    return Response.resWith422(res, error.message || "An error occurred while reordering folders.");
  }
};

self.getGroupByFolder = async (req, res)=>{
  try {
    const user_id = req.authUser;
    // page = 1,
    // limit = 50,
    const {
      social_type = null,
      id = null,
      search_grp,
      group_type = null,
      type = null,
      field = null,
      sort_by = 0,
      page = 1,
      limit = 25,
    } = req.body;

    const offset = (page - 1) * limit;
    // const validFields = ["id", "name", "total_member", "createdAt"];

    const orderField = field == "total_member" 
    ? literal("CAST(total_member AS UNSIGNED)") // "123" 134
    : field == "type" ? "group_type"
    : "name";
    const orderSort = (sort_by === 0 || sort_by === 1) ? [orderField, sort_by === 0 ? "ASC" : "DESC"] : ["name", "DESC"];
    const whereOptions = user_id ? { user_id: user_id } : {}; 

    if(social_type == "fb_groups"){
      whereOptions.group_type = {
        [Op.in]: ['member', 'things in common']
      }
    }else if(social_type == "fb_posts"){
      whereOptions.group_type = {
        [Op.in]: ["Post-Like", "Post"]
      };

    }else if(social_type == "ig_followers"){
      whereOptions.group_type = "insta_profile"

    }else if(social_type == "ig_posts"){
      whereOptions.group_type = "insta_likePost"

    }else if(social_type == "ig_hashtags"){
      whereOptions.group_type = "insta_hashtag"

    }
    // else{
    //   res.status(400).json({ status: "error", message: `Invalid Params ${social_type}` });
    // }

    if(search_grp){
      whereOptions.name = {
        [Op.like]: `%${search_grp}%`
      };
    }

    if(group_type){  // filter data by group type eg. member, things in common
      whereOptions.group_type = group_type
    }

    if(type == "facebook"){
      whereOptions[Op.or] = [
        { prospection_type: null },
        { prospection_type: { [Op.in]: ['facebook'] } }
      ];
    }else{
      whereOptions.prospection_type = type
    }

    if(id && id != 'all'){
      whereOptions.grp_folder_ids = {
        [Op.or]:  [
          { [Op.like]: `%[${id},%` },  // Matches [id,...
          { [Op.like]: `%,${id},%` },  // Matches ,id,...
          { [Op.like]: `%,${id}]%` },  // Matches ,id]
          { [Op.like]: `%[${id}]%` }   // Matches [id]
        ]
      };
    }

    const fetchParams = {
      where: whereOptions,
      order: [orderSort],
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
    // order: [["order", "asc"]],

    const { rows: groups, count: total } = await Group.findAndCountAll(fetchParams);

    const groupIds = groups.map(group => group.id.toString()); // convert to string to match `group_id` type

    const settingsRecords = await TargetFriendSettings.findAll({
      where: {
        group_id: { [Op.in]: groupIds }
      },
      attributes: ['group_id']
    });
    
    const groupIdsWithSettings = new Set(settingsRecords.map(r => r.group_id));

    const enrichedGroups = groups.map(group => ({
      ...group.toJSON(),
      settings: groupIdsWithSettings.has(group.id.toString())
    }))

    return Response.resWith202(
      res,
      "Opration completed",
      {
        data: enrichedGroups,
        totalGrp: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit)
      }
    );
  } catch (error) {
    return Response.resWith422(res, error.message);

  }
}

module.exports = self;
