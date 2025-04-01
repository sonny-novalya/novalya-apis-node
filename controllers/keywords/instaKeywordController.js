const { InstaKeyword } = require("../../Models");

let self = {};
const Keyword = InstaKeyword

self.getAll = async (req, res) => {
  try {
    const user_id = req.authUser;

    const { page = 1, limit = 50, orderBy = "desc" } = req.query;
    const offset = (page - 1) * limit;

    const whereOptions = user_id ? { user_id: user_id } : {};

    const fetchParams = {
      where: whereOptions,
      offset,
      limit: limit != null ? parseInt(limit) : undefined,
      order: [["id", orderBy === "desc" ? "DESC" : "ASC"]],
    };

    const keyword = await Keyword.findAll(fetchParams);
    res.status(200).json({ status: "success", data: keyword });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

self.create = async (req, res) => {
  try {
    const user_id = req.authUser;

    const { name, positive_keyword, negative_keyword } = req.body;

    const result = await Keyword.create({
      name,
      user_id,
      positive_keyword,
      negative_keyword,
    });

    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error,
      error: error.message
    });
  }
};

self.getByID = async (req, res) => {
  try {
    const keywordID = req.params.keywordID;

    const result = await Keyword.findByPk(keywordID);

    if (!result) {
      return res
        .status(404)
        .json({ status: "error", message: "Keyword not found." });
    }

    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while fetching group details.",
      error: error.message
    });
  }
};

self.update = async (req, res) => {
  try {
    const keywordID = req.params.keywordID;
    const { name, positive_keyword, negative_keyword } = req.body;

    const keyword = await Keyword.findByPk(keywordID);

    if (!keyword) {
      return res
        .status(404)
        .json({ status: "error", message: "Keyword not found." });
    }
    keyword.name = name;
    keyword.positive_keyword = positive_keyword;
    keyword.negative_keyword = negative_keyword;

    await keyword.save();
    res.status(200).json({ status: "success", data: keyword });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while updating the keyword.",
      error: error.message
    });
  }
};

self.delete = async (req, res) => {
  try {
    const keywordID = req.params.keywordID;

    const result = await Keyword.findByPk(keywordID);

    if (!result) {
      return res
        .status(404)
        .json({ status: "error", message: "Keyword not found." });
    }

    await result.destroy();
    res
      .status(200)
      .json({ status: "success", message: "Keyword deleted successfully." });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while deleting the Keyword.",
      error: error.message
    });
  }
};

self.duplicate = async (req, res) => {
  try {
    const keywordID = req.params.keywordID;
    const user_id = req.authUser;

    const result = await Keyword.findByPk(keywordID);

    if (!result) {
      return res
        .status(404)
        .json({ status: "error", message: "Keyword not found." });
    }

    const newKeyword = await Keyword.create({
      name: result.name + " (Copy)",
      user_id: user_id,
      positive_keyword: result.positive_keyword,
      negative_keyword: result.negative_keyword,
    });

    res.status(200).json({ status: "success", data: newKeyword });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred while duplicating the Keyword.",
      error: error.message
    });
  }
};

module.exports = self;
