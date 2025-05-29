const { Keyword, KeywordType } = require("../../Models");
const Response = require("../../helpers/response");
const { Op } = require("sequelize");
let self = {};

self.getAll = async (req, res) => {
  try {
    const user_id = req.authUser;
    const {
      page = 1,
      limit = 50,
      order = "desc",
      orderBy = "id", 
      type = null,
      search = ""
    } = req.body;

    const offset = (page - 1) * limit;

    const whereOptions = {
      ...(user_id && { user_id }),
      ...(search && {
        name: {
          [Op.like]: `%${search}%`, 
        },
      }),
    };

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
      limit: parseInt(limit),
      include: [includeOptions],
      order: [[orderBy, order.toUpperCase() === "DESC" ? "DESC" : "ASC"]],
    };

    const keywords = await Keyword.findAll(fetchParams);
    const keywordCount = keywords.length;

    return Response.resWith202(res, 'success', { items: keywords, count: keywordCount });
  } catch (error) {

    console.log('error', error);
    return Response.resWith422(res, error.message);
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

    // const newKeyword = await Keyword.findOne(query);
    return Response.resWith202(res, "success");
  } catch (error) {
    
    console.log('error', error);
    return Response.resWith422(res, error.message);
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
      return Response.resWith400(res, 'Keyword not found.');
    }

    return Response.resWith202(res, "success", result);
  } catch (error) {
    
    console.log('error', error);
    return Response.resWith422(res, "Someting went wrong");
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
      return Response.resWith400(res, 'Keyword not found.');
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

    return Response.resWith202(res, "success", keyword);
  } catch (error) {

    console.log('error', error);
    return Response.resWith422(res, "Someting went wrong");
  }
};

self.delete = async (req, res) => {
  try {
    const keywordID = req.params.keywordID;

    const result = await Keyword.findByPk(keywordID);

    if (!result) {
      return Response.resWith400(res, 'Keyword not found.');
    }

    await result.destroy();

    await KeywordType.destroy({ where: { keyword_id: keywordID } }); // Delete existing

    return Response.resWith202(res, "Keyword deleted successfully.");
  } catch (error) {
    
    console.log('error', error);
    return Response.resWith422(res, "Someting went wrong");
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
      return Response.resWith400(res, 'Keyword not found.');
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

    return Response.resWith202(res, "success", newKeyword);
  } catch (error) {
    console.log('error', error);
    return Response.resWith422(res, "Someting went wrong");
  }
};

module.exports = self;
