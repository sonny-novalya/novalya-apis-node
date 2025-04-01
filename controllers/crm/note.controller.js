const db = require("../../Models/crm");
const { checkAuthorization, getAuthUser } = require("../../helpers/functions");
const { Op } = require("sequelize");
const note = db.note;
const placeNote = async (req, res) => {
  try {
    const data = await note.create(req.body);
    res.send(data);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

const getAll = async (req, res) => {
  try {
    const query = req.query;

    const user_id = await getAuthUser(req, res);

    const fetchParams = {
      where: {
      ...query,
      user_id: user_id,
      },
      order: [["id", "DESC"]],
    };

    const data = await note.findAll(fetchParams);
    res.send(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getOne = async (req, res) => {
  const id = req.params.id;

  const data = await note.findOne({ where: { id: id } });

  res.json(data);
};
const updateOne = async (req, res) => {
  const id = req.params.id;

  const data = await note.update(req.body, { where: { id: id } });
  res.send(data);
};

const deleteOne = async (req, res) => {
  const id = req.params.id;

  await note.destroy({ where: { id: id } });
  res.json({
    message: "note successfully deleted",
  });
};

const getByUser = async (req, res) => {
  const { fb_user_id, type = "facebook" } = req.params;

  try {
    const data = await note.findAll({
      where: {
        type: type,
        fb_user_id: {
          [Op.eq]: fb_user_id,
        },
      },
    });

    if (data.length === 0) {
      return res
        .status(404)
        .json({ message: "No records found for the specified fb_user_id" });
    }

    res.json(data);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

module.exports = {
  placeNote,
  getAll,
  getOne,
  updateOne,
  deleteOne,
  getByUser,
};
