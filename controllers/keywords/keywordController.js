const { Keyword, KeywordType } = require("../../Models");

let self = {};

self.getAll = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { page = 1, limit = 50, orderBy = "desc", type = null } = req.query;
    const offset = (page - 1) * limit;

    const whereOptions = user_id ? { user_id } : {};
    const includeOptions = type
      ? {
          model: KeywordType,
          as: "KeywordType",
          where: { type },
        }
      : {
          model: KeywordType,
          as: "KeywordType",
          required: false,
        };

    const fetchParams = {
      where: whereOptions,
      offset,
      include: includeOptions,
      limit: limit ? parseInt(limit) : undefined,
      order: [["id", orderBy === "desc" ? "DESC" : "ASC"]],
    };

    const keywords = await Keyword.findAll(fetchParams);
    res.status(200).json({ status: "success", data: keywords });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
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

    const keyword = await Keyword.create({
      name,
      user_id,
      positive_keyword,
      negative_keyword,
    });

    if (types && types.length > 0) {
      const typePromises = types.map(async (type) => {
        return await KeywordType.create({
          keyword_id: keyword.id,
          type,
        });
      });
      await Promise.all(typePromises);
    }

    const query = {
      where: { id: keyword.id },
      include: {
        model: KeywordType,
        as: "KeywordType",
      },
    };

    const newKeyword = await Keyword.findOne(query);
    res.status(200).json({ status: "success", data: newKeyword });
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

    const result = await Keyword.findByPk(keywordID, {
      include: {
        model: KeywordType,
        as: "KeywordType",
      },
    });

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
    const {
      name,
      positive_keyword,
      negative_keyword,
      types = ["facebook"],
    } = req.body;

    let keyword = await Keyword.findByPk(keywordID);

    if (!keyword) {
      return res
        .status(404)
        .json({ status: "error", message: "Keyword not found." });
    }

    const updatedKeyword = await keyword.update({
      name,
      positive_keyword,
      negative_keyword,
    });

    await KeywordType.destroy({ where: { keyword_id: keywordID } });
    const typePromises = types.map(async (type) => {
      return KeywordType.create({ keyword_id: keywordID, type });
    });
    await Promise.all(typePromises);

    keyword = await updatedKeyword.reload({
      include: {
        model: KeywordType,
        as: "KeywordType",
      },
    });

    res.status(200).json({ status: "success", data: keyword });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
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

    await KeywordType.destroy({ where: { keyword_id: keywordID } }); // Delete existing
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

    const result = await Keyword.findByPk(keywordID, {
      include: {
        model: KeywordType,
        as: "KeywordType",
      },
    });

    if (!result) {
      return res
        .status(404)
        .json({ status: "error", message: "Keyword not found." });
    }

    const newKeyword = await Keyword.create({
      name: result.name + " (Copy)",
      user_id,
      positive_keyword: result.positive_keyword,
      negative_keyword: result.negative_keyword,
    });

    const oldKeywordTypes = result.KeywordType;
    if (oldKeywordTypes && oldKeywordTypes.length > 0) {
      for (const keytype of oldKeywordTypes) {
        await KeywordType.findOrCreate({
          where: {
            keyword_id: newKeyword.id,
            type: keytype.type,
          },
          defaults: {
            keyword_id: newKeyword.id,
            type: keytype.type,
          },
        });
      }
    }

    res.status(200).json({ status: "success", data: newKeyword });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

module.exports = self;
