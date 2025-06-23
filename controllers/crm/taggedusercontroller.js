const db = require("../../Models/crm");
const { checkAuthorization, getAuthUser } = require("../../helpers/functions");
const taggedusers = db.taggedusers;
const Response = require("../../helpers/response");

const placetaggedUsers = async (req, res) => {
  try {
    const { type = "facebook" } = req.query;
    const taggedusersTable =
      type === "instagram" ? db.instataggedusers : taggedusers;
    const data = await taggedusersTable.create(req.body);
    res.send(data);
  } catch (error) {
    res.status(500).send("Internal server error");
  }
};

const taggedusersmove = async (req, res) => {
  try {
    
    const { type = "facebook" } = req.query;
    const taggedusersTable = type === "instagram" ? db.instataggedusers : taggedusers;

    const tagged_user_ids = req.body.tagged_user_ids;

    if (tagged_user_ids.length > 0) {
      await Promise.all(
        tagged_user_ids.map(async (element) => {
          await taggedusersTable.update(
            { stage_id: req.body.stage_id },
            { where: { id: element } }
          );
        })
      );
      return Response.resWith202(res, 'success');
    } else {

      return Response.resWith422(res, "No tagged user ids provided");
    }
  } catch (error) {
    console.log('error', error);    
    return Response.resWith422(res, error.message);
  }
};

const changeUserTagGroup = async (req, res)=>{
  try {
    const { type = "facebook" } = req.query;
    
    const taggedusersTable = type === "instagram" ? db.instataggedusers : taggedusers;
    const tagged_user_ids = req.body.tagged_user_ids;
    const user_id = type === "instagram" ? 'numeric_insta_id' : 'fb_user_id';
    const attributesToPick = type === "instagram" ? ['numeric_insta_id', 'insta_user_id'] : ['fb_user_id', 'fb_user_e2ee_id'];

    if (tagged_user_ids.length > 0) {
        const existingEntries = await taggedusersTable.findAll({
            where: { id: tagged_user_ids },
            attributes: ['id', ...attributesToPick],
        });

        const selectedGrpUsers = await taggedusersTable.findAll({
            where: { tag_id: req.body.group_tag_id },
            attributes: ['id', ...attributesToPick],
        });

        // Create a set of existing user IDs with fallback
        let existingInstaIds = new Set(existingEntries.map(entry => 
            entry.numeric_insta_id || entry.insta_user_id // Fallback if numeric_insta_id is null
        ));

        if (user_id === "fb_user_id") {
            existingInstaIds = new Set(existingEntries.map(entry => 
                entry.fb_user_id || entry.fb_user_e2ee_id // Fallback if fb_user_id is null
            ));
        }

        // Filter tagged_user_ids to exclude duplicates
        const filteredTaggedUserIds = tagged_user_ids.filter((id) => {
            let profileId;

            const entry = existingEntries.find(entry => entry.id === id);
            if (user_id === "fb_user_id") {
                profileId = entry?.fb_user_id ?? entry?.fb_user_e2ee_id;
            } else {
                profileId = entry?.numeric_insta_id ?? entry?.insta_user_id;
            }

            if (profileId && existingInstaIds.has(profileId)) {
                existingInstaIds.delete(profileId); // Remove it after first occurrence
                return true; // Keep this id
            }
            return false; // Exclude duplicates
        });

        const matchedObjects = existingEntries.filter(entry => filteredTaggedUserIds.includes(entry.id));

        // Filter out matching objects
        const filteredMatchedObjects = matchedObjects.filter(matchedObj => {
            const userProfileId = user_id === "fb_user_id"
                ? (matchedObj.fb_user_id || matchedObj.fb_user_e2ee_id) // Use fallback
                : (matchedObj.numeric_insta_id || matchedObj.insta_user_id); // Use fallback

            return !selectedGrpUsers.some(user => 
                (user_id === "fb_user_id"
                    ? (user.fb_user_id || user.fb_user_e2ee_id) === userProfileId
                    : (user.numeric_insta_id || user.insta_user_id) === userProfileId)
            );
        });

        if (filteredMatchedObjects.length > 0) {
            await Promise.all(
                filteredMatchedObjects.map(async (element) => {
                    await taggedusersTable.update(
                        { tag_id: req.body.group_tag_id, stage_id: req.body.stage_id },
                        { where: { id: element.id } }
                    );
                })
            );
            res.status(200).json({status: "success", data: filteredMatchedObjects});
        } else {
            res.status(400).json({
                status: "error",
                message: "Selected IDs are already present",
            });
        }
    } else {
        res.status(400).send("No tagged user IDs provided");
    }
  } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error: error });
  }

}

const getAll = async (req, res) => {
  try {

    const user_id = await getAuthUser(req, res);
    const { type = "facebook" } = req.body;

    const taggedusersTable = type === "instagram" ? db.instataggedusers : taggedusers;

    const records = await taggedusersTable.findAll({
      where: {
        user_id: user_id,
      },
    });

    return Response.resWith202(res, 'Tagged users fetched successfully', records);
  } catch (error) {

    console.log('error', error);    
    return Response.resWith422(res, error.message);
  }
};

const getOne = async (req, res) => {
  
  const id = req.params.id;
  const { type = "facebook" } = req.query;

  try {

    const taggedusersTable = type === "instagram" ? db.instataggedusers : taggedusers;
    const data = await taggedusersTable.findOne({ where: { id: id } });

    return Response.resWith202(res, 'success', data);
  } catch (error) {

    console.log('error', error);    
    return Response.resWith422(res, error.message);
  }
};

const updateOne = async (req, res) => {
  try {
    const id = req.params.id;
    const { type = "facebook" } = req.query;

    const taggedusersTable =
      type === "instagram" ? db.instataggedusers : taggedusers;

    await taggedusersTable.update(req.body, {
      where: { id: id },
      returning: true,
    });

    const updatedData = await taggedusersTable.findOne({
      where: { id: id },
      returning: true,
    });

    return Response.resWith202(res, 'success', updatedData);
  } catch (error) {

    console.log('error', error);    
    return Response.resWith422(res, error.message);
  }
};

const updateMultiple = async (req, res) => {
  try {
    const body = req.body;
    const { type = "facebook" } = req.query;

    const taggedusersTable =
      type === "instagram" ? db.instataggedusers : taggedusers;

    let taggedUserIds = [];

    const updatePromises = body.map(async (request) => {
      taggedUserIds.push(request.id);
      return taggedusersTable.update(request, {
        where: { id: Number(request.id) },
        returning: true,
      });
    });

    await Promise.all(updatePromises);

    const updatedData = await taggedusersTable.findAll({
      where: { id: { [db.Sequelize.Op.in]: taggedUserIds } },
      returning: true,
    });

    res.status(200).json({
      message: "Tagged Users updated successfully",
      data: updatedData,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const deleteOne = async (req, res) => {
  try {
    const id = req.params.id;
    const { type = "facebook" } = req.query;

    const taggedusersTable = type === "instagram" ? db.instataggedusers : taggedusers;

    const rowsDeleted = await taggedusersTable.destroy({ where: { id: id } });

    if (rowsDeleted === 0) {

      return Response.resWith422(res, 'Record not found');
    }

    return Response.resWith202(res, 'Tagged user successfully deleted');
  } catch (error) {

    console.log('error', error);    
    return Response.resWith422(res, error.message);
  }
};

const deleteMany = async (req, res) => {
  try {
    const { ids = [] } = req.body;
    const { type = "facebook" } = req.query;

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.resWith422(res, 'Please provide a list of IDs to delete');
    }

    const taggedusersTable = type === "instagram" ? db.instataggedusers : taggedusers;

    const rowsDeleted = await taggedusersTable.destroy({
      where: { id: ids }
    });

    if (rowsDeleted === 0) {
      return Response.resWith422(res, 'No matching records found to delete');
    }

    return Response.resWith202(res, `${rowsDeleted} tagged user(s) successfully deleted`);
  } catch (error) {
    console.log('error', error);
    return Response.resWith422(res, error.message);
  }
};


const importTaggedUsers = async (req, res) => {
  const taggedUsersData = require("../../routes/csvfiles/taggged_users.json");

  const { type = "facebook" } = req.query;
  const taggedusersTable =
    type === "instagram" ? db.instataggedusers : taggedusers;

  try {
    for (const entry of taggedUsersData) {
      const insertData = {
        fb_user_id: entry.fb_user_id,
        numeric_fb_id: entry.numeric_fb_id,
        fb_image_id: entry.fb_image_id,
        fb_name: entry.fb_name,
        profile_pic: entry.profile_pic,
        tag_id: entry.tag_id,
        user_id: entry.user_id,
        stage_id: entry.stage_id,
      };
      const [record, created] = await taggedusersTable.findOrCreate({
        where: {
          fb_user_id: entry.fb_user_id,
          user_id: entry.user_id,
        },
        defaults: insertData,
      });

      if (!created) {
        await taggedusersTable.update(insertData, {
          where: {
            fb_user_id: entry.fb_user_id,
            user_id: entry.user_id,
          },
        });
      }
    }
    res.status(200).json({ message: "Imported successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

module.exports = {
  placetaggedUsers,
  getAll,
  getOne,
  updateOne,
  deleteOne,
  taggedusersmove,
  changeUserTagGroup,
  updateMultiple,
  importTaggedUsers,
  deleteMany
};
