const db = require("../../Models/crm");
const { checkAuthorization, randomToken } = require("../../helpers/functions");
const message = db.messages;

const placeMessage = async (req, res) => {
  try {
    const randomCode = randomToken(10); // Generate a random code of length 10

    const dataToSave = {
      ...req.body,
      randomcode: randomCode, // Add the random code to the data
    };

    const created = await message.create(dataToSave); // Save data to the database
    res.send(created);
  } catch (error) {
    res.status(500).send("Internal server error");
  }
};

const getAll = async (req, res) => {
  try {
    const query = req.query;

    const data = await message.findAll({ where: query });
    res.send(data);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getOne = async (req, res) => {
  const id = req.params.id;

  const data = await message.findOne({ where: { id: id } });

  res.json(data);
};
const updateOne = async (req, res) => {
  const id = req.params.id;

  const data = await message.update(req.body, { where: { id: id } });
  res.send(data);
};

const deleteOne = async (req, res) => {
  const id = req.params.id;

  await message.destroy({ where: { id: id } });
  res.json({
    message: "message successfully deleted",
  });
};
module.exports = {
  placeMessage,
  getAll,
  getOne,
  updateOne,
  deleteOne,
};
