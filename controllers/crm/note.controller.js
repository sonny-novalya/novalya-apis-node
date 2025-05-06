const db = require("../../Models/crm");
const { checkAuthorization, getAuthUser } = require("../../helpers/functions");
const { Op, where } = require("sequelize");
const note = db.note;
const noteHistory = db.notesHistory;
const taggedUser = db.taggedusers;
const Response = require("../../helpers/response");
const UploadImageOnS3Bucket = require("../../utils/s3BucketUploadImage");

note.hasMany(taggedUser, {
  sourceKey: 'fb_user_id',
  foreignKey: 'fb_user_id',
  as: 'taggedUsers' // use an alias
});

taggedUser.belongsTo(note, {
  targetKey: 'fb_user_id',
  foreignKey: 'fb_user_id'
});

note.hasMany(noteHistory, { foreignKey: 'notes_id', as: 'noteHistories' });
noteHistory.belongsTo(note, { foreignKey: 'notes_id' });

const placeNote = async (req, res) => {
  try {
    const data = await note.create(req.body);
    res.send(data);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

const createNote = async (req, res) => {
  try {
    const user_id = await getAuthUser(req, res);

    const {
      first_name,
      last_name,
      fb_name,
      email = null,
      phone = null,
      profession = null,
      profile_pic,
      profile_url,
      short_description,
      Socials = null,
      notes_history,
      is_primary,
      selected_tag_stage_ids,
      fb_user_id,
      fb_alpha_numeric_id,
      fb_e2ee_id,
      is_e2ee,
      type = "facebook"
    } = req.body;

    let folderName = "notes";
    let date = Date.now()
    let imageUrl;

    if(selected_tag_stage_ids.length > 0){
      const tagsRes = selected_tag_stage_ids.map(async (data) => {
        const { tag_id, stage_id } = data;
  
        // tag_id: tag_id,   add this for multi tagging

        let whereClause;
        if (!fb_user_id) {
          whereClause = {
            user_id: user_id,
            fb_user_e2ee_id: fb_e2ee_id,
          }
        } else if (fb_user_id && fb_e2ee_id) {
          whereClause = {
            user_id: user_id,
            [Op.or]: [
              { fb_user_e2ee_id: fb_e2ee_id },
              { fb_user_id: fb_user_id }
            ]
          }
        } else {
          whereClause = {
            user_id: user_id,
            fb_user_id: fb_user_id,
          }
        }

        if(profile_pic) {
          
          imageUrl = await UploadImageOnS3Bucket(profile_pic, folderName, date);
        }
  
        const existingRecord = await taggedUser.findOne({where:whereClause});
  
        const taggedUserData = {
          tag_id: tag_id,
          stage_id: stage_id,
          fb_name: fb_name,
          is_primary,
          fb_user_id,
          profile_pic: imageUrl,
          fb_image_id: null,
          numeric_fb_id: fb_alpha_numeric_id,
          fb_user_e2ee_id: fb_e2ee_id,
          is_e2ee,
        };
  
        if (existingRecord) {
          await taggedUser.update(taggedUserData, { where: whereClause });
        } else {
          await taggedUser.create({ ...taggedUserData, user_id });
        }

        
      })
      await Promise.all(tagsRes);
    }

    let noteWhereClause = {
      user_id,
      fb_user_id
    }
    let noteId = 0;
    
    const existingNotes = await note.findOne({where: noteWhereClause});

    const noteData = {
      first_name,
      last_name,
      email,
      phone,
      profession,
      short_description,
      Socials
    }

    if(existingNotes){
      await note.update(noteData, { where: noteWhereClause });
      noteId = existingNotes?.id;
    }else{
      const createdNote = await note.create({ ...noteData, user_id, fb_user_id });
      noteId = createdNote.id;
    }

    if(notes_history.length > 0){

      const notesVariant = notes_history.map(async (note) => {
        const noteRecord = await noteHistory.findOne({
          where: {
            description: note,
            notes_id: noteId
          }
        })

        if(!noteRecord){
          await noteHistory.create({
            description: note,
            notes_id: noteId
          });
        }
      });
      await Promise.all(notesVariant);
      ////// BELOW IS THE 2ND OPTION TO CREATE NOTES /////////

      // const notesVariant = notes_history.map((note) => ({
      //   description: note,
      //   notes_id: noteId,
      // }));

      // noteAllData = await noteHistory.destroy({
      //   where: {
      //     notes_id: noteId,
      //   }
      // });

      // await noteHistory.bulkCreate(notesVariant);
      
    }
    

    return Response.resWith202(res, "opration completed");
    // const data = await note.create(req.body);
    
  } catch (error) {
    
    return Response.resWith422(res, error.message);
  }
};

const getUserNote = async (req, res) => {
  try {

    const {fb_user_id} = req.body;

    const user_id = await getAuthUser(req, res);

    const fetchParams = {
      where: {
        fb_user_id,
        user_id: user_id,
      },
      include: [
        {
          model: taggedUser,
          as: 'taggedUsers', // use the same alias as above
          required: false, // true if you want only notes with tagged users
          where: {
            user_id // filters only taggedUsers by user_id
          }
        },
        {
          model: noteHistory,
          as: 'noteHistories', // make sure alias matches association
          required: false,
        }
      ]
    };

    const data = await note.findAll(fetchParams);
    return Response.resWith202(res, data);
  } catch (error) {

    console.log('error', error);    
    return Response.resWith422(res, error.message);
  }
};

const getAll = async (req, res) => {
  try {

    const query = req.body;

    const user_id = await getAuthUser(req, res);

    const fetchParams = {
      where: {
      ...query,
      user_id: user_id,
      },
      order: [["id", "DESC"]],
    };

    const data = await note.findAll(fetchParams);
    return Response.resWith202(data);
  } catch (error) {

    console.log('error', error);    
    return Response.resWith422(res, error.message);
  }
};

const getOne = async (req, res) => {

  try {
    
    const id = req.params.id;

    const data = await note.findOne({ where: { id: id } });
    return Response.resWith202(data);
  } catch (error) {
    
    console.log('error', error);    
    return Response.resWith422(res, error.message);
  }
  
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
  createNote,
  getUserNote
};
