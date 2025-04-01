const db = require("../../Models/crm");
const { checkAuthorization, getAuthUser } = require("../../helpers/functions");
const stage = db.stage;

const { Qry } = require("../../helpers/functions"); // Import your Qry function

const getAll = async (req, res) => {
  try {
    const query = req.query;

    const data = await stage.findAll({ where: query });
    res.send(data);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const updateDbStages = async (req, res) => {
  try {
    const user_id = await getAuthUser(req, res);

    // Log the user_id

    const updateQuery = `
      UPDATE taggedusers tu
      JOIN stages s ON tu.stage_id = s.stage_num AND tu.tag_id = s.tag_id
      SET tu.stage_id = s.id
      WHERE tu.user_id IN (?) AND tu.tag_id NOT LIKE '%,%'
    `;

    await Qry(updateQuery, [user_id]);

    const updateInstaQuery = `
      UPDATE instataggedusers tu
      JOIN instastages s ON tu.stage_id = s.stage_num AND tu.tag_id = s.tag_id
      SET tu.stage_id = s.id
      WHERE tu.user_id IN (?) AND tu.tag_id NOT LIKE '%,%'
    `;

    await Qry(updateInstaQuery, [user_id]);

    res.json({ message: "All records updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error updating DB stages", error });
  }
};

const updateDbInstaStages = async (req, res) => {
  const user_id = await getAuthUser(req, res);

  const updateQuery = `
        UPDATE instataggedusers tu
        JOIN instastages s ON tu.stage_id = s.stage_num AND tu.tag_id = s.tag_id
        SET tu.stage_id = s.id
        WHERE tu.user_id IN (?)
      `;

  const result = await Qry(updateQuery, [user_id]);
  rowsAffected = result.affectedRows;

  res.json({ message: "All records updated successfully" });
};

module.exports = {
  getAll,
  updateDbStages,
  updateDbInstaStages,
};
