const db = require("../../Models/crm");
const { checkAuthorization, getAuthUser, Qry } = require("../../helpers/functions");
const { Op, where } = require("sequelize");
const note = db.note;
const noteHistory = db.notesHistory;
const taggedUser = db.taggedusers;
const instaTaggedUser = db.instataggedusers;
const Response = require("../../helpers/response");
const UploadImageOnS3Bucket = require("../../utils/s3BucketUploadImage");
const { CleanHTMLData, CleanDBData } = require("../../config/database/connection");

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

const createFbNote = async (req, res) => {
  try {
    const user_id = await getAuthUser(req, res);
    const postData = req.body;

    const {
      fb_user_id,
      fb_alphanumeric_id,
      fb_user_e2ee_id,
      is_e2ee,
      fb_name,
      profile_pic,
      is_primary,
      is_verified_acc,
      first_name,
      last_name,
      email,
      phone,
      profession,
      short_description,
      Socials,
      description,
      selected_tag_stage_ids,
      type = "facebook"
    } = req.body;

    // const taggedUserData = {
    //   tag_id: tag_id,
    //   stage_id: stage_id,
    //   fb_name: fb_name,
    //   is_primary,
    //   fb_user_id,
    //   profile_pic: imageUrl,
    //   fb_image_id: null,
    //   numeric_fb_id: fb_alphanumeric_id,
    //   fb_user_e2ee_id: fb_user_e2ee_id,
    //   is_e2ee,
    //   user_note: req.body.short_description || null,
    //   profession: req.body.profession || null
    // };

    let folderName = "notes";
    let dateImg = Date.now()
    let imageUrl;

    let whereClause;
    if (!fb_user_id) {
      whereClause = {
        user_id: user_id,
        fb_user_e2ee_id: fb_user_e2ee_id,
      }
    } else if (fb_user_id && fb_user_e2ee_id) {
      whereClause = {
        user_id: user_id,
        [Op.or]: [
          { fb_user_e2ee_id: fb_user_e2ee_id },
          { fb_user_id: fb_user_id }
        ]
      }
    } else {
      whereClause = {
        user_id: user_id,
        fb_user_id: fb_user_id,
      }
    }


    // CODE FOR ASSIGN OR EDIT TAGS FOR FB
    if (selected_tag_stage_ids && selected_tag_stage_ids.length > 0) {
      // const {fb_user_id, fb_alphanumeric_id, fb_user_e2ee_id, is_e2ee, fb_name} = req.body

      const tagsRes = selected_tag_stage_ids.map(async (data) => {
        const { tag_id, stage_id } = data;

        // tag_id: tag_id,   add this for multi tagging

        if (profile_pic && profile_pic.includes("novalya-assets") != true) {

          imageUrl = await UploadImageOnS3Bucket(profile_pic, folderName, dateImg);
        }else{
          imageUrl = profile_pic;
        }

        const existingRecord = await taggedUser.findOne({ where: whereClause });

        const taggedUserData = {
          tag_id: tag_id,
          stage_id: stage_id,
          fb_name: fb_name,
          is_primary,
          is_verified_acc: typeof is_verified_acc !== "undefined" ? Boolean(Number(is_verified_acc)) : false,
          fb_user_id,
          profile_pic: imageUrl,
          fb_image_id: null,
          numeric_fb_id: fb_alphanumeric_id,
          fb_user_e2ee_id: fb_user_e2ee_id,
          is_e2ee,
          user_note: req.body.short_description || null,
          profession: req.body.profession || null
        };

        if (existingRecord) {
          await taggedUser.update(taggedUserData, { where: whereClause });
        } else {
          await taggedUser.create({ ...taggedUserData, user_id });
        }


      })
      await Promise.all(tagsRes);

    }

    delete postData.is_primary;
    delete postData.is_verified_acc;
    delete postData.selected_tag_stage_ids;
    delete postData.fb_alphanumeric_id;
    delete postData.is_e2ee;
    delete postData.fb_name;
    delete postData.profile_pic;

    const updates = [];
    const date = new Date().toISOString().replace('T', ' ').substring(0, 19);
    postData.updatedAt = date;

    const notesData = {
      user_id,
      fb_user_id: fb_user_id || null,
      fb_user_e2ee_id: fb_user_e2ee_id || null,
      first_name: first_name || null,
      last_name: last_name || null,
      email: email || null,
      phone: phone || null,
      profession: profession || null,
      short_description: short_description || null,
      socials: Socials || null,
      // description: description,
      description: Array.isArray(description) ? description : [description],
      type
    };
    
    const existingNotes = await note.findOne({ where: whereClause });

    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    // Helper function to format value for SQL
    const formatSQLValue = (value, key) => {
      if (value === null || value === undefined) {
        return 'NULL';
      }

      if (key === 'description') {
        const arraySafe = Array.isArray(value) ? value : [value];
        const stringified = JSON.stringify(arraySafe);             // handles double quotes and adds backslashes
        const escapedSingleQuotes = stringified.replace(/'/g, "''");  // escape single quotes for SQL
        const escapedBackslashes = escapedSingleQuotes.replace(/\\/g, '\\\\'); // escape backslashes
        return `'${escapedBackslashes}'`;
      }

      return `'${value}'`;
    };

    if (existingNotes) {
      // Dynamic Update logic
      const updateFields = [];
      
      // Add insta_user_id as NULL for Facebook notes
      updateFields.push('insta_user_id = NULL');
      
      // Dynamically build update fields from notesData
      Object.keys(notesData).forEach(key => {
        if (key !== 'user_id') { // Skip user_id as it shouldn't be updated
          updateFields.push(`${key} = ${formatSQLValue(notesData[key], key)}`);
        }
      });
      
      // Add updatedAt
      updateFields.push(`updatedAt = '${now}'`);
      
      const updateQuery = `
        UPDATE notes SET 
          ${updateFields.join(',\n          ')}
        WHERE id = '${existingNotes.id}'
      `;

      const updateResult = await Qry(updateQuery);
      if (updateResult) {
        return Response.resWith202(res, "Note updated", updateResult);
      } else {
        return Response.resWith422(res, "Failed to update note");
      }
    } else {
      // Dynamic Create logic
      const fields = Object.keys(notesData);
      const values = Object.values(notesData);
      
      // Add insta_user_id, createdAt, updatedAt
      fields.push('insta_user_id', 'createdAt', 'updatedAt');
      values.push(null, now, now);
      
      const formattedValues = fields.map((key, index) => formatSQLValue(values[index], key));
      
      const createQuery = `
        INSERT INTO notes (${fields.join(', ')}) 
        VALUES (${formattedValues.join(', ')})
      `;

      const createResult = await Qry(createQuery);
      if (createResult) {
        return Response.resWith202(res, "Note created", createResult);
      } else {
        return Response.resWith422(res, "Failed to create note");
      }
    }

  } catch (e) {

    console.log('create-note-error', e);
    
    return Response.resWith422(res, e.message);
  }
}

const createInstaNote = async (req, res) => {
  try {
    const user_id = await getAuthUser(req, res);
    const postData = req.body;

    const {
      insta_user_id,
      numeric_insta_id = null,
      profile_pic,
      insta_name,
      is_primary,
      is_verified_acc,
      selected_tag_stage_ids,
      thread_id,
      type = "instagram"
    } = req.body;

    let folderName = "notes";
    let dateImg = Date.now()
    let imageUrl;

    let whereClause = {
      user_id: user_id,
      insta_user_id,
    };


    // CODE FOR ASSIGN OR EDIT TAGS FOR FB
    if (selected_tag_stage_ids && selected_tag_stage_ids.length > 0) {
      // const {insta_user_id, numeric_insta_id, insta_name, profile_pic, thread_id} = req.body

      const tagsRes = selected_tag_stage_ids.map(async (data) => {
        const { tag_id, stage_id } = data;

        // tag_id: tag_id,   add this for multi tagging

        if(profile_pic && profile_pic.includes("novalya-assets") != true) {

          imageUrl = await UploadImageOnS3Bucket(profile_pic, folderName, dateImg);
        }else{
          imageUrl = profile_pic;
        }

        const existingRecord = await instaTaggedUser.findOne({where : whereClause});

        const instaTaggedUserData = {
          tag_id: tag_id,
          stage_id: stage_id,
          insta_name: insta_name,
          is_primary,
          is_verified_acc: typeof is_verified_acc !== "undefined" ? Boolean(Number(is_verified_acc)) : false,
          insta_user_id,
          profile_pic: imageUrl,
          insta_image_id: null,
          numeric_insta_id: numeric_insta_id,
          thread_id,
          user_note: req.body.short_description || null,
          profession: req.body.profession || null
        };

        if (existingRecord) {
          await instaTaggedUser.update(instaTaggedUserData, { where: whereClause });
        } else {
          await instaTaggedUser.create({ ...instaTaggedUserData, user_id });
        }


      })
      await Promise.all(tagsRes);

    }

    delete postData.is_primary;
    delete postData.is_verified_acc;
    delete postData.selected_tag_stage_ids;
    delete postData.thread_id;
    delete postData.insta_name;
    delete postData.profile_pic;

    const updates = [];
    const date = new Date().toISOString().replace('T', ' ').substring(0, 19);
    postData.updatedAt = date;    

    const existingNotes = await note.findOne({ where: whereClause });

    if (existingNotes) {  // update user notes
      for (const [key, value] of Object.entries(postData)) {
        const sanitizedValue = CleanHTMLData(CleanDBData(value));

        let finalValue;
        if (key === 'description') {
          const arraySafe = Array.isArray(value) ? value : [value];
          const stringified = JSON.stringify(arraySafe);             // Handles quotes safely
          const escapedSingleQuotes = stringified.replace(/'/g, "''");  // SQL-safe for single quotes
          const escapedBackslashes = escapedSingleQuotes.replace(/\\/g, '\\\\'); // SQL-safe for backslashes
          finalValue = escapedBackslashes;
        } else {
          finalValue = sanitizedValue;
        }

        updates.push(`${key} = '${finalValue}'`);
      }
      const updateQuery = `UPDATE notes SET ${updates.join(
        ", "
      )} WHERE id = '${existingNotes.id}'`;
      const updateResult = await Qry(updateQuery);

      if (updateResult) {
        return Response.resWith202(res, "Operation Completed", updateResult);
      } else {
        return Response.resWith422(res, "An error occurred while updating the notes");
      }
    }else{ // create user notes
      postData.user_id = user_id
      postData.createdAt = date;
      const columns = []
      const values = []
      for (const [key, value] of Object.entries(postData)) {
        const sanitizedValue = CleanHTMLData(CleanDBData(value));

        let finalValue;
        if (key === 'description') {
          const arraySafe = Array.isArray(value) ? value : [value];
          const stringified = JSON.stringify(arraySafe);             // Handles quotes safely
          const escapedSingleQuotes = stringified.replace(/'/g, "''");  // SQL-safe for single quotes
          const escapedBackslashes = escapedSingleQuotes.replace(/\\/g, '\\\\'); // SQL-safe for backslashes
          finalValue = escapedBackslashes;
        } else {
          finalValue = sanitizedValue;
        }

        columns.push(key);
        values.push(`'${finalValue}'`);
      }
      const createQuery = `INSERT INTO notes (${columns.join(", ")}) VALUES (${values.join(", ")})`;
      const createResult = await Qry(createQuery);

      if (createResult) {
        return Response.resWith202(res, "Operation Completed", createResult);
      } else {
        return Response.resWith422(res, "An error occurred while creating the notes");
      }
    }

  } catch (e) {
    return Response.resWith422(res, e.message);
  }
}


const getUserNote = async (req, res) => {
  try {

    const user_id = await getAuthUser(req, res);
    const { fb_user_id = null, fb_e2ee_id = null, insta_user_id = null, type = "facebook" } = req.body;

    const include = [];

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

    if (data.length == 0) {
      if (type === "facebook") {
        data = await taggedUser.findAll({
          where: whereClause
        });
      } else {
        data = await instaTaggedUser.findAll({
          where: whereClause
        });
      }
      let resData = {}
      type === "facebook" ? resData.taggedUsers = data : resData.taggedUsersInsta = data
      
      return Response.resWith202(res, "Operation Completed", [resData]);
    }

    if (!data || data.length === 0 || !data[0]) {
      return Response.resWith202(res, "Operation Completed", []);
    }

    // Extract and merge descriptions
    const allDescriptions = data.map(row => {
      try {
        // Revert SQL-safe single quotes back to normal
        const safeJson = row.description.replace(/''/g, "'");
        return JSON.parse(safeJson);
      } catch (err) {
        console.error("Description parse error:", err.message, "Value:", row.description);
        return [];
      }
    }).flat();

    console.log(JSON.stringify(allDescriptions));
    
    // Use only first row for base data
    const noteData = JSON.parse(JSON.stringify(data[0]));
    noteData.description = allDescriptions;

    let finalTaggedUsers = [];

    if (Array.isArray(noteData.taggedUsers) && noteData.taggedUsers.length > 0) {
      finalTaggedUsers = noteData.taggedUsers;
    } else if (Array.isArray(noteData.taggedUsersE2ee) && noteData.taggedUsersE2ee.length > 0) {
      finalTaggedUsers = noteData.taggedUsersE2ee;
    }

    // Clean up the object
    delete noteData.taggedUsers;
    delete noteData.taggedUsersE2ee;

    // let descriptions1 = JSON.parse(noteData.description)
    noteData.taggedUsers = finalTaggedUsers;

    try {
      noteData.description = noteData.description;
    } catch (err) {
      noteData.description = [];
    } 

    if(noteData?.socials){
      let noteSocials = noteData.socials.replace(/\\"/g, '"')
      noteData.socials = noteSocials
    }    

    return Response.resWith202(res, "Operation Completed", [noteData]);

    // Extract and merge all descriptions
    // let descriptions = [];
    // data.forEach(item => {
    //   const raw = item.get({ plain: true });
      
    //   if (raw.description) {
    //     try {
    //       let cleaned = raw.description;
    
    //       // Replace escaped quotes and backslashes
    //       cleaned = cleaned
    //         .replace(/\\"/g, '"')    // escaped double quotes → "
    //         .replace(/\\\\'/g, "'")  // double backslash + single quote → '
    //         .replace(/\\'/g, "'")    // single backslash + single quote → '
    //         .replace(/\\n/g, ' ')    // newlines → space
    //         .replace(/\\+/g, '')     // remove excessive backslashes
    //         .replace(/\s{2,}/g, ' ') // collapse multiple spaces → single
    
    //       // Try parsing
    //       let parsed = JSON.parse(cleaned);
    
    //       // If it's a stringified string, parse again
    //       if (typeof parsed === 'string') {
    //         parsed = JSON.parse(parsed);
    //       }
    
    //       if (Array.isArray(parsed)) {
    //         descriptions.push(...parsed);
    //       }
    //     } catch (e) {
    //       console.warn(`Invalid JSON in description for note ID ${raw.id}:`, raw.description);
    
    //       // Optional fallback: try to recover simple array-like content
    //       const fallback = raw.description.match(/\[.*?\]/s);
    //       if (fallback) {
    //         const tryFix = fallback[0]
    //           .replace(/\\\\'/g, "'")
    //           .replace(/\\'/g, "'")
    //           .replace(/\\"/g, '"')
    //           .replace(/\\+/g, '')
    //           .replace(/\s{2,}/g, ' ')
    //           .replace(/[^\x20-\x7E]+/g, ''); // remove non-ASCII garbage
    
    //         try {
    //           const recovered = JSON.parse(tryFix);
    //           if (Array.isArray(recovered)) {
    //             descriptions.push(...recovered);
    //           }
    //         } catch (_) {
    //           // silently fails
    //         }
    //       }
    //     }
    //   }
    // });
    
    
    

    // // Add final key
    // noteData.taggedUsers = finalTaggedUsers;
    // noteData.description = descriptions;
    // if(noteData?.socials){
    //   let noteSocials = noteData.socials.replace(/\\"/g, '"')
    //   noteData.socials = noteSocials
    // }    

    // return Response.resWith202(res, "Operation Completed", [noteData]);
  } catch (error) {

    console.log('error', error);
    return Response.resWith422(res, error.message);
  }
};


const deleteNote = async (req, res) => {
  try {

    const user_id = await getAuthUser(req, res);

    const { id } = req.query;

    const data = await note.destroy({ where: { id } });

    return Response.resWith202(res, "Operation Completed", data);
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
  createFbNote,
  createInstaNote,
  getUserNote,
  deleteNote
};
