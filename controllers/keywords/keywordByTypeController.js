const { Keyword, InstaKeyword } = require("../../Models");

let self = {};

self.getAll = async (req, res) => {
  try {
    const user_id = req.authUser;

    let results = [];

    await Promise.all([
      Keyword.findAll({
        where: { user_id },
      }),
      InstaKeyword.findAll({
        where: { user_id },
      }),
    ]).then(([facebookKeywords, instagramKeywords]) => {
      results = results.concat(
        facebookKeywords.map((keyword) => ({
          ...keyword.toJSON(),
          type: "facebook",
        }))
      );
      results = results.concat(
        instagramKeywords.map((keyword) => ({
          ...keyword.toJSON(),
          type: "instagram",
        }))
      );
    });
    res.status(200).json({ status: "success", data: results });
  } catch (error) {
    res.status(500).json({ status: "error", message: error });
  }
};

self.create = async (req, res) => {
  try {
    const user_id = req.authUser;

    const {
      name,
      positive_keyword,
      negative_keyword,
      types = ["facebook"],
    } = req.body;
    
    let results = [];
    await Promise.all(
      types.map(async (type) => {
        let keyword;
        if (type === "facebook") {
          keyword = await Keyword.create({
            name,
            user_id,
            positive_keyword,
            negative_keyword,
          });
        } else {
          keyword = await InstaKeyword.create({
            name,
            user_id,
            positive_keyword,
            negative_keyword,
          });
        }
        results.push(keyword);
      })
    );

    res.status(200).json({ status: "success", data: results });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error,
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
    });
  }
};

module.exports = self;
