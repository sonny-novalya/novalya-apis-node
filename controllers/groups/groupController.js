const { Group, Sequelize } = require("../../Models");
const UploadImageOnS3Bucket = require("../../utils/s3BucketUploadImage");
const Op = Sequelize.Op;
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
    const { total_member, post_image } = req.body;

    group.total_member = total_member;

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

module.exports = self;
