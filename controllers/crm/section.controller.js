const db = require("../../Models/crm");
const { checkAuthorization } = require("../../helpers/functions");
const section = db.section;
const placeSection = async (req, res) => {
  try {
    const data = await section.create(req.body);
    res.send(data);
  } catch (error) {
    res.status(500).send("Internal server error");
  }
};

const getAll = async (req, res) => {
  try {
    const query = req.query;

    const data = await section.findAll({ where: query });
    res.send(data);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getOne = async (req, res) => {
  const id = req.params.id;

  const data = await section.findOne({ where: { id: id } });

  res.json(data);
};
const updateOne = async (req, res) => {
  const id = req.params.id;

  const data = await section.update(req.body, { where: { id: id } });
  res.send(data);
};

const deleteOne = async (req, res) => {
  const id = req.params.id;
  const authUser = await checkAuthorization(req, res);

  await section.destroy({ where: { id: id } });
  res.json({
    message: "section successfully deleted",
  });
};
module.exports = {
  placeSection,
  getAll,
  getOne,
  updateOne,
  deleteOne,
};
