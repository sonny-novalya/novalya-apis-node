const db = require("../../Models/crm");
const { checkAuthorization, getAuthUser } = require("../../helpers/functions");
const { Op, where } = require("sequelize");
const note = db.note;
const noteHistory = db.notesHistory;
const taggedUser = db.taggedusers;
const instaTaggedUser = db.instataggedusers;
const Response = require("../../helpers/response");
const UploadImageOnS3Bucket = require("../../utils/s3BucketUploadImage");

note.hasMany(taggedUser, {
  sourceKey: 'fb_user_id',
  foreignKey: 'fb_user_id',
  as: 'taggedUsers' // use an alias
});

note.hasMany(taggedUser, {
  sourceKey: 'fb_user_e2ee_id',
  foreignKey: 'fb_user_e2ee_id',
  as: 'taggedUsersE2ee' // use an alias
});

taggedUser.belongsTo(note, {
  targetKey: 'fb_user_id',
  foreignKey: 'fb_user_id'
});

taggedUser.belongsTo(note, {
  targetKey: 'fb_user_e2ee_id',
  foreignKey: 'fb_user_e2ee_id'
});

note.hasMany(instaTaggedUser, {
  sourceKey: 'insta_user_id',
  foreignKey: 'insta_user_id',
  as: 'taggedUsersInsta' // use an alias
});

instaTaggedUser.belongsTo(note, {
  targetKey: 'insta_user_id',
  foreignKey: 'insta_user_id'
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
      email = null,
      phone = null,
      profession = null,
      profile_pic,
      short_description,
      Socials = null,
      notes_history,
      is_primary,
      selected_tag_stage_ids,
      fb_user_id = null,
      fb_e2ee_id = null,
      insta_user_id = null,
      type = "facebook"
    } = req.body;

    let folderName = "notes";
    let date = Date.now()
    let imageUrl;
    let whereClause;

    // CODE FOR ASSIGN OR EDIT TAGS FOR FB & IG
    if(type === "facebook" && selected_tag_stage_ids.length > 0){
      const {fb_user_id, fb_alpha_numeric_id, fb_e2ee_id, is_e2ee, fb_name} = req.body

      const tagsRes = selected_tag_stage_ids.map(async (data) => {
        const { tag_id, stage_id } = data;
  
        // tag_id: tag_id,   add this for multi tagging

        
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
      
    }else if(selected_tag_stage_ids.length > 0 && type === "instagram"){
      const {insta_user_id, numeric_insta_id, insta_name, profile_pic, thread_id} = req.body

      const tagsRes = selected_tag_stage_ids.map(async (data) => {
        const { tag_id, stage_id } = data;
        
        // tag_id: tag_id,   add this for multi tagging

        let whereClause = {
          user_id: user_id,
          insta_user_id,
        };
        

        if(profile_pic) {
          
          imageUrl = await UploadImageOnS3Bucket(profile_pic, folderName, date);
        }
  
        const existingRecord = await instaTaggedUser.findOne({where:whereClause});
  
        const instaTaggedUserData = {
          tag_id: tag_id,
          stage_id: stage_id,
          insta_name: insta_name,
          is_primary,
          insta_user_id,
          profile_pic: imageUrl,
          insta_image_id: null,
          numeric_insta_id: numeric_insta_id,
          thread_id
        };
  
        if (existingRecord) {
          await instaTaggedUser.update(instaTaggedUserData, { where: whereClause });
        } else {
          await instaTaggedUser.create({ ...instaTaggedUserData, user_id });
        }

        
      })
      await Promise.all(tagsRes);

    }
    
    // CODE FOR CREATE OR EDIT NOTES
    // let social_user_id = type === "facebook" ? req.body.fb_user_id : req.body.insta_user_id;

    let noteWhereClause ;
    if(type === "facebook"){
      noteWhereClause = whereClause
    }else{
      noteWhereClause = {
        user_id,
        insta_user_id: insta_user_id
      }
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
      Socials,
      fb_user_id: fb_user_id || null,
      fb_user_e2ee_id: fb_e2ee_id || null,
      insta_user_id : insta_user_id || null,
      type
    }

    if(existingNotes){
      await note.update(noteData, { where: noteWhereClause });
      noteId = existingNotes?.id;
    }else{
      const createdNote = await note.create({ ...noteData, user_id });
      noteId = createdNote.id;
    }

    // CODE FOR TO CREATE NOTES HISTORY OR VARIANTS
    if(notes_history.length > 0){

      const notesVariant = notes_history.map(async (notes) => {
        const {id, description} = notes

        if(id == 0){
          const noteRecord = await noteHistory.findOne({
            where: {
              description: description,
              notes_id: noteId
            }
          })
  
          if(!noteRecord && description){
            await noteHistory.create({
              description: description,
              notes_id: noteId
            });
          }
        }else {
          const noteRecord = await noteHistory.findOne({
            where: {
              id: id
            }
          })
  
          if(noteRecord && description){
            const dateNow = new Date().toISOString().replace('T', ' ').substring(0, 19)
            const noteData = {
              description: description,
              updatedAt: dateNow
            }
        
            await noteHistory.update(noteData, { where: { id: id } });
          }
        }
        
      });
      await Promise.all(notesVariant);
      
    }
    

    return Response.resWith202(res, "opration completed");
    // const data = await note.create(req.body);
    
  } catch (error) {
    
    return Response.resWith422(res, error.message);
  }
};

const getUserNote = async (req, res) => {
  try {
    
    const user_id = await getAuthUser(req, res);
    const {fb_user_id = null, fb_e2ee_id = null, insta_user_id = null, type = "facebook"} = req.body;

    const include = [
      {
        model: noteHistory,
        as: 'noteHistories',
        required: false
      }
    ];
    
    let whereClause;
    
    if (type === "facebook") {
      if (fb_user_id && fb_e2ee_id) {
        whereClause = {
          user_id: user_id,
          [Op.or]: [
            { fb_user_id },
            { fb_user_e2ee_id: fb_e2ee_id }
          ]
        };
    
        include.push(
          {
            model: taggedUser,
            as: "taggedUsers",
            required: false,
            where: {
              user_id,
              fb_user_id
            }
          },
          {
            model: taggedUser,
            as: "taggedUsersE2ee",
            required: false,
            where: {
              user_id,
              fb_user_e2ee_id: fb_e2ee_id
            }
          }
        );
    
      } else if (fb_user_id) {
        whereClause = {
          user_id,
          fb_user_id
        };
    
        include.push({
          model: taggedUser,
          as: "taggedUsers",
          required: false,
          where: {
            user_id,
            fb_user_id
          }
        });
    
      } else if (fb_e2ee_id) {
        whereClause = {
          user_id,
          fb_user_e2ee_id: fb_e2ee_id
        };
    
        include.push({
          model: taggedUser,
          as: "taggedUsersE2ee",
          required: false,
          where: {
            user_id,
            fb_user_e2ee_id: fb_e2ee_id
          }
        });
      }
    } else {
      whereClause = {
        user_id,
        insta_user_id
      };
    
      include.push({
        model: instaTaggedUser,
        as: "taggedUsersInsta",
        required: false,
        where: {
          user_id,
          insta_user_id
        }
      });
    }
    
    const fetchParams = {
      where: whereClause,
      include
    };

    let data = await note.findAll(fetchParams);
    // const taggedUsers = await taggedUser.findAll(fetchParams);

    if(data.length == 0){
      if (type === "facebook") {
        data = await taggedUser.findAll({
          where: whereClause
        });
      }else{
        data = await instaTaggedUser.findAll({
          where: whereClause
        }); 
      }
    }

    // return Response.resWith202(res, "Opration completed" ,data);

    if (!data || data.length === 0 || !data[0]) {
      return Response.resWith202(res, "Opration completed", []);
    }

    const noteData = JSON.parse(JSON.stringify(data[0])); // deep clone to break Sequelize reference issues

    let finalTaggedUsers = [];

    if (Array.isArray(noteData.taggedUsers) && noteData.taggedUsers.length > 0) {
      finalTaggedUsers = noteData.taggedUsers;
    } else if (Array.isArray(noteData.taggedUsersE2ee) && noteData.taggedUsersE2ee.length > 0) {
      finalTaggedUsers = noteData.taggedUsersE2ee;
    }

    // Clean up the object
    delete noteData.taggedUsers;
    delete noteData.taggedUsersE2ee;

    // Add final key
    noteData.taggedUsers = finalTaggedUsers;

    return Response.resWith202(res, "Opration completed" ,[noteData]);
  } catch (error) {

    console.log('error', error);    
    return Response.resWith422(res, error.message);
  }
};

const editUserNote = async (req, res) => {
  try {

    const user_id = await getAuthUser(req, res);

    if(!user_id){
      return Response.resWith422(res, "Invalid user");
    }
    const {note_id, description, id} = req.body;

    const dateNow = new Date().toISOString().replace('T', ' ').substring(0, 19)

    const noteData = {
      description: description,
      updatedAt: dateNow
    }

    const data = await noteHistory.update(noteData, { where: { notes_id: note_id, id } });

    return Response.resWith202(res, data);
  } catch (error) {

    console.log('error', error);    
    return Response.resWith422(res, error.message);
  }
};

const deleteUserNoteVariants = async (req, res) => {
  try {

    const user_id = await getAuthUser(req, res);
    
    const {id, note_id} = req.query;

    const data = await noteHistory.destroy({ where: { notes_id: note_id, id } });

    return Response.resWith202(res, "opration completed", data);
  } catch (error) {

    console.log('error', error);    
    return Response.resWith422(res, error.message);
  }
};

const deleteNote = async (req, res) => {
  try {

    const user_id = await getAuthUser(req, res);
    
    const {id} = req.query;

    const data = await note.destroy({ where: { id } });

    return Response.resWith202(res, "opration completed",data);
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
  getUserNote,
  editUserNote,
  deleteUserNoteVariants,
  deleteNote
};
