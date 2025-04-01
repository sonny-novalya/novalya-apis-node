const { Folder, Sequelize } = require("../../Models");
const Op = Sequelize.Op;
let self = {};

let defaultFolders = ["All people", "All hashtags", "All Posts"];

// Fetch all folder with pagination and optional ordering
self.getAll = async (req, res) => {
  try {
    const user_id = req.authUser;

    const { media = "instagram" } = req.query;

    const whereOptions = user_id ? { user_id: user_id } : {};

    whereOptions.media = media;

    const fetchParams = {
      where: whereOptions,
      order: [["id", "asc"]],
    };

    const groups = await Folder.findAll(fetchParams);
    res.status(200).json({ status: "success", data: groups });
  } catch (error) {
    res.status(500).json({ status: "error", message: error });
  }
};

// Create a new folder
self.create = async (req, res) => {
  try {
    const user_id = req.authUser;

    const { name, media = "instagram" } = req.body;

    // Check if a group with the same URL already exists
    const existingFolder = await Folder.findOne({
      where: { name, media, user_id },
    });

    if (existingFolder) {
      return res.status(400).json({
        status: "error",
        message: "A folder with the same name already exists.",
      });
    }

    // Create the Folder with the provided data
    const newFolder = await Folder.create({
      name,
      user_id,
      media,
      user_id,
    });

    res.status(200).json({ status: "success", data: newFolder });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while creating the group.",
      error: error.message,
    });
  }
};
// Create a Default folders

self.createDefault = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { media = "instagram" } = req.query;

    let createdFolders = [];

    for (let folderName of defaultFolders) {
      let [folder, created] = await Folder.findOrCreate({
        where: { name: folderName, media, user_id },
        defaults: { name: folderName, media, user_id },
      });
      createdFolders.push(folder);
    }

    res.status(200).json({ status: "success", data: createdFolders });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while creating the group.",
      error: error.message,
    });
  }
};

// Fetch a folder by its ID
self.getFolderByID = async (req, res) => {
  try {
    const folderId = req.params.folderId;

    const folder = await Folder.findByPk(folderId);

    if (!folder) {
      return res
        .status(404)
        .json({ status: "error", message: "Folder not found." });
    }

    res.status(200).json({ status: "success", data: folder });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while fetching folder details.",
      error: error.message,
    });
  }
};

// Update a update by its ID
self.update = async (req, res) => {
  try {
    const folderId = req.params.folderId;
    const user_id = req.authUser;
    const { name, media = "instagram" } = req.body;

    const folder = await Folder.findByPk(folderId);

    if (!folder) {
      return res
        .status(404)
        .json({ status: "error", message: "Folder not found." });
    }

    const folderWithSameName = await Folder.findOne({
      where: { name, media, user_id },
    });

    if (folderWithSameName) {
      return res.status(404).json({
        status: "error",
        message: "Folder with same name allready exists.",
      });
    }

    folder.name = name;

    await folder.save();
    res.status(200).json({ status: "success", data: folder });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while updating the folder.",
      error: error.message,
    });
  }
};

// Delete a folder by its ID
self.delete = async (req, res) => {
  try {
    const folderId = req.params.folderId;

    const folder = await Folder.findByPk(folderId);

    if (!folder) {
      return res
        .status(404)
        .json({ status: "error", message: "Folder not found." });
    }

    await folder.destroy();
    res
      .status(200)
      .json({ status: "success", message: "Folder deleted successfully." });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while deleting the folder.",
    });
  }
};

module.exports = self;
