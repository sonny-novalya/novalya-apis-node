const { sequelize } = require("../../Models");
const db = require("../../Models/crm");
const { Op, fn, col, literal } = require("sequelize");
const Category = db.Category;
const CategoryTemplate = db.CategoryTemplate;
const Message = db.Message;
const MessageTemplate = db.MessageTemplate;
const MessageVariant = db.MessageVariant;
const MessageVariantTemplate = db.MessageVariantTemplate;
const TemplateFavorite = db.TemplateFavorite;
const Response = require("../../helpers/response");
const UploadImageOnS3Bucket = require("../../utils/s3BucketUploadImage");


exports.getAllCategories = async (req, res) => {
  try {
    const user_id = req.authUser;
    const categories = await Category.findAll({
      where: { user_id },
    });

    return res.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({ error: "Failed to fetch categories" });
  }
};

exports.createCategories = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { name } = req.body;
    const category = await Category.create({ user_id, name });

    return res.status(201).json(category);
  } catch (error) {
    console.error("Error creating category:", error);
    return res.status(500).json({ error: "Failed to create category" });
  }
};

exports.updateCategories = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { name } = req.body;
    const { id } = req.params;
    const category = await Category.findOne({ where: { id, user_id } });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    category.name = name;
    await category.save();

    return res.status(200).json(category);
  } catch (error) {
    console.error("Error updating category:", error);
    return res.status(500).json({ error: "Failed to update category" });
  }
};

exports.deleteCategories = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { id } = req.params;
    const category = await Category.findOne({ where: { id, user_id } });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    await category.destroy();

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting category:", error);
    return res.status(500).json({ error: "Failed to delete category" });
  }
};

exports.createMessages = async (req, res) => {
  try {

    const user_id = req.authUser;
    const { name, variants, visibility_type, language='', attachment } = req.body;
    const folderName = "create-msg-library"

    const [category] = await Category.findOrCreate({
      where: { name: "My message", user_id },
    });

    // let imageUrl = null
    // if(attachment){
    //   let imageId = `${name.replace(/\s+/g, "-").toLowerCase()}-${user_id}`.replace('#', "");
    //   imageUrl = await UploadImageOnS3Bucket(attachment, folderName, imageId);
    // }

    const message = await Message.create({
      user_id,
      category_id: category.id,
      title: name,
      // attachment: imageUrl,
      language: language,
      visibility_type: JSON.stringify(visibility_type),
    });

    const messageVariants = variants.map((variant) => ({
      message_id: message.id,
      name: variant,
      created_at: new Date(),
    }));

    await MessageVariant.bulkCreate(messageVariants);

    Response.resWith202(res, message, {variants: messageVariants});
    
    if (attachment) {
      (async () => {
        try {
          let imageId = `${name.replace(/\s+/g, "-").toLowerCase()}-${user_id}`.replace('#', '');
          const imageUrl = await UploadImageOnS3Bucket(attachment, folderName, imageId);
  
          await Message.update(
            { attachment: imageUrl },
            { where: { id: message.id } }
          );
        } catch (uploadError) {
          console.error("Error uploading image in background:", uploadError);
        }
      })();
    }

  } catch (error) {
    console.error("Error creating message:", error);
    
    return Response.resWith422(res, error.message);
  }
};

exports.createDuplicateMessages = async (req, res) => {
  try {

    const user_id = req.authUser;
    const { message_id } = req.body;

    // console.log('message_id', message_id);
    const existingMessage = await Message.findOne({
      where: { id: message_id },
    });

    if(!existingMessage){
      return Response.resWith422(res, "message does not exists");
    }

    // console.log('existingMessage', existingMessage);

    const { category_id, title, created_at, language, visibility_type, favorite } = existingMessage;

    let visibilityTypes = (visibility_type) ? visibility_type : [];

    const create_message = await Message.create({
      user_id,
      category_id: category_id,
      title: title + ' (Copy)',
      visibility_type: visibilityTypes,
    });

    var oldMessageId = message_id; 
    const newMessageId = create_message.id;

    const oldVariants = await MessageVariant.findAll({
      where: { message_id: oldMessageId },
    });

    if (oldVariants && oldVariants.length > 0) {
      
      const newVariants = oldVariants.map(variant => {
        const variantData = variant.toJSON();
        delete variantData.id;
        delete variantData.created_at;
        variantData.message_id = newMessageId; 
        return variantData;
      });

      // console.log('variantData', newVariants);
      
      await MessageVariant.bulkCreate(newVariants);
    }

    return Response.resWith202(res, 'duplicate message created successfully');
  } catch (error) {

    console.error("Error creating message:", error);
    
    return Response.resWith422(res, error.message);
  }
};

// Get all messages with their variants
exports.getAllMessagesOld = async (req, res) => {
  try {

    const user_id = req.authUser;
    const { visibility_type, page , limit , search } = req.body;
     let offset=0
    if(limit){

       offset = (page - 1) * limit;
    }

    const categoryInfo = await Category.findOne({
      where: {user_id, name: "My message"}
    });

    let messages = [];
    if(categoryInfo) {
      let whereClause = {
        user_id,
        category_id: categoryInfo.id
      };
      
      if (visibility_type) {
        var visibilityType = JSON.parse(visibility_type);
        whereClause.visibility_type = {
          [Op.contains]: [visibility_type]
        };
      }

      // if (visibility_type) {
      //   const visibilityType = JSON.parse(visibility_type);
      //   whereClause.visibility_type = sequelize.literal(`JSON_CONTAINS(visibility_type, '["${visibilityType}"]')`);
      // }

      if (visibility_type) {
          const visibilityTypes = JSON.parse(visibility_type); 
          const conditions = visibilityTypes
              .map((type) => `JSON_CONTAINS(visibility_type, '"${type}"')`)
              .join(' OR '); 
          
          whereClause.visibility_type = sequelize.literal(`(${conditions})`);
      }
      if(limit){
        messages = await Message.findAll({
          where: whereClause,
          include: [
            {
              model: db.Category,
              as: "category",
              // where: {user_id, title: "My message"}
            },
            {
              model: db.MessageVariant,
              as: "variants",
            },
          ],
          limit:limit,
          offset:offset,
        distinct: true,
        });
      }else{
        messages = await Message.findAll({
          where: whereClause,
          include: [
            {
              model: db.Category,
              as: "category",
              // where: {user_id, title: "My message"}
            },
            {
              model: db.MessageVariant,
              as: "variants",
            },
          ],
        });
      }
    
    }
    return Response.resWith202(res, messages);
  } catch (error) {
    console.error("try-catch-error:", error);
    
    return Response.resWith422(res, error.message);
  }
};

exports.getAllMessages = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { visibility_type, page = 1, limit = 10, search, sort_by = "id", sort_order = "DESC" } = req.body;

    const offset = (page - 1) * limit;

    const categoryInfo = await Category.findOne({
      where: { user_id, name: "My message" }
    });

    if (!categoryInfo) {
      return Response.resWith202(res, { messages: [], total: 0, page, limit });
    }

    let whereClause = {
      user_id,
      category_id: categoryInfo.id
    };

    // Search condition
    if (search) {
      whereClause.title = { [Op.like]: `%${search}%` }; 
    }

    // Handle visibility_type
    if (visibility_type) {
      const visibilityTypes = JSON.parse(visibility_type);
      const conditions = visibilityTypes
        .map(type => `JSON_CONTAINS(visibility_type, '"${type}"')`)
        .join(' OR ');
      whereClause.visibility_type = sequelize.literal(`(${conditions})`);
    }

    // Validate and apply sorting
    const validSortFields = ["title", "id"];
    const validSortOrders = ["ASC", "DESC"];
    const orderBy = validSortFields.includes(sort_by) ? sort_by : "id";
    const orderDirection = validSortOrders.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : "DESC";


    const { rows: messages, count: total } = await Message.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: db.Category,
          as: "category",
        },
        {
          model: db.MessageVariant,
          as: "variants",
        }
      ],
      order: [[orderBy, orderDirection]],
      limit,
      offset,
      distinct: true,
    });

    return Response.resWith202(res, {
      messages,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error("try-catch-error:", error);
    return Response.resWith422(res, error.message);
  }
};


exports.getTemplateMessages = async (req, res) => {
  try {
    const user_id = req.authUser;
    const categoryInfo = await Category.findAll({
      where: {'user_id': 0}
      // where: {user_id, name: { [Op.not]: 'My message' }}
    });
    let ids = [];
    categoryInfo.forEach((catInfo) => {
      ids.push(catInfo.id);
    })
    let messages = [];
    if(categoryInfo) {
      messages = await Message.findAll({
        where: { user_id, category_id: {
          [Op.in]: ids
        }},
        include: [
          {
            model: db.Category,
            as: "category",
            // where: {user_id, title: "My message"}
          },
          {
            model: db.MessageVariant,
            as: "variants",
          },
        ],
      });
    }
    return Response.resWith202(res, messages);
  } catch (error) {
    console.error("try-catch-error:", error);
    
    return Response.resWith422(res, error.message);
  }
}

exports.getTemplateMessagesData = async (req, res) => {
  try {
    const user_id = req.authUser;
    const user_id_new = 0;

    const categoryInfo = await CategoryTemplate.findAll({
      where: { user_id: user_id_new },
      attributes: ['id'],
      raw: true,
    });

    // console.log("categoryInfo--336:", categoryInfo);
    
    const categoryIds = categoryInfo.map(cat => cat.id);
    // console.log("categoryIds--336:", categoryIds);

    if (!categoryIds.length) {
      return Response.resWith202(res, []);
    }

    const messages = await MessageTemplate.findAll({
      where: {
        user_id: user_id_new,
        category_id: { [Op.in]: categoryIds }
      },
      include: [
        {
          model: db.CategoryTemplate,
          as: "category",
          attributes: ['id', 'name'], 
        },
        {
          model: db.MessageVariantTemplate,
          as: "variants",
        }
      ],
    });

    const results = [];

    for (const msg of messages) {
      const favorite = await TemplateFavorite.findOne({
        where: {
          user_id: user_id,
          template_id: msg.id,
          favorite: 1,
        },
      });

      msg.favorite = (favorite) ? true : false;
    }

    return Response.resWith202(res, messages);

  } catch (error) {
    console.error("try-catch-error:", error);
    return Response.resWith422(res, error.message);
  }
};


// Update a message and its variants
exports.updateMessageOld = async (req, res) => {
  try {
    const { message_id, name, variants } = req.body;

    const message = await Message.findByPk(message_id);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    await message.update({ title: name });

    await MessageVariant.destroy({ where: { message_id: message.id } });

    const messageVariants = variants.map((variant) => ({
      message_id: message.id,
      name: variant,
      created_at: new Date(),
    }));

    await MessageVariant.bulkCreate(messageVariants);

    return res.status(200).json({ message, variants: messageVariants });
  } catch (error) {
    console.error("Error updating message:", error);
    return res.status(500).json({ error: "Failed to update message" });
  }
};

// Update a message and its variants
exports.updateMessage = async (req, res) => {
  try {
    const { message_id, name, variants, visibility_type } = req.body;

    const message = await Message.findByPk(message_id);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    await message.update({ title: name, visibility_type: JSON.stringify(visibility_type) });

    await MessageVariant.destroy({ where: { message_id: message.id } });

    const messageVariants = variants.map((variant) => ({
      message_id: message.id,
      name: variant,
      created_at: new Date(),
    }));

    await MessageVariant.bulkCreate(messageVariants);

    return res.status(200).json({ message, variants: messageVariants });
  } catch (error) {
    console.error("Error updating message:", error);
    return res.status(500).json({ error: "Failed to update message" });
  }
};

// Delete a message and its variants
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.findByPk(id);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    await MessageVariant.destroy({ where: { message_id: message.id } });
    await message.destroy();

    return res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error);
    return res.status(500).json({ error: "Failed to delete message" });
  }
};

exports.getMessageByCategory = async (req, res) => {
  try {
    const user_id = req.authUser;
    const messages = await Category.findOne({
      where: { name: "My message", user_id },
      include: [
        {
          model: db.Message,
          as: "messages",
          include: [
            {
              model: db.MessageVariant,
              as: "variants",
            },
          ],
        },
      ],
    });

    if(messages) {
      return res.status(200).json(messages);
    } else {
      let messages_res = {
        messages: [],
        user_id
      }
      return res.status(200).json(messages_res);
    }
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
};

exports.setFavoriteMessage = async (req, res) => {
  try {

    const user_id = req.authUser;
    const { action_id, type='message' } = req.body;

    if(type == 'template'){

      const checkTemplate = await TemplateFavorite.findOne({
        where: {
          user_id: user_id,
          template_id: action_id,     
        },
      });
      
      if (checkTemplate) {

        const { id, favorite } = checkTemplate;

        console.log('id', id);
        console.log('favorite', favorite);

        await TemplateFavorite.update(
          { favorite: (favorite == 1) ? 0 : 1 },
          {
            where: {
              template_id: action_id,
              user_id: user_id,
            },
          }
        );
      } else {

        await TemplateFavorite.create({user_id: user_id, template_id: action_id, favorite: 1});
      }     
      
      return Response.resWith202(res, 'update success');
    } else {

      const message = await Message.findByPk(action_id);

      if (!message) {

        return Response.resWith422(res, 'Message not found');
      }
  
      await message.update({ favorite: message.favorite == 0 ? 1 : 0 });
      
      return Response.resWith202(res, 'update success', message);
    }
   
  } catch (error) {
    console.error("Error fetching messages:", error);

    return Response.resWith422(res, 'Failed to fetch messages');
  }
};

exports.getAllMessageByAllCategory = async (req, res) => {
  try {
    const user_id = req.authUser;
    const messages = await Category.findAll({
      where: { user_id },
      include: [
        {
          model: db.Message,
          as: "messages",
          include: [
            {
              model: db.MessageVariant,
              as: "variants",
            },
          ],
        },
      ],
    });

    return res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
};
// Helper function to create or find a category
async function findOrCreateCategory(user_id, name) {
  let category = await CategoryTemplate.findOne({ where: { name, user_id } });
  if (!category) {
    category = await CategoryTemplate.create({ name, user_id });
  }
  return category;
}

// Helper function to create message variants
async function createMessageVariants(message_id, content, language) {
  const variants = Object.entries(content).map(([key, value], index) => ({
    message_id,
    name: value,
    created_at: new Date(),
  }));
  await MessageVariantTemplate.bulkCreate(variants);
}

const object = [
  {
    Statut: "OK",
    Category: "Accept/Decline",
    Article: 1,
    "French Title": "Acceptation | Souhaiter la bienvenue",
    "French Content V1":
      "😊 Bonjour [first name], merci pour la demande d'ami !\n \nQu'est-ce qui t'a amené à m'ajouter ? \nJ'aime beaucoup échanger et en savoir plus sur les personnes de mon réseau. \n \nHâte de discuter avec toi !",
    "French Content V2":
      "Salut [first name] ! 👋\nMerci pour l’ajout ! Toujours sympa de voir de nouvelles connexions arriver.\n \nQu’est-ce qui a attiré ton attention sur mon profil ? J’adore apprendre à connaître de nouvelles personnes et partager des idées.\nAu plaisir 😊",
    "French Content V3":
      "Hello [first name], merci pour l’ajout ! 🎉\n \nJe suis toujours partant pour rencontrer de nouvelles personnes. \nDis-moi, qu’est-ce qui t’a donné envie de te connecter avec moi ?\n \nJe suis curieux de savoir si on partage des intérêts communs, et ce serait top d’en discuter. \nÀ bientôt !",
    "English Title": "Accept | Wish to welcome",
    "English Content V1":
      "😊 Hello [first name], thank you for the friend request!\n \nWhat brought you to add me?\nI really enjoy exchanging and learning more about the people in my network.\n \nLooking forward to chatting with you!",
    "English Content V2":
      "Hi [first name]! 👋\nThanks for adding me! It's always nice to see new connections coming in.\n \nWhat caught your attention on my profile? I love getting to know new people and sharing ideas.\nLooking forward to it 😊",
    "English Content V3":
      "Hey [first name], thank you for the add! 🎉\n \nI am always up for meeting new people.\nTell me, what made you want to connect with me?\n \nI am curious to know if we share common interests, and it would be great to discuss that.\nSee you soon!",
    "German Title": "Akzeptanz | Willkommen heißen",
    "German Content V1":
      "😊 Hallo [first name], danke für die Freundschaftsanfrage!\n \nWas hat dich dazu gebracht, mich hinzuzufügen?\nIch tausche mich sehr gerne aus und möchte mehr über die Menschen in meinem Netzwerk erfahren.\n \nIch freue mich darauf, mit dir zu sprechen!",
    "German Content V2":
      "Hallo [first name]! 👋\nDanke für die Verbindung! Es ist immer schön, neue Kontakte zu sehen.\n \nWas hat deine Aufmerksamkeit auf mein Profil gelenkt? Ich liebe es, neue Menschen kennenzulernen und Ideen auszutauschen.\nFreue mich 😊",
    "German Content V3":
      "Hallo [first name], danke für die Einladung! 🎉\n \nIch bin immer bereit, neue Leute kennenzulernen.\nSag mir, was hat dich dazu gebracht, dich mit mir zu verbinden?\n \nIch bin neugierig zu wissen, ob wir gemeinsame Interessen teilen, und es wäre großartig, darüber zu sprechen.\nBis bald!",
    "Spanish Title": "Aceptación | Dar la bienvenida",
    "Spanish Content V1":
      "😊 Hola [first name], ¡gracias por la solicitud de amistad!\n \n¿Qué te llevó a agregarme?\nMe gusta mucho intercambiar y saber más sobre las personas de mi red.\n \n¡Espero con ansias hablar contigo!",
    "Spanish Content V2":
      "¡Hola [first name]! 👋\n¡Gracias por agregarme a tu lista de amigos! Siempre es agradable crear nuevas conexiones.\n \n¿Qué te llamó la atención de mi perfil? Me encanta conocer nuevas personas y compartir ideas.\n¡Un placer! 😊",
    "Spanish Content V3":
      "Hola [first name], ¡gracias por tu solicitud de amistad! 🎉\n \nSiempre estoy dispuesto a conocer nuevas personas.\nDime, ¿Qué despertó tu interés en conectarte conmigo?\n \nTengo curiosidad por saber si compartimos intereses comunes, y sería genial discutirlo.\n¡Hasta pronto!",
  },
  {
    Statut: "OK",
    Category: "Accept/Decline",
    Article: 2,
    "French Title": "Refus | Liste pleine | Redirection",
    "French Content V1":
      "Bonjour [first name], merci pour ta demande d'ami ! \n \nComme ma liste d'amis est pleine 🤷‍♀️, je t’invite à me suivre sur [Instagram/Youtube] où je partage également du contenu sur [sujet]. \n \nVoici le lien 👉 [lien].",
    "French Content V2":
      "Salut [first name], merci pour ta demande d'ami ! 🙏\n \nMalheureusement, ma liste d’amis est complète, mais je t’invite à me suivre sur [nom du réseau social]. \n \nJ’y partage régulièrement du contenu autour de [sujet], Et je serai enchanté de te voir !\n \nVoici le lien 👉 [lien du profil].",
    "French Content V3":
      "Hello [first name], merci pour ta demande d'ami ! \n \nComme ma liste est déjà pleine 🤷‍♂️, je t’encourage à me suivre sur [nom du réseau social]. \n \nJe partage souvent des infos et du contenu intéressant sur [sujet] que tu pourrais apprécier. \n \nVoici le lien 👉 [lien du profil].",
    "English Title": "Reject | Full list | Redirection",
    "English Content V1":
      "Hello [first name], thank you for your friend request!\n \nAs my friends list is full 🤷‍♀️, I invite you to follow me on [Instagram/Youtube] where I also share content about [topic].\n \nHere is the link 👉 [link].",
    "English Content V2":
      "Hi [first name], thank you for your friend request! 🙏\n \nUnfortunately, my friend list is full, but I invite you to follow me on [social media name].\n \nI regularly share content about [topic], and I would be delighted to see you there!\n \nHere is the link 👉 [profile link].",
    "English Content V3":
      "Hey [first name], thank you for your friend request!\n \nAs my list is already full 🤷‍♂️, I encourage you to follow me on [name of the social network].\n \nI often share interesting information and content on [topic] that you might enjoy.\n \nHere is the link 👉 [profile link].",
    "German Title": "Refus | Liste voll | Umleitung",
    "German Content V1":
      "Hallo [first name], danke für deine Freundschaftsanfrage!\n \nDa meine Freundesliste voll ist 🤷‍♀️, lade ich dich ein, mir auf [Instagram/Youtube] zu folgen, wo ich ebenfalls Inhalte über [Thema] teile.\n \nHier ist der Link 👉 [Link].",
    "German Content V2":
      "Hallo [first name], danke für deine Freundschaftsanfrage! 🙏\n \nLeider ist meine Freundesliste voll, aber ich lade dich ein, mir auf [Name des sozialen Netzwerks] zu folgen.\n \nDort teile ich regelmäßig Inhalte über [Thema], und ich würde mich freuen, dich dort zu sehen!\n \nHier ist der Link 👉 [Profil-Link].",
    "German Content V3":
      "Hallo [first name], danke für deine Freundschaftsanfrage!\n \nDa meine Liste bereits voll ist 🤷‍♂️, lade ich dich ein, mir auf [Name des sozialen Netzwerks] zu folgen.\n \nIch teile oft Informationen und interessante Inhalte über [Thema], die dir gefallen könnten.\n \nHier ist der Link 👉 [Profil-Link].",
    "Spanish Title": "Rechazo | Lista llena | Redirección",
    "Spanish Content V1":
      "Hola [first name], ¡gracias por tu solicitud de amistad!\n \nComo mi lista de amigos está llena 🤷‍♀️, te invito a seguirme en [Instagram/Youtube] donde también comparto contenido sobre [tema].\n \nAquí está el enlace 👉 [enlace].",
    "Spanish Content V2":
      "Hola [first name], ¡gracias por tu solicitud de amistad! 🙏\n \nDesafortunadamente, mi lista de amigos está completa, pero te invito a seguirme en [nombre de la red social].\n \nAllí comparto regularmente contenido sobre [tema], ¡y estaré encantado de verte!\n \nAquí está el enlace 👉 [enlace del perfil].",
    "Spanish Content V3":
      "Hola [first name], ¡gracias por tu solicitud de amistad!\n \nComo mi lista ya está llena 🤷‍♂️, te animo a que me sigas en [nombre de la red social].\n \nA menudo comparto información y contenido interesante sobre [tema] que podrías disfrutar.\n \nAquí está el enlace 👉 [enlace del perfil].",
  },
  {
    Statut: "OK",
    Category: "Birthday",
    Article: 1,
    "French Title": "Anniversaire d’aujourd’hui",
    "French Content V1":
      "Bonjour [first name], joyeux anniversaire ! 🎂\n \nJ’espère que tu passes une superbe journée et que cette nouvelle année t’apportera encore plus de succès et de bonheur. \n \nSi tu as l’occasion de célébrer 🎉 aujourd’hui, profites-en à fond ! \n \nD'ailleurs tu as soufflé combien de bougies cette année ? 🎁",
    "French Content V2":
      "Salut [first name] ! 🎈\n \nUn an de plus, et que des bonnes choses en perspective ! \n🎂 Je te souhaite une journée remplie de rires, de surprises et de moments magiques. \nCette année sera sans aucun doute exceptionnelle pour toi ! 💫\n \nAlors, as-tu déjà reçu un cadeau qui t’a vraiment surpris aujourd'hui ? 🎁",
    "French Content V3":
      "👋 Hello [first name], c’est ton jour ! Joyeux Anniversaire.\n \nJ’espère que tu es avec tout ceux que tu aimes et que cette journée est aussi fantastique que toi. 🎂\n \nTu as prévu quelque chose de spécial pour fêter ça ? 😊",
    "English Title": "Today's birthday",
    "English Content V1":
      "Hello [first name], happy birthday! 🎂\n \nI hope you are having a great day and that this new year will bring you even more success and happiness.\n \nIf you have the opportunity to celebrate 🎉 today, enjoy it to the fullest!\n \nBy the way, how many candles did you blow out this year? 🎁",
    "English Content V2":
      "Hi [first name]! 🎈\n \nAnother year, and only good things on the horizon!\n🎂 I wish you a day filled with laughter, surprises, and magical moments.\nThis year will undoubtedly be exceptional for you! 💫\n \nSo, have you already received a gift that really surprised you today? 🎁",
    "English Content V3":
      "👋 Hey [first name], it’s your day! Happy Birthday.\n \nI hope you are with everyone you love and that this day is as fantastic as you are. 🎂\n \nDo you have something special planned to celebrate this? 😊",
    "German Title": "Heute ist der Geburtstag",
    "German Content V1":
      "Hallo [first name], alles Gute zum Geburtstag! 🎂\n \nIch hoffe, du hast einen tollen Tag und dass dir dieses neue Jahr noch mehr Erfolg und Glück bringen wird.\n \nWenn du heute die Gelegenheit hast zu feiern 🎉, nutze sie in vollen Zügen!\n \nÜbrigens, wie viele Kerzen hast du dieses Jahr ausgeblasen? 🎁",
    "German Content V2":
      "Hallo [first name]! 🎈\n \nEin Jahr mehr, und nur gute Dinge in Aussicht!\n🎂 Ich wünsche dir einen Tag voller Lachen, Überraschungen und magischer Momente.\nDieses Jahr wird zweifellos außergewöhnlich für dich sein! 💫\n \nAlso, hast du heute schon ein Geschenk erhalten, das dich wirklich überrascht hat? 🎁",
    "German Content V3":
      "👋 Hallo [first name], es ist dein Tag! Herzlichen Glückwunsch zum Geburtstag.\n \nIch hoffe, du bist mit all den Menschen, die du liebst, zusammen und dass dieser Tag so fantastisch ist wie du. 🎂\n \nHast du etwas Besonderes geplant, um das zu feiern? 😊",
    "Spanish Title": "Cumpleaños de hoy",
    "Spanish Content V1":
      "Hola [first name], ¡feliz cumpleaños! 🎂\n \nEspero que estés teniendo un día maravilloso y que este nuevo año te traiga aún más éxito y felicidad.\n \nSi tienes la oportunidad de celebrar 🎉 hoy, ¡disfrútalo al máximo!\n \nPor cierto, ¿cuántas velas has soplado este año? 🎁",
    "Spanish Content V2":
      "¡Hola [first name] ! 🎈\n \n¡Un año más, y solo cosas buenas en perspectiva!\n🎂 Te deseo un día lleno de risas, sorpresas y momentos mágicos.\n¡Este año sin duda será excepcional para ti! 💫\n \nEntonces, ¿ya has recibido un regalo que realmente te sorprendió hoy? 🎁",
    "Spanish Content V3":
      "👋 Hola [first name], ¡es tu día! Feliz cumpleaños.\n \nDeseo que estés rodeado de tus seres queridos y que este día sea tan increíble como tú. 🎂\n \n¿Tienes algo especial planeado para celebrarlo? 😊",
  },
  {
    Statut: "OK",
    Category: "Birthday",
    Article: 2,
    "French Title": "Anniversaire d’hier",
    "French Content V1":
      "Bonjour [first name], j’espère que tu as passé un excellent anniversaire hier ! 🥳\n \nJe voulais te souhaiter un joyeux anniversaire, même avec un jour de retard ! 🙏\n \nQue cette nouvelle année t’apporte beaucoup de bonheur et de réussite dans tout ce que tu entreprends. \n \nAlors, tu as soufflé combien de bougies cette année ? 😉",
    "French Content V2":
      "Salut [first name],\nJ’espère que tu as eu une journée d’anniversaire mémorable hier ! 🎉\n \nJe suis un peu en retard, mais je tenais quand même à te souhaiter un joyeux anniversaire ! 🎂 Que cette année soit remplie de belles surprises et de succès dans tout ce que tu entreprends.\n \nComment tu te sens avec une bougie en plus ? 😄",
    "French Content V3":
      "Hello [first name] !\nUn petit message en retard pour te souhaiter un super anniversaire ! 🥳 J’espère que ta journée d’hier a été fabuleuse.\n \nJe te souhaite plein de bonheur et de réussite pour cette nouvelle année à venir ! 🎂\n \nQuels sont tes objectifs pour cette nouvelle année ? 🎈",
    "English Title": "Yesterday's birthday",
    "English Content V1":
      "Hello [first name], I hope you had a great birthday yesterday! 🥳\n \nI wanted to wish you a happy birthday, even if it's a day late! 🙏\n \nMay this new year bring you a lot of happiness and success in everything you undertake.\n \nSo, how many candles did you blow out this year? 😉",
    "English Content V2":
      "Hi [first name],\nI hope you had a memorable birthday yesterday! 🎉\n \nI'm a bit late, but I still wanted to wish you a happy birthday! 🎂 May this year be filled with beautiful surprises and success in everything you undertake.\n \nHow do you feel with one more candle? 😄",
    "English Content V3":
      "Hey [first name] !\nA little late message to wish you a great birthday! 🥳 I hope your day yesterday was fabulous.\n \nI wish you lots of happiness and success for this new year to come! 🎂\n \nWhat are your goals for this new year? 🎈",
    "German Title": "Gestern Geburtstag",
    "German Content V1":
      "Hallo [first name], ich hoffe, du hattest gestern einen hervorragenden Geburtstag! 🥳\n \nIch wollte dir nachträglich alles Gute zum Geburtstag wünschen, auch wenn es einen Tag zu spät ist! 🙏\n \nMöge dir dieses neue Jahr viel Glück und Erfolg in allem bringen, was du unternimmst.\n \nAlso, wie viele Kerzen hast du dieses Jahr ausgeblasen? 😉",
    "German Content V2":
      "Hallo [first name],\nIch hoffe, du hattest gestern einen denkwürdigen Geburtstag! 🎉\n \nIch bin ein bisschen spät, aber ich wollte dir trotzdem alles Gute zum Geburtstag wünschen! 🎂 Möge dieses Jahr voller schöner Überraschungen und Erfolge in allem sein, was du unternimmst.\n \nWie fühlst du dich mit einer Kerze mehr? 😄",
    "German Content V3":
      "Hallo [first name] !\nEine kleine verspätete Nachricht, um dir einen tollen Geburtstag zu wünschen! 🥳 Ich hoffe, dein gestriger Tag war fabulos.\n \nIch wünsche dir viel Glück und Erfolg für das kommende Jahr! 🎂\n \nWas sind deine Ziele für dieses neue Jahr? 🎈",
    "Spanish Title": "Cumpleaños de ayer",
    "Spanish Content V1":
      "Hola [first name], ¡espero que hayas tenido un excelente cumpleaños ayer! 🥳\n \nQuería desearte un feliz cumpleaños, ¡aunque con un día de retraso! 🙏\n \nQue este nuevo año te traiga mucha felicidad y éxito en todo lo que emprendas.\n \nEntonces, ¿cuántas velas soplaste este año? 😉",
    "Spanish Content V2":
      "Hola [first name],\n¡Espero que hayas tenido un día de cumpleaños memorable ayer! 🎉\n \nEstoy un poco retrasado, pero aún así quería desearte un feliz cumpleaños. 🎂 Que este año esté lleno de bellas sorpresas y de éxitos en todo lo que emprendas.\n \n¿Cómo te sientes con una vela más? 😄",
    "Spanish Content V3":
      "¡Hola [first name]!\n¡Un pequeño mensaje tardío para desearte un super cumpleaños! 🥳 Espero que tu día de ayer haya sido fabuloso.\n \nTe deseo mucha felicidad y éxito para este nuevo año que viene! 🎂\n \n¿Cuáles son tus objetivos para este nuevo año? 🎈",
  },
  {
    Statut: "OK",
    Category: "Birthday",
    Article: 3,
    "French Title": "Anniversaire d’il y a 2 jours",
    "French Content V1":
      "🎉 Bonjour [first name], j’ai 2 jours de retard, mais je tenais tout de même à te souhaiter un joyeux anniversaire ! 🥳\n \nJ’espère que ta journée a été remplie de beaux moments et que cette nouvelle année sera pleine de succès pour toi. \n \nTu as pu fêter ça comme il se doit ou tu prolonges encore la fête ? 🎉",
    "French Content V2":
      "🎈Salut [first name], je suis un peu à la traîne, mais même avec 2 jours de retard je tenais absolument à te souhaiter un excellent anniversaire ! 🎉 \n \nJ’espère que ta journée a été remplie de joie et de beaux moments.\n \nAlors, quel est ton vœu pour cette nouvelle année ? 🌟",
    "French Content V3":
      "🥳 Hello [first name], je suis un peu en retard, mais il n’est jamais trop tard pour te souhaiter un joyeux anniversaire ! 🥂\n \nJ’espère que ta journée d’avant hier a été comme tu l’imaginais et que cette année t’apportera plein de belles réussites. \n \nD’ailleurs tu as soufflé combien de bougies cette année ? 😉",
    "English Title": "Birthday from 2 days ago",
    "English Content V1":
      "🎉 Hello [first name], I’m 2 days late, but I still wanted to wish you a happy birthday! 🥳\n \nI hope your day was filled with beautiful moments and that this new year will be full of success for you.\n \nDid you celebrate it properly or are you still extending the party? 🎉",
    "English Content V2":
      "🎈Hi [first name], I’m a bit late, but even with 2 days of delay I absolutely wanted to wish you an excellent birthday! 🎉\n \nI hope your day has been filled with joy and beautiful moments.\n \nSo, what is your wish for this new year? 🌟",
    "English Content V3":
      "🥳 Hey [first name], I’m a little late, but it’s never too late to wish you a happy birthday! 🥂\n \nI hope that your day before yesterday was as you imagined and that this year will bring you many beautiful successes.\n \nBy the way, how many candles did you blow out this year? 😉",
    "German Title": "Jahrestag vor 2 Tagen",
    "German Content V1":
      "🎉 Hallo [first name], ich bin 2 Tage zu spät, aber ich wollte dir trotzdem alles Gute zum Geburtstag wünschen! 🥳\n \nIch hoffe, dein Tag war voller schöner Momente und dass dieses neue Jahr voller Erfolg für dich sein wird.\n \nKonntest du das gebührend feiern oder verlängerst du die Feier noch? 🎉",
    "German Content V2":
      "🎈Hallo [first name], ich bin ein wenig im Rückstand, aber selbst mit 2 Tagen Verspätung wollte ich dir unbedingt einen ausgezeichneten Geburtstag wünschen! 🎉\n \nIch hoffe, dein Tag war erfüllt von Freude und schönen Momenten.\n \nAlso, was ist dein Wunsch für dieses neue Jahr? 🌟",
    "German Content V3":
      "🥳 Hallo [first name], ich bin ein wenig spät, aber es ist nie zu spät, dir alles Gute zum Geburtstag zu wünschen! 🥂\n \nIch hoffe, dein Vorgestern war so, wie du es dir vorgestellt hast, und dass dir dieses Jahr viele schöne Erfolge bringen wird.\n \nÜbrigens, wie viele Kerzen hast du dieses Jahr ausgeblasen? 😉",
    "Spanish Title": "Aniversario de hace 2 días",
    "Spanish Content V1":
      "🎉 Hola [first name], tengo 2 días de retraso, pero aún quería desearte un feliz cumpleaños! 🥳\n \nEspero que tu día haya estado lleno de buenos momentos y que este nuevo año esté lleno de éxitos para ti.\n \n¿Has podido celebrar como se debe o aplazaste la fiesta? 🎉",
    "Spanish Content V2":
      "🎈Hola [first name], estoy un poco atrasado, pero incluso con 2 días de retraso quería desearte un excelente cumpleaños! 🎉\n \nEspero que tu día haya estado lleno de alegría y hermosos momentos.\n \nEntonces, ¿cuál es tu deseo para este nuevo año? 🌟",
    "Spanish Content V3":
      "🥳 Hola [first name], estoy un poco atrasado, pero nunca es demasiado tarde para desearte un feliz cumpleaños. 🥂\n \nEspero que tu día de anteayer haya sido como lo imaginabas y que este año te traiga muchos grandes éxitos.\n \nPor cierto, ¿cuántas velas soplaste este año? 😉",
  },
  {
    Statut: "OK",
    Category: "Engagement",
    Article: 1,
    "French Title": "Envoi d’un contenu | Réseaux Sociaux",
    "French Content V1":
      "Bonjour [first name], j’ai récemment publié un post sur [sujet] qui pourrait vraiment t'intéresser.\n \nÇa serait super d’avoir ton avis ou même que tu le partages avec d'autres. 🙏\n \nTu peux le retrouver ici : [lien du post/reel]. \nFais-moi savoir ce que tu en penses ! 😉",
    "French Content V2":
      "Salut [first name],\nJe viens de partager un nouveau post sur [sujet], et je pense qu’il pourrait vraiment t’inspirer ! 😊\n \nSi tu as un moment, j’aimerais bien savoir ce que tu en penses, et si ça te parle, n’hésite pas à le partager avec ton réseau. 🙌\n \nLe lien est juste ici : [lien du post/reel]. \nHâte d’avoir ton retour ! ✨",
    "French Content V3":
      "Hello [first name], je viens de publier quelque chose sur [sujet] qui pourrait t’intéresser. \n \nÇa me ferait plaisir d’avoir ton feedback, et si tu trouves ça pertinent, n’hésite pas à le diffuser autour de toi. 🙏\n \nTu peux le voir ici 👉 [lien du post/reel]. \nJe suis impatient de discuter de ton avis ! 🚀",
    "English Title": "Sending content | Social Networks",
    "English Content V1":
      "Hello [first name], I recently published a post about [topic] that might really interest you.\n \nIt would be great to have your opinion or even for you to share it with others. 🙏\n \nYou can find it here: [link to the post/reel].\nLet me know what you think! 😉",
    "English Content V2":
      "Hi [first name],\nI just shared a new post on [topic], and I think it could really inspire you! 😊\n \nIf you have a moment, I would love to know what you think, and if it resonates with you, feel free to share it with your network. 🙌\n \nThe link is right here: [link to post/reel].\nLooking forward to hearing your feedback! ✨",
    "English Content V3":
      "Hey [first name], I just published something on [topic] that might interest you.\n \nI would be happy to have your feedback, and if you find it relevant, feel free to share it around you. 🙏\n \nYou can see it here 👉 [link to the post/reel].\nI look forward to discussing your opinion! 🚀",
    "German Title": "Inhalt senden | Soziale Netzwerke",
    "German Content V1":
      "Hallo [first name], ich habe kürzlich einen Beitrag über [Thema] veröffentlicht, der dich wirklich interessieren könnte.\n \nEs wäre super, deine Meinung dazu zu hören oder sogar, wenn du ihn mit anderen teilst. 🙏\n \nDu kannst ihn hier finden: [Link zum Beitrag/Reel].\nLass mich wissen, was du davon hältst! 😉",
    "German Content V2":
      "Hallo [first name],\nIch habe gerade einen neuen Beitrag über [Thema] geteilt, und ich denke, dass er dich wirklich inspirieren könnte! 😊\n \nWenn du einen Moment hast, würde ich gerne wissen, was du davon hältst, und falls es dir gefällt, zögere nicht, ihn mit deinem Netzwerk zu teilen. 🙌\n \nDer Link ist hier: [Link zum Beitrag/Reel].\nIch freue mich auf dein Feedback! ✨",
    "German Content V3":
      "Hallo [first name], ich habe gerade etwas über [Thema] veröffentlicht, das dich interessieren könnte.\n \nEs würde mich freuen, dein Feedback zu erhalten, und wenn du es relevant findest, zögere nicht, es in deinem Umfeld zu teilen. 🙏\n \nDu kannst es hier sehen 👉 [Link zum Post/Reel].\nIch freue mich darauf, deine Meinung zu diskutieren! 🚀",
    "Spanish Title": "Envío de un contenido | Redes Sociales",
    "Spanish Content V1":
      "Hola [first name], recientemente publiqué un post sobre [sujeto] que realmente podría interesarte.\n \nSería genial tener tu opinión o incluso que lo compartas con otros. 🙏\n \nPuedes encontrarlo aquí: [enlace del post/reel].\n¡Dime qué piensas! 😉",
    "Spanish Content V2":
      "Hola [first name],\nAcabo de compartir una nueva publicación sobre [tema], ¡y creo que realmente podría inspirarte! 😊\n \nSi tienes un momento, me gustaría saber qué piensas, y si te resuena, no dudes en compartirlo con tu red. 🙌\n \nEl enlace está justo aquí: [enlace del post/reel].\n¡Espero tu respuesta! ✨",
    "Spanish Content V3":
      "Hola [first name], acabo de publicar algo sobre [tema] que podría interesarte.\n \nMe gustaría tener tu opinión, y si lo encuentras relevante, no dudes en difundirlo a tu alrededor. 🙏\n \nPuedes verlo aquí 👉 [enlace de la publicación/reel].\n¡Estoy ansioso por discutir tu opinión! 🚀",
  },
  {
    Statut: "OK",
    Category: "Engagement",
    Article: 2,
    "French Title": "Rejoindre un Groupe Facebook",
    "French Content V1":
      "Bonjour [first name] 🙋, est-ce que tu t'intéresses à [sujet] ? \n \nJ’ai créé un groupe Facebook dédié à [sujet], où nous partageons des discussions exclusives et du contenu inédit concernant [éléments clés].\n \nEn tant que membre, tu auras accès à des ressources et des échanges que tu ne trouveras pas ailleurs. \n \nRejoins-nous ici : [lien du groupe]\nN’hésite pas si tu as des questions 😊",
    "French Content V2":
      "Salut [first name] ! 🎉\nSi tu es curieux(se) à propos de [sujet], j’ai quelque chose qui pourrait t’intéresser. J’ai monté un groupe Facebook où on parle de [sujet], et on partage du contenu que tu ne trouveras nulle part ailleurs.\n \nTu pourrais vraiment y trouver des ressources intéressantes et échanger avec des personnes qui sont sur la même longueur d’onde.\n \nLe groupe est ici, si tu veux nous rejoindre : [lien du groupe]\nAu plaisir 😉",
    "French Content V3":
      "Hello [first name] ! 👋\nJe voulais te parler d’un groupe Facebook que j’ai récemment lancé sur [sujet]. C’est un endroit où l’on partage des astuces, du contenu exclusif et des discussions passionnantes.\n \nSi tu cherches un espace pour creuser ce sujet avec d'autres passionnés, c'est l’endroit parfait !\n \nViens voir par toi-même en rejoignant ici : [lien du groupe]\nÀ bientôt dans le groupe ! 💡",
    "English Title": "Join a Facebook Group",
    "English Content V1":
      "Hello [first name] 🙋, are you interested in [subject]?\n \nI created a Facebook group dedicated to [subject], where we share exclusive discussions and unique content regarding [key elements].\n \nAs a member, you will have access to resources and exchanges that you won't find anywhere else.\n \nJoin us here: [group link]\nFeel free to reach out if you have any questions 😊",
    "English Content V2":
      "Hi [first name]! 🎉\nIf you are curious about [topic], I have something that might interest you. I set up a Facebook group where we talk about [topic], and we share content that you won’t find anywhere else.\n \nYou could really find interesting resources there and connect with people who are on the same wavelength.\n \nThe group is here, if you want to join us: [group link]\nLooking forward to it 😉",
    "English Content V3":
      "Hey [first name] ! 👋\nI wanted to talk to you about a Facebook group that I recently started on [topic]. It's a place where we share tips, exclusive content, and exciting discussions.\n \nIf you're looking for a space to dive into this topic with other enthusiasts, this is the perfect place!\n \nCome see for yourself by joining here: [group link]\nSee you soon in the group! 💡",
    "German Title": "Eine Facebook-Gruppe beitreten",
    "German Content V1":
      "Hallo [first name] 🙋, interessierst du dich für [Thema]?\n \nIch habe eine Facebook-Gruppe gegründet, die sich mit [Thema] beschäftigt, in der wir exklusive Diskussionen und unveröffentlichten Inhalt zu [Schlüsselthemen] teilen.\n \nAls Mitglied hast du Zugang zu Ressourcen und Austausch, die du sonst nirgendwo finden wirst.\n \nTritt uns hier bei: [Gruppenlink]\nZögere nicht, wenn du Fragen hast 😊",
    "German Content V2":
      "Hallo [first name]! 🎉\nWenn du neugierig auf [Thema] bist, habe ich etwas, das dich interessieren könnte. Ich habe eine Facebook-Gruppe gegründet, in der wir über [Thema] sprechen und Inhalte teilen, die du nirgendwo sonst finden wirst.\n \nDu könntest dort wirklich interessante Ressourcen finden und dich mit Menschen austauschen, die auf derselben Wellenlänge sind.\n \nDie Gruppe ist hier, falls du uns beitreten möchtest: [Gruppenlink]\nFreue mich auf dich 😉",
    "German Content V3":
      "Hallo [first name]! 👋\nIch wollte dir von einer Facebook-Gruppe erzählen, die ich kürzlich zu [Thema] gestartet habe. Es ist ein Ort, an dem wir Tipps, exklusive Inhalte und spannende Diskussionen teilen.\n \nWenn du einen Raum suchst, um dieses Thema mit anderen Enthusiasten zu vertiefen, ist das der perfekte Ort!\n \nKomm und schau selbst vorbei, indem du hier beitrittst: [Gruppenlink]\nBis bald in der Gruppe! 💡",
    "Spanish Title": "Unirse a un Grupo de Facebook",
    "Spanish Content V1":
      "Hola [first name] 🙋, ¿te interesa [tema]?\n \nHe creado un grupo de Facebook dedicado a [tema], donde compartimos discusiones exclusivas y contenido inédito sobre [elementos claves].\n \nComo miembro, tendrás acceso a recursos e intercambios que no encontrarás en otro lugar.\n \nÚnete a nosotros aquí: [enlace del grupo]\nNo dudes en preguntar si tienes alguna pregunta 😊",
    "Spanish Content V2":
      "¡Hola [first name]! 🎉\nSi tienes curiosidad sobre [tema], tengo algo que podría interesarte. He creado un grupo de Facebook donde hablamos de [tela], y compartimos contenido que no encontrarás en ningún otro lugar.\n \nRealmente podrías encontrar recursos interesantes e intercambiar ideas con personas que están en la misma sintonía.\n \nEl grupo está aquí, si quieres unirte a nosotros: [enlace del grupo]\n¡Con gusto! 😉",
    "Spanish Content V3":
      "Hola [first name] ! 👋\nQuería hablarte de un grupo de Facebook que he lanzado recientemente sobre [tema]. Es un lugar donde compartimos consejos, contenido exclusivo y discusiones emocionantes.\n \nSi estás buscando un espacio para profundizar en este tema con otros apasionados del [tema], ¡es el lugar perfecto!\n \n¡Ven a verlo por ti mismo uniéndote aquí: [enlace del grupo]\n¡Hasta pronto en el grupo! 💡",
  },
  {
    Statut: "OK",
    Category: "Follow-Up",
    Article: 1,
    "French Title": "Prise de rendez-vous après rencontre",
    "French Content V1":
      "Bonjour [first name] 😊, notre discussion sur [sujet] a certainement ouvert de nouvelles perspectives pour optimiser [processus/activité]. \n \nJe pense qu'il serait intéressant de voir comment [produit/service] peut s’intégrer dans tes projets actuels pour atteindre [résultat clé] 🏆. \n \nJe te propose de choisir un créneau pour qu’on en parle : [lien de prise de rendez-vous].",
    "French Content V2":
      "Salut [first name] ! 👋 \nAprès notre échange sur [sujet], j’ai réfléchi à quelques pistes pour améliorer [processus/activité].\n \nJe suis convaincu que [produit/service] pourrait parfaitement s’intégrer à tes projets et t’aider à atteindre [résultat clé] 🎯.\n \nChoisis un créneau ici pour qu’on puisse en discuter : [lien de prise de rendez-vous].",
    "French Content V3":
      "Hello [first name], notre échange récent sur [sujet] m’a vraiment fait réfléchir. Je vois de belles opportunités pour optimiser [processus/activité] avec [produit/service].\n \nÇa pourrait t’aider à atteindre rapidement [résultat clé] 🔥. \n \nÇa te dirait de prendre un moment pour en discuter ? \nChoisis un créneau ici 👉 [lien de prise de rendez-vous].",
    "English Title": "Appointment booking after meeting",
    "English Content V1":
      "Hello [first name] 😊, our discussion about [subject] certainly opened up new perspectives for optimizing [process/activity].\n \nI think it would be interesting to see how [product/service] can fit into your current projects to achieve [key result] 🏆.\n \nI suggest you choose a time slot so we can talk about it: [appointment link].",
    "English Content V2":
      "Hi [first name]! 👋\nAfter our conversation about [subject], I thought about some ideas to improve [process/activity].\n \nI am convinced that [product/service] could perfectly fit into your projects and help you achieve [key result] 🎯.\n \nChoose a time slot here so we can discuss it: [appointment link].",
    "English Content V3":
      "Hey [first name], our recent exchange about [subject] really made me think. I see great opportunities to optimize [process/activity] with [product/service].\n \nIt could help you achieve [key result] quickly 🔥.\n \nWould you like to take a moment to discuss it?\nChoose a slot here 👉 [appointment link].",
    "German Title": "Terminvereinbarung nach dem Treffen",
    "German Content V1":
      "Hallo [first name] 😊, unsere Diskussion über [Thema] hat sicherlich neue Perspektiven eröffnet, um [Prozess/Aktivität] zu optimieren.\n \nIch denke, es wäre interessant zu sehen, wie [Produkt/Dienstleistung] sich in deine aktuellen Projekte integrieren lässt, um [Schlüsselergebnis] zu erreichen 🏆.\n \nIch schlage vor, dass du einen Termin auswählst, um darüber zu sprechen: [Link zur Terminvereinbarung].",
    "German Content V2":
      "Hallo [first name]! 👋\nNach unserem Austausch über [Thema] habe ich über ein paar Ansätze nachgedacht, um [Prozess/Aktivität] zu verbessern.\n \nIch bin überzeugt, dass [Produkt/Dienstleistung] perfekt in deine Projekte integriert werden könnte und dir helfen wird, [Schlüsselresultat] zu erreichen 🎯.\n \nWähle hier einen Termin aus, damit wir darüber sprechen können: [Link zur Terminvereinbarung].",
    "German Content V3":
      "Hallo [first name], unser jüngster Austausch über [Thema] hat mich wirklich zum Nachdenken angeregt. Ich sehe schöne Möglichkeiten, um [Prozess/Aktivität] mit [Produkt/Dienstleistung] zu optimieren.\n \nDas könnte dir helfen, schnell [Schlüsselergebnis] zu erreichen 🔥.\n \nHättest du Lust, einen Moment darüber zu sprechen?\nWähle hier einen Termin 👉 [Terminlink].",
    "Spanish Title": "Solicitud de cita después de la reunión",
    "Spanish Content V1":
      "Hola [first name] 😊, nuestra discusión sobre [tema] ciertamente ha abierto nuevas perspectivas para optimizar [procesos/actividad].\n \nCreo que sería interesante ver cómo [producto/servicio] puede integrarse en tus proyectos actuales para alcanzar [resultado clave] 🏆.\n \nTe propongo elegir un horario para que hablemos de ello: [enlace para agendar cita].",
    "Spanish Content V2":
      "¡Hola [first name]! 👋\nDespués de nuestra conversación sobre [tema], he pensado en algunas ideas para mejorar [proceso/actividad].\n \nEstoy convencido de que [producto/servicio] podría integrarse perfectamente en tus proyectos y ayudarte a alcanzar [resultado clave] 🎯.\n \nElige un horario aquí para que podamos discutirlo: [enlace para agendar una cita].",
    "Spanish Content V3":
      "Hola [first name], nuestra reciente conversación sobre [tema] realmente me hizo reflexionar. Veo grandes oportunidades para optimizar [proceso/actividad] con [producto/servicio].\n \nEso podría ayudarte a alcanzar rápidamente [resultado clave] 🔥.\n \n¿Te gustaría tomar un momento para discutirlo?\nElige un horario aquí 👉 [enlace para agendar una cita].",
  },
  {
    Statut: "OK",
    Category: "Follow-Up",
    Article: 2,
    "French Title": "Prise de rendez-vous après événement",
    "French Content V1":
      "Bonjour [first name], suite à l’événement [nom], je pense que [produit/service] pourrait vraiment t’aider à concrétiser les idées évoquées pour [résultat clé] 🎯. \n \nSi tu veux avancer, choisis un créneau ici :\n✅ [lien de prise de rendez-vous].",
    "French Content V2":
      "🙋‍♂️ Salut [first name], après l’événement [nom], j’ai pensé à comment [produit/service] pourrait t’aider à mettre en pratique ce que nous avons discuté pour atteindre [résultat clé].\n \nSi tu es prêt à aller de l’avant, réserve un créneau ici pour qu’on en parle.\n👉 [lien de prise de rendez-vous]",
    "French Content V3":
      "Hello [first name] ! 🎉\n \nSuite à l’événement [nom], j'ai pensé que [produit/service] pourrait vraiment être un game-changer pour toi. Imagine pouvoir [résultat clé] 🔥 en un temps record grâce à une approche innovante !\n \nPlutôt que d’attendre, prenons un moment pour explorer ça ensemble. \nRéserve ton créneau ici : [lien de prise de rendez-vous].",
    "English Title": "Appointment scheduling after event",
    "English Content V1":
      "Hello [first name], following the event [name], I think that [product/service] could really help you realize the ideas discussed for [key result] 🎯.\n \nIf you want to move forward, choose a time slot here:\n✅ [link to schedule an appointment].",
    "English Content V2":
      "🙋‍♂️ Hi [first name], after the [name] event, I thought about how [product/service] could help you put into practice what we discussed to achieve [key result].\n \nIf you are ready to move forward, book a time slot here so we can discuss it.\n👉 [appointment link]",
    "English Content V3":
      "Hey [first name]! 🎉\n \nFollowing the event [name], I thought that [product/service] could really be a game-changer for you. Imagine being able to [key result] 🔥 in record time thanks to an innovative approach!\n \nInstead of waiting, let's take a moment to explore this together.\nBook your slot here: [appointment link].",
    "German Title": "Terminvereinbarung nach der Veranstaltung",
    "German Content V1":
      "Hallo [first name], im Anschluss an die Veranstaltung [Name] denke ich, dass [Produkt/Dienstleistung] dir wirklich helfen könnte, die für [Schlüsselergebnis] angesprochenen Ideen zu verwirklichen 🎯.\n \nWenn du weiterkommen möchtest, wähle hier einen Termin aus:\n✅ [Link zur Terminvereinbarung].",
    "German Content V2":
      "🙋‍♂️ Hallo [first name], nach der Veranstaltung [Name] habe ich darüber nachgedacht, wie [Produkt/Dienstleistung] dir helfen könnte, das, was wir besprochen haben, in die Praxis umzusetzen, um [Schlüsselresultat] zu erreichen.\n \nWenn du bereit bist, den nächsten Schritt zu gehen, buche hier einen Termin, damit wir darüber sprechen können.\n👉 [Link zur Terminvereinbarung]",
    "German Content V3":
      "Hallo [first name]! 🎉\n \nNach der Veranstaltung [Name] dachte ich, dass [Produkt/Dienstleistung] wirklich ein Game-Changer für dich sein könnte. Stell dir vor, du könntest [Schlüsselergebnis] 🔥 in Rekordzeit dank eines innovativen Ansatzes erreichen!\n \nAnstatt zu warten, lass uns einen Moment nehmen, um das gemeinsam zu erkunden.\nReserviere deinen Termin hier: [Link zur Terminvereinbarung].",
    "Spanish Title": "Solicitud de cita después del evento",
    "Spanish Content V1":
      "Hola [first name], tras el evento [nombre del evento], creo que [producto/servicio] podría realmente ayudarte a concretar las ideas mencionadas para [resultado clave] 🎯.\n \nSi quieres avanzar, elige un horario aquí:\n✅ [enlace para agendar cita].",
    "Spanish Content V2":
      "🙋‍♂️ Hola [first name], después del evento [nombre], pensé en cómo [producto/servicio] podría ayudarte a poner en práctica lo que discutimos para alcanzar [resultado clave].\n \nSi estás listo para avanzar, reserva un espacio aquí para que hablemos.\n👉 [enlace para reservar cita]",
    "Spanish Content V3":
      "Hola [first name]! 🎉\n \nDespués del evento [nombre], pensé que [producto/servicio] realmente podría marcar un antes y un después para ti. ¡Imagina poder [resultado clave] 🔥 en un tiempo récord gracias a un enfoque innovador!\n \nEn lugar de esperar, tomemos un momento para explorar esto juntos.\nReserva tu espacio aquí: [enlace para reservar cita].",
  },
  {
    Statut: "OK",
    Category: "Invitation",
    Article: 1,
    "French Title": "Démonstration Zoom",
    "French Content V1":
      "👋 Bonjour [first name], si tu cherches une solution rapide et efficace pour [problème spécifique] 🚀, je t’invite à une démonstration en direct sur Zoom de [produit/service]. \n \nEn quelques minutes, tu découvriras comment cette solution peut transformer [processus/activité], grâce à [bénéfices clés]. \n \nLes places sont limitées, inscris-toi ici : [lien de réservation]",
    "French Content V2":
      "Salut [first name],\nTu en as marre de [problème spécifique] ? J’ai une solution qui pourrait bien te surprendre ! 🎯\n \nJe t’invite à assister à une démo en live sur Zoom, où tu verras comment [produit/service] peut simplifier [processus/activité] et t’offrir des résultats concrets avec [bénéfices clés].\n \nC’est rapide, efficace, et les places sont limitées, donc n’attends pas ! \nRéserve ta place ici : [lien de réservation] 🚀",
    "French Content V3":
      "Hello [first name] !\nImagine une solution qui pourrait régler [problème spécifique] en un rien de temps. C’est exactement ce que je vais te montrer lors d’une démo exclusive en direct sur Zoom ! 🚀\n \nEn quelques minutes, tu comprendras comment [produit/service] peut révolutionner [processus/activité] et t'apporter [bénéfices clés].\n \nLe nombre de places est limité, alors réserve vite ici \n✅ [lien de réservation]",
    "English Title": "Zoom demonstration",
    "English Content V1":
      "👋 Hello [first name], if you're looking for a quick and effective solution for [specific problem] 🚀, I invite you to a live demonstration on Zoom of [product/service].\n \nIn just a few minutes, you'll discover how this solution can transform [process/activity], thanks to [key benefits].\n \nSpaces are limited, sign up here: [booking link]",
    "English Content V2":
      "Hi [first name],\nAre you tired of [specific problem]? I have a solution that might surprise you! 🎯\n \nI invite you to attend a live demo on Zoom, where you will see how [product/service] can simplify [process/activity] and offer you concrete results with [key benefits].\n \nIt's quick, efficient, and spots are limited, so don't wait!\nReserve your spot here: [reservation link] 🚀",
    "English Content V3":
      "Hey [first name] !\nImagine a solution that could solve [specific problem] in no time. This is exactly what I will show you during an exclusive live demo on Zoom! 🚀\n \nIn just a few minutes, you will understand how [product/service] can revolutionize [process/activity] and bring you [key benefits].\n \nThe number of spots is limited, so book quickly here\n✅ [booking link]",
    "German Title": "Démonstration Zoom",
    "German Content V1":
      "👋 Hallo [first name], wenn du nach einer schnellen und effektiven Lösung für [spezifisches Problem] 🚀 suchst, lade ich dich zu einer Live-Demonstration auf Zoom von [Produkt/Dienstleistung] ein.\n \nIn nur wenigen Minuten wirst du entdecken, wie diese Lösung [Prozess/Aktivität] transformieren kann, dank [Schlüsselvorteilen].\n \nDie Plätze sind begrenzt, melde dich hier an: [Reservierungslink]",
    "German Content V2":
      "Hallo [first name],\nHast du genug von [spezifisches Problem]? Ich habe eine Lösung, die dich überraschen könnte! 🎯\n \nIch lade dich ein, an einer Live-Demo auf Zoom teilzunehmen, wo du sehen wirst, wie [Produkt/Dienstleistung] [Prozess/Aktivität] vereinfachen und dir greifbare Ergebnisse mit [Schlüsselnutzen] bieten kann.\n \nEs ist schnell, effizient, und die Plätze sind begrenzt, also warte nicht!\nReserviere deinen Platz hier: [Reservierungslink] 🚀",
    "German Content V3":
      "Hallo [first name] !\nStell dir eine Lösung vor, die [spezifisches Problem] im Handumdrehen lösen könnte. Genau das werde ich dir während einer exklusiven Live-Demo auf Zoom zeigen! 🚀\n \nIn wenigen Minuten wirst du verstehen, wie [Produkt/Dienstleistung] [Prozess/Aktivität] revolutionieren und dir [schlüssige Vorteile] bringen kann.\n \nDie Anzahl der Plätze ist begrenzt, also reserviere schnell hier\n✅ [Reservierungslink]",
    "Spanish Title": "Demonstración Zoom",
    "Spanish Content V1":
      "👋 Hola [first name], si estás buscando una solución rápida y eficaz para [problema específico] 🚀, te invito a una demostración en vivo por Zoom de [producto/servicio].\n \nEn pocos minutos, descubrirás cómo esta solución puede transformar [proceso/actividad], gracias a [beneficios clave].\n \nLas plazas son limitadas, inscríbete aquí: [enlace de reserva]",
    "Spanish Content V2":
      "Hola [first name],\n¿Estás cansado de [problema específico]? ¡Tengo una solución que podría sorprenderte! 🎯\n \nTe invito a asistir a una demostración en vivo por Zoom, donde verás cómo [producto/servicio] puede simplificar [proceso/actividad] y ofrecerte resultados concretos con [beneficios clave].\n \nEs rápido, eficaz, y los lugares son limitados, así que ¡no esperes más!\nReserva tu lugar aquí: [enlace de reserva] 🚀",
    "Spanish Content V3":
      "Hola [first name] !\nImagina una solución que podría resolver [problema específico] en un abrir y cerrar de ojos. ¡Eso es exactamente lo que te voy a mostrar durante una demostración exclusiva en vivo por Zoom! 🚀\n \nEn unos minutos, entenderás cómo [producto/servicio] puede revolucionar [proceso/actividad] y brindarte [beneficios clave].\n \nEl número de lugares es limitado, así que reserva rápido aquí\n✅ [enlace de reserva]",
  },
  {
    Statut: "OK",
    Category: "Lead Generation",
    Article: 1,
    "French Title": "Message Direct",
    "French Content V1":
      "Bonjour [first name], as-tu déjà pensé à comment simplifier [activité/problème] dans ta vie quotidienne ? \n \nCe que nous proposons pourrait te faciliter les choses, comme ça l’a fait pour beaucoup d’autres [entreprises/personnes]. \nNotre solution est conçue pour t’aider à atteindre [résultat clé]. \n \nSi tu veux en discuter rapidement, fais-moi signe, je suis disponible cette semaine ! 😊”",
    "French Content V2":
      "Salut [first name], simplifier [activité/problème] peut sembler compliqué, mais nous avons aidé de nombreuses [entreprises/personnes] à y parvenir. \n \nAvec notre solution, tu pourrais rapidement obtenir [résultat clé] sans effort supplémentaire.\n \nTu as un peu de temps cette semaine pour qu’on en parle ? Fais-moi signe ! 😊",
    "French Content V3":
      "Hello [first name], et si [activité/problème] devenait enfin facile à gérer au quotidien ? \n \nC’est exactement ce que notre solution a permis à beaucoup de [entreprises/personnes]. \n \nElle pourrait aussi t’aider à atteindre [résultat clé] plus vite que tu ne le penses.\n \nDis-moi si tu veux en discuter, je suis disponible cette semaine ! 😊",
    "English Title": "Direct Message",
    "English Content V1":
      "Hello [first name], have you ever thought about how to simplify [activity/problem] in your daily life?\n \nWhat we offer could make things easier for you, just as it has for many other [businesses/people].\nOur solution is designed to help you achieve [key result].\n \nIf you want to discuss it quickly, let me know, I'm available this week! 😊",
    "English Content V2":
      "Hi [first name], simplifying [activity/problem] may seem complicated, but we have helped many [businesses/people] achieve it.\n \nWith our solution, you could quickly achieve [key result] with no extra effort.\n \nDo you have some time this week to discuss it? Let me know! 😊",
    "English Content V3":
      "Hey [first name], what if [activity/problem] finally became easy to manage on a daily basis?\n \nThat’s exactly what our solution has enabled many [companies/people] to do.\n \nIt could also help you achieve [key result] faster than you think.\n \nLet me know if you want to discuss it, I am available this week! 😊",
    "German Title": "Nachricht Direkt",
    "German Content V1":
      "Hallo [first name], hast du schon einmal darüber nachgedacht, wie du [Aktivität/Problem] in deinem Alltag vereinfachen kannst?\n \nWas wir anbieten, könnte dir die Dinge erleichtern, so wie es für viele andere [Unternehmen/Personen] der Fall war.\nUnsere Lösung ist darauf ausgelegt, dir zu helfen, [Schlüsselresultat] zu erreichen.\n \nWenn du schnell darüber sprechen möchtest, lass es mich wissen, ich bin diese Woche verfügbar! 😊",
    "German Content V2":
      "Hallo [first name], die Vereinfachung von [Aktivität/Problem] mag kompliziert erscheinen, aber wir haben vielen [Unternehmen/Personen] geholfen, dies zu erreichen.\n\nMit unserer Lösung könntest du schnell [Schlüsselergnis] ohne zusätzlichen Aufwand erzielen.\n\nHast du diese Woche ein wenig Zeit, um darüber zu sprechen? Lass es mich wissen! 😊",
    "German Content V3":
      "Hallo [first name], und wenn [Aktivität/Problem] endlich einfach im Alltag zu bewältigen wäre?\n\nGenau das hat unsere Lösung vielen [Unternehmen/Personen] ermöglicht.\n\nSie könnte dir auch helfen, [Schlüsselergnis] schneller zu erreichen, als du denkst.\n\nSag mir Bescheid, wenn du darüber sprechen möchtest, ich bin diese Woche verfügbar! 😊",
    "Spanish Title": "Mensaje Directo",
    "Spanish Content V1":
      "Hola [first name], ¿alguna vez has pensado en cómo simplificar [actividad/problema] en tu vida cotidiana?\n\nLo que proponemos podría facilitarte las cosas, como lo ha hecho para muchas otras [empresas/personas].\nNuestra solución está diseñada para ayudarte a alcanzar [resultado clave].\n\nSi quieres discutirlo rápidamente, házmelo saber, ¡estoy disponible esta semana! 😊",
    "Spanish Content V2":
      "Hola [first name], simplificar [actividad/problema] puede parecer complicado, pero hemos ayudado a muchas [empresas/personas] a lograrlo.\n\nCon nuestra solución, podrías obtener rápidamente [resultado clave] sin esfuerzo adicional.\n\n¿Tienes un poco de tiempo esta semana para que hablemos de esto? ¡Avísame! 😊",
    "Spanish Content V3":
      "Hola [first name], ¿y si [actividad/problema] fuera por fin fácil de manejar en el día a día?\n\nEso es exactamente lo que nuestra solución ha permitido a muchas [empresas/personas].\n\nTambién podría ayudarte a alcanzar [resultado clave] más rápido de lo que piensas.\n\n¡Dime si quieres hablar de ello, estoy disponible esta semana! 😊",
  },
  {
    Statut: "OK",
    Category: "Lead Generation",
    Article: 2,
    "French Title": "Envoi d’un Ebook Gratuit",
    "French Content V1":
      "Bonjour [first name]🙋, je voulais savoir si tu t’intéresses à [sujet] ? \n\nJ’ai récemment rédigé un ebook qui explore [description rapide du contenu]. Il pourrait vraiment t’aider à [résultat clé], et je suis ravi de te l’offrir 🎁 gratuitement. \n\nTu peux le télécharger ici \n👉 [lien de téléchargement]. \n\nN’hésite pas à me faire un retour si ça t’a été utile !",
    "French Content V2":
      "👋 Salut [first name], as-tu déjà eu l’occasion d’approfondir [sujet] ?\n\nSi c’est quelque chose qui t’intéresse, je pense que tu pourrais apprécier un ebook que j’ai mis en place. Il regroupe des conseils pratiques et des idées sur [contenu du livre].\n\nCe qui est top, c’est que c’est entièrement gratuit 🎁. Si ça t’intéresse, tu peux le télécharger directement ici : [lien de téléchargement].\n\nJ’espère que ça pourra vraiment t’apporter des connaissances utiles pour [résultat clé] ! \nFais-moi savoir ton avis après lecture 😉.",
    "French Content V3":
      "Hello [first name] ! 🚀 \n\nJe me suis dit que tu pourrais trouver intéressant cet ebook que j'ai récemment créé. Il parle [sujet], avec des conseils et astuces pour [résultat clé]. \nC'est un petit guide pratique que je t'offre avec plaisir 🎁 !\n\nSi tu veux jeter un œil, c'est par ici 👉 [lien de téléchargement].\n\nJe suis curieux de savoir ce que tu en penses une fois que tu l'auras feuilleté. 😊",
    "English Title": "Sending a Free Ebook",
    "English Content V1":
      "Hello [first name]🙋, I wanted to know if you are interested in [subject]?\n\nI recently wrote an ebook that explores [quick description of the content]. It could really help you to [key result], and I am excited to offer it to you 🎁 for free.\n\nYou can download it here\n👉 [download link].\n \nFeel free to give me feedback if it was helpful to you!",
    "English Content V2":
      "👋 Hi [first name], have you had the chance to delve deeper into [topic]?\n \nIf this is something that interests you, I think you might appreciate an ebook that I’ve put together. It includes practical tips and ideas on [book content].\n \nThe great thing is that it’s completely free 🎁. If you’re interested, you can download it directly here: [download link].\n \nI hope it can really provide you with useful knowledge for [key outcome]!\nLet me know your thoughts after reading 😉.",
    "English Content V3":
      "Hey [first name] ! 🚀\n \nI thought you might find this ebook I recently created interesting. It talks about [topic], with tips and tricks for [key result].\nIt's a little practical guide that I'm happy to offer you 🎁 !\n \nIf you want to take a look, it's over here 👉 [download link].\n \nI'm curious to know what you think once you've flipped through it. 😊",
    "German Title": "Versand eines kostenlosen E-Books",
    "German Content V1":
      "Hallo [first name]🙋, ich wollte wissen, ob du dich für [Thema] interessierst?\n \nIch habe kürzlich ein Ebook geschrieben, das [kurze Inhaltsbeschreibung] erkundet. Es könnte dir wirklich helfen, [Schlüsselresultat] zu erreichen, und ich freue mich, es dir 🎁 kostenlos anzubieten.\n \nDu kannst es hier herunterladen\n👉 [Download-Link].\n \nZögere nicht, mir Feedback zu geben, wenn es dir hilfreich war!",
    "German Content V2":
      "👋 Hallo [first name], hattest du schon die Gelegenheit, [Thema] näher zu betrachten?\n \nWenn das etwas ist, das dich interessiert, denke ich, dass du ein Ebook, das ich erstellt habe, zu schätzen wissen könntest. Es enthält praktische Tipps und Ideen zu [Inhalt des Buches].\n \nDas Beste daran ist, dass es völlig kostenlos ist 🎁. Wenn es dich interessiert, kannst du es direkt hier herunterladen: [Download-Link].\n \nIch hoffe, dass es dir wirklich nützliche Kenntnisse für [Schlüssel-Ergebnis] bringen kann! Lass mich nach dem Lesen wissen, was du davon hältst 😉.",
    "German Content V3":
      "Hallo [first name]! 🚀\n \nIch dachte, dass du dieses Ebook, das ich kürzlich erstellt habe, interessant finden könntest. Es handelt von [Thema], mit Tipps und Tricks für [Schlüsselresultat].\nEs ist ein kleiner praktischer Leitfaden, den ich dir gerne anbiete 🎁!\n \nWenn du einen Blick darauf werfen möchtest, hier entlang 👉 [Download-Link].\n \nIch bin neugierig zu erfahren, was du darüber denkst, sobald du es durchgeblättert hast. 😊",
    "Spanish Title": "Envío de un Ebook Gratis",
    "Spanish Content V1":
      "Hola [first name]🙋, quería saber si te interesa [tema]?\n \nRecientemente he escrito un ebook que explora [descripción rápida del contenido]. Realmente podría ayudarte a [resultado clave], y me encantaría ofrecértelo 🎁 de forma gratuita.\n \nPuedes descargarlo aquí\n👉 [enlace de descarga].\n \n¡No dudes en darme tu opinión si te ha sido útil!",
    "Spanish Content V2":
      "👋 Hola [first name], ¿has tenido la oportunidad de profundizar en [tema]?\n \nSi es algo que te interesa, creo que podrías disfrutar de un ebook que he preparado. Reúne consejos prácticos e ideas sobre [contenido del libro].\n \nLo mejor es que es completamente gratis 🎁. Si te interesa, puedes descargarlo directamente aquí: [enlace de descarga].\n \n¡Espero que realmente te aporte conocimientos útiles para [resultado clave]!\nDéjame saber tu opinión después de leerlo 😉.",
    "Spanish Content V3":
      "Hola [first name] ! 🚀 \n \nMe dije que podrías encontrar interesante este ebook que he creado recientemente. Habla sobre [tema], con consejos y trucos para [resultado clave].\nEs una pequeña guía práctica que te ofrezco con gusto 🎁 !\n \nSi quieres echar un vistazo, está por aquí 👉 [enlace de descarga].\n \nTengo curiosidad por saber qué piensas una vez que lo hayas hojeado. 😊",
  },
  {
    Statut: "OK",
    Category: "lead Generation",
    Article: 3,
    "French Title": "Intérêt en Commun",
    "French Content V1":
      "Bonjour [first name] 😃\nJe te contacte car j’ai trouvé ton profil dans un [groupe/hashtags] dédié à [sujet]. \n \nEn fait, je suis en train d’élargir mon réseau avec des personnes qui partagent les mêmes [points communs]. \nSi c’est aussi ton objectif, alors nous avons beaucoup en commun ! 😊\n \nEst-ce que je peux te poser une question ? 🤷‍♂️",
    "French Content V2":
      "Salut [first name] ! 👋\nJe suis tombé sur ton profil dans un [groupe/hashtags] autour de [sujet] et je me suis dit qu’on partageait pas mal d’intérêts communs.\n \nJe cherche à connecter avec des personnes qui, comme toi, s’intéressent à [points communs]. Ça te parle aussi ?",
    "French Content V3":
      "Hello [first name] 😃\nEn parcourant un [groupe/hashtags] sur [sujet], ton profil a attiré mon attention. \n \nJe suis toujours curieux de rencontrer des gens qui ont les mêmes centres d’intérêt, et je pense qu’on a pas mal de points communs ! 😊\n \nD’ailleurs, j’aimerais te poser une petite question. \nDis-moi quand tu as mon message.",
    "English Title": "Common Interest",
    "English Content V1":
      "Hello [first name] 😃\nI'm reaching out because I found your profile in a [group/hashtags] dedicated to [topic].\n \nActually, I'm in the process of expanding my network with people who share the same [common interests].\nIf this is also your goal, then we have a lot in common! 😊\n \nCan I ask you a question? 🤷‍♂️",
    "English Content V2":
      "Hi [first name]! 👋\nI came across your profile in a [group/hashtags] about [topic] and I thought we shared quite a few common interests.\n \nI’m looking to connect with people who, like you, are interested in [common points]. Does that resonate with you too?",
    "English Content V3":
      "Hey [first name] 😃\nWhile browsing a [group/hashtags] on [topic], your profile caught my attention.\n \nI am always curious to meet people who have the same interests, and I think we have quite a few things in common! 😊\n \nBy the way, I would like to ask you a small question.\nLet me know when you have my message.",
    "German Title": "Gemeinsames Interesse",
    "German Content V1":
      "Hallo [first name] 😃\nIch kontaktiere dich, weil ich dein Profil in einer [Gruppe/Hashtags] gefunden habe, die sich mit [Thema] beschäftigt.\n \nTatsächlich erweitere ich gerade mein Netzwerk mit Menschen, die die gleichen [Gemeinsamkeiten] teilen.\nWenn das auch dein Ziel ist, dann haben wir viel gemeinsam! 😊\n \nDarf ich dir eine Frage stellen? 🤷‍♂️",
    "German Content V2":
      "Hallo [first name]! 👋\nIch bin auf dein Profil in einer [Gruppe/Hashtags] zu [Thema] gestoßen und habe gedacht, dass wir viele gemeinsame Interessen haben.\n \nIch suche nach einer Verbindung zu Menschen, die sich wie du für [gemeinsame Punkte] interessieren. Spricht dich das auch an?",
    "German Content V3":
      "Hallo [first name] 😃\nBeim Durchstöbern einer [Gruppe/Hashtags] zum [Thema] ist mir dein Profil aufgefallen.\n \nIch bin immer neugierig, Menschen zu treffen, die die gleichen Interessen haben, und ich denke, wir haben einige Gemeinsamkeiten! 😊\n \nÜbrigens, ich würde dir gerne eine kleine Frage stellen.\nSag mir Bescheid, wenn du meine Nachricht hast.",
    "Spanish Title": "Interés en Común",
    "Spanish Content V1":
      "Hola [first name] 😃\nTe contacto porque encontré tu perfil en un [grupo/hashtags] dedicado a [tema].\n \nDe hecho, estoy ampliando mi red con personas que comparten los mismos [puntos en común].\nSi ese también es tu objetivo, ¡entonces tenemos mucho en común! 😊\n \n¿Puedo hacerte una pregunta? 🤷‍♂️",
    "Spanish Content V2":
      "¡Hola [first name] ! 👋\nEncontré tu perfil en un [grupo/hashtags] sobre [tema] y pensé que podríamos terner muchos intereses en común.\n \nEstoy buscando conectar con personas que, como tú, están interesadas en [puntos en común]. ¿Te suena también?",
    "Spanish Content V3":
      "Hola [first name] 😃\nAl recorrer un [grupo/hashtags] sobre [tema], tu perfil llamó mi atención.\n \nSiempre tengo curiosidad por conocer gente que tenga los mismos intereses, ¡y creo que tenemos bastante en común! 😊\n \nPor cierto, me gustaría hacerte una pequeña pregunta.\nDime cuando tengas mi mensaje.",
  },

   {
    "Statut": "OK",
    "Category": "Lead Generation",
    "Article": 5,
    "French Title": "Envoi d’une formation gratuite",
    "French Content V1": "Bonjour [first name], tu cherches à [résultat clé] ? 🎯\n\n📚 J’ai justement créé une formation gratuite pour t’aider.\nVoici ce que tu vas découvrir :\n- [Clé 1]\n- [Clé 2]\n- [Clé 3]\n\nEt le meilleur dans tout ça, c’est que c’est 100 % gratuit !\n\n👉 Inscris-toi ici : [lien d’inscription].\nJe suis impatient de connaître ton avis après l'avoir suivie ! ",
    "French Content V2": "Salut [first name], tu aimerais enfin atteindre [résultat clé] ? 🚀\n\nÇa tombe bien, j’ai mis en place une formation gratuite qui te guide pas à pas. \nTu y découvriras comment [Clé 1], comprendre [Clé 2] et réussir [Clé 3].\n\nEt oui, c’est entièrement gratuit !\n\n👉 N’hésite pas à t’inscrire ici : [lien d’inscription].\nJe suis sûr que ça va vraiment t'aider ! 😊\n\n",
    "French Content V3": "Hello [first name], est-ce que tu as déjà réfléchi à comment [résultat clé] ? 🤔\n\nJe viens de lancer une formation 100 % gratuite pour te montrer exactement comment y arriver !\nTu y apprendras notamment à [Clé 1], mais aussi à [Clé 2] et [Clé 3].\n\n👉 Profites-en maintenant, c’est offert : [lien d’inscription].\nHâte de savoir ce que tu en penses ! 😊\n\n",
    "English Title": "Sending a free training",
    "English Content V1": "Hello [first name], are you looking to [key result]? 🎯\n\n📚 I have just created a free training to help you.\nHere is what you will discover:\n• [Key 1]\n• [Key 2]\n• [Key 3]\nAnd the best part is that it’s 100% free!\n\n👉 Sign up here: [registration link].\nI can’t wait to hear your feedback after you’ve completed it!",
    "English Content V2": "Hello [first name], would you finally like to achieve [key result]? 🚀\n\nThat's great, I have set up a free training that guides you step by step.\nYou will discover how to [Key 1], understand [Key 2], and succeed at [Key 3].\nAnd yes, it's completely free!\n\n👉 Don't hesitate to sign up here: [registration link].\nI am sure it will really help you! 😊",
    "English Content V3": "Hello [first name], have you already thought about how to achieve [key result]? 🤔\n\nI just launched a 100% free training to show you exactly how to get there!\nYou will learn in particular how to [Key 1], but also how to [Key 2] and [Key 3].\n\n👉 Take advantage of it now, it’s free: [registration link].\n\nCan’t wait to know what you think! 😊",
    "German Title": "Versand einer kostenlosen Schulung",
    "German Content V1": "Hallo [first name], suchst du nach [Schlüssel-Ergebnis]? 🎯\n\n📚 Ich habe gerade ein kostenloses Training erstellt, um dir zu helfen.\nHier ist, was du entdecken wirst:\n• [Schlüssel 1]\n• [Schlüssel 2]\n• [Schlüssel 3]\nUnd das Beste daran ist, dass es 100 % kostenlos ist!\n\n👉 Melde dich hier an: [Anmeldelink].\n\nIch kann es kaum erwarten, deine Meinung zu hören, nachdem du es absolviert hast!",
    "German Content V2": "Hallo [first name], möchtest du endlich [Schlüssel-Ergebnis] erreichen? 🚀\n\nDas kommt gut, ich habe ein kostenloses Training eingerichtet, das dich Schritt für Schritt anleitet.\nDort wirst du lernen, wie man [Schlüssel 1] versteht, [Schlüssel 2] begreift und [Schlüssel 3] erfolgreich umsetzt.\nUnd ja, es ist völlig kostenlos!\n\n👉 Zögere nicht, dich hier anzumelden: [Anmeldelink].\n\nIch bin mir sicher, dass es dir wirklich helfen wird! 😊",
    "German Content V3": "Hallo [first name], hast du schon darüber nachgedacht, wie man [Schlüssel Ergebnis] erreicht? 🤔\n\nIch habe gerade ein 100 % kostenloses Training gestartet, um dir genau zu zeigen, wie du es schaffen kannst!\nDu wirst unter anderem lernen, [Schlüssel 1], aber auch [Schlüssel 2] und [Schlüssel 3] zu machen.\n\n👉 Nutze es jetzt, es ist kostenlos: [Anmeldelink].\n\nIch bin gespannt, was du davon hältst! 😊",
    "Spanish Title": "Envío de una formación gratuita",
    "Spanish Content V1": "Hola [first name], ¿estás buscando [resultado clave]? 🎯\n\n📚 Justamente he creado una formación gratuita para ayudarte.\nAquí está lo que vas a descubrir:\n• [Clave 1]\n• [Clave 2]\n• [Clave 3]\nY lo mejor de todo es que ¡es 100 % gratis!\n\n👉 Inscríbete aquí: [enlace de inscripción].\n\n¡Estoy ansioso por conocer tu opinión después de haberla seguido!",
    "Spanish Content V2": "Hola [first name], ¿te gustaría finalmente alcanzar [resultado clave]? 🚀\n\nQué bien, he creado una formación gratuita que te guía paso a paso.\nAhí descubrirás cómo [Clave 1], entender [Clave 2] y tener éxito en [Clave 3].\n¡Y sí, es completamente gratis!\n\n👉 No dudes en inscribirte aquí: [enlace de inscripción].\n\n¡Estoy seguro de que realmente te ayudará! 😊",
    "Spanish Content V3": "Hola [primer nombre], ¿has pensado ya en cómo [resultado clave]? 🤔\n\n¡Acabo de lanzar una formación 100 % gratuita para mostrarte exactamente cómo lograrlo!\nAhí aprenderás, entre otras cosas, a [Clave 1], pero también a [Clave 2] y [Clave 3].\n\n👉 Aprovecha ahora, es gratis: [enlace de inscripción].\n\n¡Deseo saber qué piensas de ello! 😊"
   },
   {
    "Statut": "OK",
    "Category": "Lead Generation",
    "Article": 6,
    "French Title": "Invitation à rejoindre un canal Telegram ou Instagram",
    "French Content V1": "Bonjour [first name], est-ce que tu t’intéresses à [sujet] ? 🤔\n\nJ’ai créé un canal sur [Telegram Instagram] où je partage des astuces exclusives sur [sujet].\nTu y trouveras des contenus uniques pour t’aider à [résultat clé].\n\n👉 Si ça t’intéresse, rejoins-nous ici : [lien du canal].",
    "French Content V2": "Salut [first name], tu as envie de découvrir plus sur [sujet] ? 🌟\n\nJ’ai ouvert un canal sur [Telegram Instagram] où je partage régulièrement des conseils inédits sur ce thème.\nTu y trouveras des contenus uniques pour t’aider à atteindre [résultat clé].\n\n👉 Si ça te tente, rejoins-nous ici : [lien du canal].",
    "French Content V3": "Hello [first name], je ne sais pas si ça pourrait t’intéresser, mais j’ai lancé un canal sur [Telegram Instagram] pour parler de [sujet]. 🤔\n\nJ’y poste des astuces exclusives et des infos pratiques pour progresser dans [résultat clé].\n\n👉 Tu peux nous rejoindre ici si tu es curieux : [lien du canal].\n\n",
    "English Title": "Invitation to join a Telegram or Instagram channel",
    "English Content V1": "Hello [first name], are you interested in [subject]? 🤔\n\nI created a channel on [Telegram Instagram] where I share exclusive tips on [subject].\nYou will find unique content to help you [key result].\n\n👉 If you're interested, join us here: [channel link].",
    "English Content V2": "Hi [first name], are you interested in discovering more about [topic]? 🌟\n\nI have opened a channel on [Telegram Instagram] where I regularly share unique tips on this topic.\nYou will find unique content to help you achieve [key result].\n\n👉 If you're interested, join us here: [channel link].",
    "English Content V3": "Hello [first name], I don't know if you might be interested, but I launched a channel on [Telegram Instagram] to talk about [subject]. 🤔\n\nI post exclusive tips and practical information to progress in [key result].\n\n👉 You can join us here if you're curious: [channel link].",
    "German Title": "Einladung, einem Telegram- oder Instagram-Kanal beizutreten",
    "German Content V1": "Hallo [first name], interessierst du dich für [Thema]? 🤔\n\nIch habe einen Kanal auf [Telegram Instagram] erstellt, wo ich exklusive Tipps zu [Thema] teile.\nDort findest du einzigartige Inhalte, die dir helfen, [Schlüsselergebnis] zu erreichen.\n\n👉 Wenn du interessiert bist, komm hierher: [Kanal-Link].",
    "German Content V2": "Hallo [first name], möchtest du mehr über [Thema] erfahren? 🌟\n\nIch habe einen Kanal auf [Telegram Instagram] eröffnet, wo ich regelmäßig einzigartige Tipps zu diesem Thema teile.\nDort findest du exklusive Inhalte, die dir helfen, [Schlüsselresultat] zu erreichen.\n\n👉 Wenn du interessiert bist, komm hierher: [Kanal-Link].",
    "German Content V3": "Hallo [first name], ich weiß nicht, ob es dich interessieren könnte, aber ich habe einen Kanal auf [Telegram Instagram] gestartet, um über [Thema] zu sprechen. 🤔\n\nIch poste dort exklusive Tipps und praktische Informationen, um in [Schlüssel-Ergebnis] voranzukommen.\n\n👉 Du kannst uns hier beitreten, wenn du neugierig bist: [Kanal-Link].",
    "Spanish Title": "Invitación a unirse a un canal de Telegram o Instagram",
    "Spanish Content V1": "Hola [first name], ¿te interesa [tema]? 🤔\n\nHe creado un canal en [Telegram Instagram] donde comparto consejos exclusivos sobre [tema].\nEncontrarás contenido único para ayudarte a [resultado clave].\n\n👉 Si te interesa, únete aquí: [enlace del canal].",
    "Spanish Content V2": "Hola [first name], ¿tienes ganas de descubrir más sobre [sujet]? 🌟\n\nHe abierto un canal en [Telegram Instagram] donde comparto regularmente consejos inéditos sobre este tema.\nAhí encontrarás contenidos únicos para ayudarte a alcanzar [resultado clave].\n\n👉 Si te interesa, únete a nosotros aquí: [enlace del canal].",
    "Spanish Content V3": "Hola [primer nombre], no sé si te podría interesar, pero he lanzado un canal en [Telegram Instagram] para hablar sobre [tema]. 🤔\n\nAhí publico consejos exclusivos e información práctica para avanzar en [resultado clave].\n\n👉 Puedes unirte aquí si tienes curiosidad: [enlace del canal]."
   },
   {
    "Statut": "OK",
    "Category": "Engagement",
    "Article": 3,
    "French Title": "Invitation à regarder une vidéo YouTube",
    "French Content V1": "Bonjour [first name], est-ce que tu t’intéresses à [sujet] ? 🎥\n\nJ’ai fait une vidéo qui pourrait vraiment te plaire, elle parle de [description rapide du contenu].\nSi tu aimes le contenu, n’hésite pas à me laisser un like ou un commentaire, ça m’aidera beaucoup !\n\n👉 Voici le lien pour la regarder : [lien de la vidéo].",
    "French Content V2": "Salut [first name], je pense que tu pourrais aimer cette vidéo que j’ai faite sur [sujet]. 🌟\n\nElle traite de [description rapide du contenu] et je suis sûr que ça va t’intéresser !\nUn like ou un commentaire, si ça te plaît, serait super pour me soutenir.\n\n👉 Tu peux la voir ici : [lien de la vidéo].",
    "French Content V3": "Hello [first name], es-tu intéressé(e) par [sujet] ? 🤩\n\nJ’ai réalisé une vidéo qui pourrait vraiment te captiver : elle aborde [description rapide du contenu].\nSi tu apprécies, un like ou un petit commentaire serait super encourageant !\n\n👉 Voici le lien pour la découvrir : [lien de la vidéo].\n\n",
    "English Title": "Invitation to watch a YouTube video",
    "English Content V1": "Hello [first name], are you interested in [subject]? 🎥\n\nI made a video that you might really like, it talks about [quick description of the content].\nIf you enjoy the content, feel free to leave me a like or a comment, it would help me a lot!\n\n👉 Here is the link to watch it: [video link].",
    "English Content V2": "Hi [first name], I think you might like this video I made about [topic]. 🌟\n\nIt covers [quick description of the content] and I’m sure you’ll find it interesting!\nA like or a comment, if you enjoy it, would be great to support me.\n\n👉 You can watch it here: [video link].",
    "English Content V3": "Hello [first name], are you interested in [subject]? 🤩\n\nI made a video that could really captivate you: it covers [quick description of the content].\n\nIf you enjoy it, a like or a little comment would be super encouraging!\n\n👉 Here is the link to discover it: [video link].",
    "German Title": "Einladung, ein YouTube-Video anzusehen",
    "German Content V1": "Hallo [first name], interessierst du dich für [Thema]? 🎥\n\nIch habe ein Video gemacht, das dir wirklich gefallen könnte, es handelt von [kurze Beschreibung des Inhalts].\nWenn dir der Inhalt gefällt, zögere nicht, mir ein Like oder einen Kommentar zu hinterlassen, das würde mir sehr helfen!\n\n👉 Hier ist der Link, um es anzusehen: [Link zum Video].",
    "German Content V2": "Hallo [first name], ich denke, dass du dieses Video, das ich über [Thema] gemacht habe, mögen könntest. 🌟\n\nEs behandelt [kurze Beschreibung des Inhalts] und ich bin sicher, dass es dich interessieren wird!\nEin Like oder ein Kommentar, wenn es dir gefällt, wäre super, um mich zu unterstützen.\n\n👉 Du kannst es hier ansehen: [Link zum Video].",
    "German Content V3": "Hallo [first name], bist du interessiert an [Thema]? 🤩\n\nIch habe ein Video erstellt, das dich wirklich fesseln könnte: Es behandelt [kurze Beschreibung des Inhalts].\n\nWenn es dir gefällt, wäre ein Like oder ein kleiner Kommentar super ermutigend!\n\n👉 Hier ist der Link, um es zu entdecken: [Link zum Video].",
    "Spanish Title": "Invitación a ver un video de YouTube",
    "Spanish Content V1": "Hola [first name], ¿te interesa [tema]? 🎥\n\nHe hecho un video que realmente podría gustarte, habla de [descripción rápida del contenido].\nSi te gusta el contenido, no dudes en dejarme un like o un comentario, ¡me ayudará mucho!\n\n👉 Aquí está el enlace para verlo: [enlace del video].",
    "Spanish Content V2": "Hola [first name], creo que te podría gustar este video que hice sobre [tema]. 🌟\n\nTrata sobre [descripción rápida del contenido] y estoy seguro de que te va a interesar.\nUn like o un comentario, si te gusta, sería genial para apoyarme.\n\n👉 Puedes verlo aquí: [enlace del video].",
    "Spanish Content V3": "Hola [first name], ¿estás interesado(a) en [sujet] ? 🤩\n\nHe realizado un video que podría realmente cautivarte: aborda [descripción rápida del contenido].\n\nSi te gusta, un like o un pequeño comentario sería súper alentador.\n\n👉 Aquí está el enlace para descubrirlo: [enlace del video]."
   },
   {
    "Statut": "OK",
    "Category": "Sales",
    "Article": 2,
    "French Title": "Vente directe",
    "French Content V1": "Bonjour [first name], tu cherches sûrement une solution rapide pour [résultat clé] ? ⚡\n\nÇa tombe bien, [produit service] est en promotion jusqu’au [date].\nC’est le moment idéal pour en profiter et voir de vrais résultats rapidement.\n\n👉 Découvre l’offre ici : [lien de l’offre].\nSi tu veux en discuter, je suis disponible pour en parler. 😊",
    "French Content V2": "Salut [first name], si tu veux une solution rapide pour [résultat clé], ça pourrait t’intéresser ! 🚀\n\n[Produit service] est en promotion jusqu’au [date], donc c’est le moment idéal pour te lancer et voir des résultats concrets.\n\n👉 Découvre l’offre ici : [lien de l’offre].\nSi tu souhaites en discuter, n’hésite pas, je suis dispo ! 😊",
    "French Content V3": "Hello [first name], je sais que tu cherches sûrement une solution pour [résultat clé], et justement, [produit service] est en promo jusqu’au [date]. 🎯\n\nC’est une belle opportunité pour obtenir des résultats rapidement.\n\n👉 Découvre l’offre ici : [lien de l’offre].\nSi tu veux en savoir plus, je suis là pour en parler ! 😊",
    "English Title": "Direct sale",
    "English Content V1": "Hello [first name], you are probably looking for a quick solution for [key result]? ⚡\n\nThat's great, [product service] is on sale until [date].\nIt's the perfect time to take advantage of it and see real results quickly.\n\n👉 Discover the offer here: [offer link].\nIf you want to discuss it, I am available to talk. 😊",
    "English Content V2": "Hi [first name], if you want a quick solution for [key result], this might interest you! 🚀\n\n[Product service] is on promotion until [date], so it's the perfect time to get started and see concrete results.\n\n👉 Discover the offer here: [offer link].\nIf you want to discuss it, feel free, I'm available! 😊",
    "English Content V3": "Hello [first name], I know that you are probably looking for a solution for [key result], and just so happens, [product service] is on sale until [date]. 🎯\n\nIt's a great opportunity to achieve results quickly.\n\n👉 Discover the offer here: [offer link].\n\nIf you want to know more, I'm here to discuss it! 😊",
    "German Title": "Direkt verkauf",
    "German Content V1": "Hallo [first name], du suchst sicher nach einer schnellen Lösung für [Schlüsselergebnis]? ⚡\n\nDas kommt gut, [Produkt Dienstleistung] ist bis zum [Datum] im Angebot.\nJetzt ist der ideale Zeitpunkt, um davon zu profitieren und schnell echte Ergebnisse zu sehen.\n\n👉 Entdecke das Angebot hier: [Angebotslink].\n\nWenn du darüber sprechen möchtest, stehe ich zur Verfügung. 😊",
    "German Content V2": "Hallo [first name], wenn du eine schnelle Lösung für [Schlüsselresultat] möchtest, könnte das für dich interessant sein! 🚀\n\n[Produkt Dienstleistung] ist bis zum [Datum] im Angebot, also ist jetzt der ideale Zeitpunkt, um loszulegen und konkrete Ergebnisse zu sehen.\n\n👉 Entdecke das Angebot hier: [Angebotslink].\n\nWenn du darüber sprechen möchtest, zögere nicht, ich bin verfügbar! 😊",
    "German Content V3": "Hallo [first name], ich weiß, dass du sicherlich nach einer Lösung für [Schlüssel-Ergebnis] suchst, und genau, [Produkt Dienstleistung] ist bis zum [Datum] im Angebot. 🎯\n\nDas ist eine großartige Gelegenheit, um schnell Ergebnisse zu erzielen.\n\n👉 Entdecke das Angebot hier: [Angebotslink].\n\nWenn du mehr wissen möchtest, bin ich hier, um darüber zu sprechen! 😊",
    "Spanish Title": "Venta directa",
    "Spanish Content V1": "Hola [first name], seguramente estás buscando una solución rápida para [resultado clave] ? ⚡\n\nEs una buena oportunidad, [produit service] está en promoción hasta el [date].\nEs el momento ideal para aprovecharlo y ver resultados reales rápidamente.\n\n👉 Descubre la oferta aquí: [lien de l’offre].\n\nSi quieres discutirlo, estoy disponible para hablar. 😊",
    "Spanish Content V2": "Hola [first name], si quieres una solución rápida para [resultado clave], ¡esto podría interesarte! 🚀\n\n[Producto servicio] está en promoción hasta el [fecha], así que es el momento ideal para lanzarte y ver resultados concretos.\n\n👉 Descubre la oferta aquí: [enlace de la oferta].\n\nSi deseas discutirlo, no dudes en contactarme, ¡estoy disponible! 😊",
    "Spanish Content V3": "Hola [first name], sé que seguramente estás buscando una solución para [resultado clave], y precisamente, [producto servicio] está en promoción hasta el [fecha]. 🎯\n\nEs una gran oportunidad para obtener resultados rápidamente.\n\n👉 Descubre la oferta aquí: [enlace de la oferta].\n\nSi quieres saber más, estoy aquí para hablar de ello. 😊"
   },
   {
    "Statut": "OK",
    "Category": "Sales",
    "Article": 3,
    "French Title": "Cross-sell direct",
    "French Content V1": "Bonjour [first name], si tu utilises déjà [produit service], je pense que [produit complémentaire] serait le complément parfait pour t’aider à atteindre [résultat clé]. 🔧\n\nEnsemble, ils peuvent vraiment [bénéfice].\n\n👉 Réserve ton créneau ici : [lien de réservation].\nJe suis dispo si tu veux en discuter ! 😊",
    "French Content V2": "Salut [first name], si [produit service] fait déjà partie de ton quotidien, [produit complémentaire] pourrait bien être l’allié qu’il te faut pour atteindre [résultat clé]. 🤝\n\nEnsemble, ils te permettront de [bénéfice] !\n\n👉 Si ça t’intéresse, n’hésite pas à réserver un créneau ici : [lien de réservation].",
    "French Content V3": "Hello [first name], si tu utilises déjà [produit service], [produit complémentaire] pourrait être un excellent ajout pour t’aider à [résultat clé]. 🌟\n\nCes deux produits ensemble peuvent vraiment [bénéfice] !\n\n👉 Réserve un créneau ici : [lien de réservation]. Je suis dispo pour en discuter !",
    "English Title": "Cross-sell direct",
    "English Content V1": "Hello [first name], if you are already using [product service], I think [complementary product] would be the perfect addition to help you achieve [key result]. 🔧\n\nTogether, they can really [benefit].\n\n👉 Book your slot here: [booking link].\nI am available if you want to discuss it! 😊",
    "English Content V2": "Hi [first name], if [product service] is already part of your daily life, [complementary product] could be the ally you need to achieve [key result]. 🤝\n\nTogether, they will allow you to [benefit]!\n\n👉 If you’re interested, feel free to book a slot here: [booking link].",
    "English Content V3": "Hello [first name], if you are already using [product service], [complementary product] could be an excellent addition to help you achieve [key result]. 🌟\n\nThese two products together can really [benefit]!\n\n👉 Book a slot here: [booking link]. I'm available to discuss it!",
    "German Title": "Cross-Selling direkt",
    "German Content V1": "Hallo [first name], wenn du bereits [Produkt Dienstleistung] verwendest, denke ich, dass [ergänzendes Produkt] die perfekte Ergänzung wäre, um dir zu helfen, [Schlüsselresultat] zu erreichen. 🔧\n\nGemeinsam können sie wirklich [Nutzen].\n\n👉 Buche hier deinen Termin: [Buchungslink].\n\nIch bin verfügbar, wenn du darüber sprechen möchtest! 😊",
    "German Content V2": "Hallo [first name], wenn [Produkt Dienstleistung] bereits Teil deines Alltags ist, könnte [zusätzliches Produkt] der Verbündete sein, den du brauchst, um [Schlüsselergebnis] zu erreichen. 🤝\n\nZusammen werden sie dir ermöglichen, [Nutzen] zu erzielen!\n\n👉 Wenn du interessiert bist, zögere nicht, dir hier einen Termin zu reservieren: [Buchungslink].",
    "German Content V3": "Hallo [first name], wenn du bereits [Produkt Dienstleistung] verwendest, könnte [zusätzliches Produkt] eine hervorragende Ergänzung sein, um dir zu helfen, [Schlüsselresultat] zu erreichen. 🌟\n\nDiese beiden Produkte zusammen können wirklich [Vorteil] bringen!\n\n👉 Buche hier einen Termin: [Buchungslink]. \n\nIch stehe zur Verfügung, um darüber zu sprechen!",
    "Spanish Title": "Venta cruzada directa",
    "Spanish Content V1": "Hola [first name], si ya estás utilizando [producto servicio], creo que [producto complementario] sería el complemento perfecto para ayudarte a alcanzar [resultado clave]. 🔧\n\nJuntos, realmente pueden [beneficio].\n\n👉 Reserva tu espacio aquí: [enlace de reserva].\n\nEstoy disponible si quieres discutirlo. 😊",
    "Spanish Content V2": "Hola [first name], si [producto servicio] ya forma parte de tu día a día, [producto complementario] podría ser el aliado que necesitas para alcanzar [resultado clave]. 🤝\n\n¡Juntos te permitirán [beneficio]!\n\n👉 Si te interesa, no dudes en reservar un espacio aquí: [enlace de reserva].",
    "Spanish Content V3": "Hola [first name], si ya utilizas [producto servicio], [producto complementario] podría ser un excelente complemento para ayudarte a [resultado clave]. 🌟\n\n¡Estos dos productos juntos realmente pueden [beneficio]!\n\n👉 Reserva un espacio aquí: [enlace de reserva]. \n\n¡Estoy disponible para discutirlo!"
   },
   {
    "Statut": "OK",
    "Category": "Sales",
    "Article": 4,
    "French Title": "Up-sell",
    "French Content V1": "Bonjour [first name], comme tu as déjà fait confiance à nos produits avec [produit service], je voulais te proposer de découvrir [produit service premium]. 🌟\n\nCela pourrait vraiment te permettre d’aller encore plus loin dans [résultat clé].\n\n👉 Découvre-le directement ici : [lien direct].  ",
    "French Content V2": "Salut [first name], étant donné que tu apprécies déjà [produit service], je pense que [produit service premium] pourrait être un excellent choix pour aller plus loin dans [résultat clé]. 🚀\n\n👉 Tu peux l’explorer directement ici : [lien direct].  ",
    "French Content V3": "Hello [first name], merci pour ta confiance en utilisant [produit service] ! 😊\n\nJe voulais te proposer de découvrir [produit service premium], qui pourrait vraiment t’aider à maximiser [résultat clé].\n\n👉 Voici le lien pour en profiter directement : [lien direct].  \n\n",
    "English Title": "Up-sell",
    "English Content V1": "Hello [first name], as you have already trusted our products with [product service], I wanted to offer you to discover [premium product service]. 🌟\n\nThis could really allow you to go even further in [key result].\n\n👉 Discover it directly here: [direct link].",
    "English Content V2": "Hello [first name], since you already appreciate [product service], I think [premium product service] could be an excellent choice to take it further in [key result]. 🚀\n\n👉 You can explore it directly here: [direct link].",
    "English Content V3": "Hello [first name], thank you for your trust in using [product service]! 😊\n\nI wanted to suggest you discover [premium product service], which could really help you maximize [key result].\n\n👉 Here is the link to take advantage of it directly: [direct link].",
    "German Title": "Up-Selling",
    "German Content V1": "Hallo [first name], da du unseren Produkten mit \n\n[Produkt Dienstleistung] bereits vertraut bist, wollte ich dir vorschlagen, [Premium-Produkt Dienstleistung] zu entdecken. 🌟\n\nDas könnte dir wirklich helfen, noch weiter zu kommen in [Schlüssel-Ergebnis].\n\n👉 Entdecke es direkt hier: [direkter Link].",
    "German Content V2": "Hallo [first name], da du bereits [Produkt Dienstleistung] schätzt, denke ich, dass [Premium-Produkt Dienstleistung] eine ausgezeichnete Wahl sein könnte, um in [Schlüssel-Ergebnis] weiterzukommen. 🚀\n\n👉 Du kannst es direkt hier erkunden: [direkter Link].",
    "German Content V3": "Hallo [first name], danke für dein Vertrauen in die Nutzung von [Produkt Dienstleistung]! 😊\n\nIch wollte dir vorschlagen, [Premium-Produkt Dienstleistung] zu entdecken, das dir wirklich helfen könnte, [Schlüsselresultat] zu maximieren.\n\n👉 Hier ist der Link, um direkt davon zu profitieren: [direkter Link].",
    "Spanish Title": "Venta adicional",
    "Spanish Content V1": "Hola [first name], como ya has confiado en nuestros productos con [producto servicio], quería ofrecerte descubrir [producto servicio premium]. 🌟\n\nEsto realmente podría permitirte avanzar aún más en [resultado clave].\n\n👉 Descúbrelo directamente aquí: [enlace directo].",
    "Spanish Content V2": "Hola [first name], dado que ya aprecias [producto servicio], creo que [producto servicio premium] podría ser una excelente opción para avanzar en [resultado clave]. 🚀\n\n👉 Puedes explorarlo directamente aquí: [enlace directo].",
    "Spanish Content V3": "Hola [first name], ¡gracias por tu confianza al utilizar [producto servicio]! 😊\n\nQuería proponerte descubrir [producto servicio premium], que realmente podría ayudarte a maximizar [resultado clave].\n\n👉 Aquí está el enlace para que lo aproveches directamente: [enlace directo]."
   },
   {
    "Statut": "OK",
    "Category": "Sales",
    "Article": 5,
    "French Title": "Dernière chance pour promotion",
    "French Content V1": "Bonjour [first name], DERNIÈRE CHANCE pour profiter de notre promotion spéciale sur [produit service], qui se termine le [date]. ⏳\n\nC’est le moment ou jamais pour obtenir [résultat clé] avant que l’offre ne disparaisse.\n\n👉 Réserve l’offre ici : [lien de l’offre], ou fais-moi signe si tu veux qu’on en parle.",
    "French Content V2": "Salut [first name], c’est maintenant ou jamais ! Notre promo spéciale sur [produit service] prend fin le [date]. 🔥\n\nC’est l’occasion rêvée pour obtenir [résultat clé] avant la fin de l’offre.\n\n👉 Réserve-la ici : [lien de l’offre], et n’hésite pas à me faire signe si tu veux en parler.  ",
    "French Content V3": "Hello [first name], il ne te reste plus beaucoup de temps pour profiter de notre offre spéciale sur [produit service] ! ⏳\n\nElle se termine le [date], donc c’est le moment de sauter le pas et obtenir [résultat clé].\n\n👉 Voici le lien : [lien de l’offre]. Et si tu as des questions, je suis là pour en parler !\n\n",
    "English Title": "Last chance for promotion",
    "English Content V1": "Hello [first name], LAST CHANCE to take advantage of our special promotion on [product service], which ends on [date]. ⏳\n\nThis is the moment or never to achieve [key result] before the offer disappears.\n\n👉 Reserve the offer here: [offer link], or let me know if you want to discuss it.",
    "English Content V2": "Hello [first name], it's now or never! Our special promotion on [product service] ends on [date]. 🔥\n\nThis is the perfect opportunity to achieve [key result] before the offer ends.\n\n👉 Reserve it here: [offer link], and feel free to reach out if you want to talk about it.",
    "English Content V3": "Hello [first name], you don't have much time left to take advantage of our special offer on [product service]! ⏳\n\nIt ends on [date], so now is the time to take the plunge and get [key result].\n\n👉 Here is the link: [offer link]. And if you have any questions, I'm here to discuss them!",
    "German Title": "Letzte Chance für die Promotion",
    "German Content V1": "Hallo [first name], LETZTE CHANCE, um von unserer Sonderaktion für [Produkt Dienstleistung] zu profitieren, die am [Datum] endet. ⏳\n\nJetzt ist die Zeit, um [Schlüssel-Ergebnis] zu erhalten, bevor das Angebot verschwindet.\n\n👉 Reserviere das Angebot hier: [Angebotslink], oder sag mir Bescheid, wenn du darüber sprechen möchtest.",
    "German Content V2": "Hallo [first name], jetzt oder nie! Unsere Sonderaktion für [Produkt Dienstleistung] endet am [Datum]. 🔥\n\nDas ist die perfekte Gelegenheit, um [Schlüsselresultat] vor dem Ende des Angebots zu erhalten.\n\n👉 Reserviere sie hier: [Angebotslink], und zögere nicht, dich zu melden, wenn du darüber sprechen möchtest.",
    "German Content V3": "Hallo [first name], dir bleibt nicht mehr viel Zeit, um von unserem Sonderangebot für [Produkt Dienstleistung] zu profitieren! ⏳\n\nEs endet am [Datum], also ist jetzt der Zeitpunkt, um den Schritt zu wagen und [Schlüsselresultat] zu erhalten.\n\n👉 Hier ist der Link: [Link zum Angebot]. \n\nUnd wenn du Fragen hast, bin ich hier, um darüber zu sprechen!",
    "Spanish Title": "Última oportunidad para promoción",
    "Spanish Content V1": "Hola [first name], ÚLTIMA OPORTUNIDAD para aprovechar nuestra promoción especial sobre [producto servicio], que termina el [fecha]. ⏳\n\nEs ahora o nunca para obtener [resultado clave] antes de que la oferta desaparezca.\n\n👉 Reserva la oferta aquí: [enlace de la oferta], o házmelo saber si quieres que hablemos de ello.",
    "Spanish Content V2": "Hola [first name], ¡es ahora o nunca! Nuestra promoción especial sobre [producto servicio] termina el [fecha]. 🔥\n\nEs la oportunidad soñada para obtener [resultado clave] antes de que finalice la oferta.\n\n👉 Resérvala aquí: [enlace de la oferta], y no dudes en avisarme si quieres hablar sobre ello.",
    "Spanish Content V3": "Hola [first name], ¡no te queda mucho tiempo para aprovechar nuestra oferta especial en [producto servicio]! ⏳\n\nTermina el [fecha], así que es el momento de dar el paso y obtener [resultado clave].\n\n👉 Aquí está el enlace: [enlace de la oferta]. Y si tienes preguntas, ¡estoy aquí para hablar de ello!"
   },
   {
    "Statut": "OK",
    "Category": "Accept/Decline",
    "Article": 3,
    "French Title": "Bienvenue | lien Groupe Facebook",
    "French Content V1": "Bonjour [first name], merci pour la demande d’ami ! 😊\n\nJ’ai un groupe Facebook où je partage du contenu exclusif sur [sujet].\n\n👉 Si ça t’intéresse, tu peux nous rejoindre ici : [lien du groupe].\nHâte de t’y voir !",
    "French Content V2": "Salut [first name] ! Merci pour la connexion ! 🌟\n\nJ’ai créé un groupe Facebook pour partager des infos inédites sur [sujet].\n\n👉 Si tu as envie de nous rejoindre, c’est par ici : [lien du groupe].\nJ’ai hâte de t’y accueillir !  ",
    "French Content V3": "Hello [first name], merci pour l’ajout ! 😊\n\nJ’ai un groupe Facebook où je publie du contenu exclusif autour de [sujet].\n\n👉 Si ça t’intéresse, n’hésite pas à nous rejoindre via ce lien : [lien du groupe].\nHâte de te voir là-bas !",
    "English Title": "Welcome | Facebook Group link",
    "English Content V1": "Hello [first name], thank you for the friend request! 😊\n\nI have a Facebook group where I share exclusive content about [topic].\n\n👉 If you're interested, you can join us here: [group link].\nLooking forward to seeing you there!",
    "English Content V2": "Hi [first name]! Thank you for connecting! 🌟\n\nI created a Facebook group to share exclusive information about [topic].\n\n👉 If you want to join us, it’s over here: [group link].\nI can't wait to welcome you there!",
    "English Content V3": "Hello [first name], thank you for the addition! 😊\n\nI have a Facebook group where I post exclusive content about [topic].\n\n👉 If you're interested, feel free to join us via this link: [group link].\n\nCan't wait to see you there!",
    "German Title": "Willkommen | Link zur Facebook-Gruppe",
    "German Content V1": "Hallo [first name], danke für die Freundschaftsanfrage! 😊\n\nIch habe eine Facebook-Gruppe, in der ich exklusive Inhalte über [Thema] teile.\n\n👉 Wenn du interessiert bist, kannst du hier beitreten: [Gruppenlink].\n\nFreue mich, dich dort zu sehen!",
    "German Content V2": "Hallo [first name]! Danke für die Verbindung! 🌟\n\nIch habe eine Facebook-Gruppe erstellt, um unveröffentlichte Informationen über [Thema] zu teilen.\n\n👉 Wenn du Lust hast, uns beizutreten, geht es hier lang: [Gruppenlink].\n\nIch freue mich darauf, dich dort willkommen zu heißen!",
    "German Content V3": "Hallo [first name], danke für die Hinzufügung! 😊\n\nIch habe eine Facebook-Gruppe, in der ich exklusive Inhalte zu [Thema] veröffentliche.\n\n👉 Wenn es dich interessiert, zögere nicht, über diesen Link beizutreten: [Link zur Gruppe].\n\nIch freue mich darauf, dich dort zu sehen!",
    "Spanish Title": "Bienvenido | enlace Grupo de Facebook",
    "Spanish Content V1": "Hola [first name], ¡gracias por la solicitud de amistad! 😊\n\nTengo un grupo de Facebook donde comparto contenido exclusivo sobre [tema].\n\n👉 Si te interesa, puedes unirte aquí: [enlace del grupo].\n\n¡Espero verte allí!",
    "Spanish Content V2": "¡Hola [first name]! ¡Gracias por la conexión! 🌟\n\nHe creado un grupo de Facebook para compartir información inédita sobre [tema].\n\n👉 Si tienes ganas de unirte a nosotros, es por aquí: [enlace del grupo].\n\n¡Tengo muchas ganas de darte la bienvenida allí!",
    "Spanish Content V3": "Hola [first name], ¡gracias por agregarme! 😊\n\nTengo un grupo de Facebook donde publico contenido exclusivo sobre [tema].\n\n👉 Si te interesa, no dudes en unirte a nosotros a través de este enlace: [enlace del grupo].\n\n¡Espero verte allí!"
   },
   {
    "Statut": "OK",
    "Category": "Accept/Decline",
    "Article": 4,
    "French Title": "Bienvenue | lien Ressource à Télécharger ",
    "French Content V1": "Bonjour [first name], merci pour la demande d’ami ! 😊\n\nJe partage souvent du contenu sur [sujet], et pour bien démarrer, voici une ressource gratuite que tu peux télécharger :\n\n👉 [lien de la ressource].\nJ’espère que ça te sera utile !  ",
    "French Content V2": "Salut [first name], merci pour l’ajout ! 😊\n\nComme je publie souvent des infos sur [sujet], voici une ressource gratuite à télécharger pour bien démarrer :\n\n👉 [lien de la ressource].\nN’hésite pas à me dire si ça t’aide !",
    "French Content V3": "Hello [first name], ravi(e) d’accepter ta demande d’ami ! 😊\n\nJe partage pas mal de contenu sur [sujet], et pour te donner un aperçu, voici une ressource gratuite :\n\n👉 [lien de la ressource].\nDis-moi ce que tu en penses !",
    "English Title": "Welcome | Resource link to Download",
    "English Content V1": "Hello [first name], thank you for the friend request! 😊\n\nI often share content on [topic], and to get started, here is a free resource that you can download:\n\n👉 [resource link].\nI hope you find it useful!",
    "English Content V2": "Hi [first name], thanks for the add! 😊\n\nSince I often post information about [topic], here is a free resource to download to get started:\n\n👉 [resource link].\nFeel free to let me know if it helps you!",
    "English Content V3": "Hello [first name], glad to accept your friend request! 😊\n\nI share quite a bit of content on [topic], and to give you a glimpse, here is a free resource:\n👉 [resource link].\n\nLet me know what you think!",
    "German Title": "Willkommen | Link zur Ressource herunterladen",
    "German Content V1": "Hallo [first name], danke für die Freundschaftsanfrage! 😊\n\nIch teile oft Inhalte über [Thema], und um gut zu starten, hier ist eine kostenlose Ressource, die du herunterladen kannst:\n👉 [Link zur Ressource].\n\nIch hoffe, es wird dir nützlich sein!",
    "German Content V2": "Hallo [first name], danke für die Hinzufügung! 😊\n\nDa ich oft Informationen über [Thema] veröffentliche, hier ist eine kostenlose Ressource zum Herunterladen, um gut zu starten:\n👉 [Link zur Ressource].\n\nZögere nicht, mir zu sagen, ob es dir hilft!",
    "German Content V3": "Hallo [first name], ich freue mich, deine Freundschaftsanfrage anzunehmen! 😊\n\nIch teile eine Menge Inhalte über [Thema], und um dir einen Überblick zu geben, hier ist eine kostenlose Ressource:\n👉 [Link zur Ressource].\n\nLass mich wissen, was du denkst!",
    "Spanish Title": "Bienvenido | enlace recurso para descargar",
    "Spanish Content V1": "Hola [first name], ¡gracias por la solicitud de amistad! 😊\n\nA menudo comparto contenido sobre [tema], y para empezar bien, aquí tienes un recurso gratuito que puedes descargar:\n👉 [enlace del recurso].\n\n¡Espero que te sea útil!",
    "Spanish Content V2": "Hola [first name], ¡gracias por tu solicitud de amistad! 😊\n\nComo publico a menudo información sobre [tema], aquí hay un recurso gratuito para descargar y comenzar bien:\n👉 [enlace del recurso].\n\n¡No dudes en decirme si te ayuda!",
    "Spanish Content V3": "Hola [first name], ¡encantado(a) de aceptar tu solicitud de amistad! 😊\n\nComparto bastante contenido sobre [tema], y para darte una idea, aquí tienes un recurso gratuito:\n👉 [enlace del recurso].\n\n¡Dime qué opinas!"
   },
   {
    "Statut": "OK",
    "Category": "Accept/Decline",
    "Article": 5,
    "French Title": "Bienvenue | Question Dernier Post",
    "French Content V1": "Bonjour [first name], merci pour la demande d’ami ! 😊\n\nDis-moi, est-ce que tu m’as ajouté suite à mon dernier post sur [sujet] ?\nJ’aime beaucoup discuter de [sujet] et serais ravi(e) d’échanger avec toi !  ",
    "French Content V2": "Salut [first name], merci pour l’ajout ! 🎉😊\n\nJe me demandais, est-ce que c’est mon dernier post sur [sujet] qui t’a donné envie de te connecter ?\nJ’aime vraiment parler de [sujet], alors n’hésite pas si tu veux échanger !",
    "French Content V3": "Hello [first name], merci pour la demande d’ami ! 😊\n\nJe suis curieux, est-ce que tu m’as ajouté après avoir vu mon dernier post sur [sujet] ? 🤔\nJ’adore échanger sur ce thème et serais ravi(e) d’en discuter avec toi !",
    "English Title": "Welcome | Question Last Post",
    "English Content V1": "Hello [first name], thank you for the friend request! 😊\n\nTell me, did you add me following my last post about [topic]?\n\nI really enjoy discussing [topic] and would be delighted to chat with you!",
    "English Content V2": "Hi [first name], thanks for the add! 🎉😊\n\nI was wondering, was it my last post on [topic] that made you want to connect?\n\nI really enjoy talking about [topic], so feel free if you want to chat!",
    "English Content V3": "Hello [first name], thank you for the friend request! 😊\n\nI’m curious, did you add me after seeing my last post about [topic]? 🤔\n\nI love discussing this theme and would be happy to chat about it with you!",
    "German Title": "Willkommen | Frage Letzter Beitrag",
    "German Content V1": "Hallo [first name], danke für die Freundschaftsanfrage! 😊\n\nSag mal, hast du mich aufgrund meines letzten Beitrags zu [Thema] hinzugefügt?\n\nIch rede sehr gerne über [Thema] und würde mich freuen, mich mit dir auszutauschen!",
    "German Content V2": "Hallo [first name], danke für die Hinzufügung! 🎉😊\n\nIch habe mich gefragt, war es mein letzter Beitrag zu [Thema], der dich dazu gebracht hat, dich zu verbinden?\n\nIch rede wirklich gerne über [Thema], also zögere nicht, wenn du dich austauschen möchtest!",
    "German Content V3": "Hallo [first name], danke für die Freundschaftsanfrage! 😊\n\nIch bin neugierig, hast du mich hinzugefügt, nachdem du meinen letzten Beitrag über [Thema] gesehen hast? 🤔\n\nIch liebe es, über dieses Thema zu diskutieren und würde mich freuen, mit dir darüber zu sprechen!",
    "Spanish Title": "Bienvenido | Pregunta Última Publicación",
    "Spanish Content V1": "Hola [first name], ¡gracias por la solicitud de amistad! 😊\n\nDime, ¿me agregaste después de mi última publicación sobre [tema]?\n\nMe gusta mucho discutir sobre [tema] y estaría encantado(a) de intercambiar contigo!",
    "Spanish Content V2": "Hola [first name], ¡gracias por la adición! 🎉😊\n\nMe preguntaba, ¿es mi última publicación sobre [sujet] la que te hizo querer conectarte?\n\nRealmente me gusta hablar sobre [tema], así que no dudes en si quieres intercambiar ideas!",
    "Spanish Content V3": "Hola [first name], ¡gracias por la solicitud de amistad! 😊\n\nTengo curiosidad, ¿me agregaste después de ver mi última publicación sobre [tema]? 🤔\n\nMe encanta intercambiar sobre este tema y estaría encantado(a) de discutirlo contigo!"
   },
   {
    "Statut": "OK",
    "Category": "Accept/Decline",
    "Article": 6,
    "French Title": "Bienvenue | Question Dernier Post + RDV",
    "French Content V1": "Bonjour [first name], merci pour la demande d’ami ! 😊\n\nDis-moi, est-ce que tu m’as ajouté suite à mon dernier post sur [sujet] ?\nJ’adore échanger sur ce thème et serais ravi(e) d’en discuter avec toi.\n\n👉 Si tu veux en savoir plus ou partager tes idées, tu peux réserver un créneau de [temps] en cliquant ici : [lien de réservation].  ",
    "French Content V2": "Salut [first name], merci pour l’ajout ! 😊✨\n\nJe me demandais, est-ce que c’est mon dernier post sur [sujet] qui t’a donné envie de te connecter ?\nJ’aime vraiment parler de [sujet], alors si tu veux échanger ou poser des questions, tu peux réserver un créneau de [temps] ici :\n\n👉 [lien de réservation].  ",
    "French Content V3": "Hello [first name], merci pour la demande d’ami ! 😊🤝\n\nJe suis curieux, est-ce que tu m’as ajouté après avoir vu mon dernier post sur [sujet] ?\nJ’adore échanger sur ce thème, et si tu veux en discuter, tu peux prendre un rendez-vous de [temps] en cliquant ici :\n\n👉 [lien de réservation].  ",
    "English Title": "Welcome | Last Post Question + Appointment",
    "English Content V1": "Hello [first name], thank you for the friend request! 😊\n\nTell me, did you add me after my last post about [topic]?\nI love discussing this theme and would be delighted to talk about it with you.\n\n👉 If you want to know more or share your ideas, you can book a slot of [time] by clicking here: [booking link].",
    "English Content V2": "Hi [first name], thanks for the add! 😊✨\n\nI was wondering, is it my last post on [topic] that made you want to connect?\n\nI really enjoy talking about [topic], so if you want to chat or ask questions, you can book a time slot of [time] here:\n👉 [booking link].",
    "English Content V3": "Hello [first name], thank you for the friend request! 😊🤝\n\nI am curious, did you add me after seeing my latest post on [topic]?\n\nI love discussing this theme, and if you want to talk about it, you can schedule a [time] appointment by clicking here:\n👉 [booking link].",
    "German Title": "Willkommen | Frage Letzter Beitrag + Termin",
    "German Content V1": "Hallo [first name], vielen Dank für die Freundschaftsanfrage! 😊\n\nSag mal, hast du mich nach meinem letzten Beitrag über [Thema] hinzugefügt?\nIch liebe es, über dieses Thema auszutauschen und würde mich freuen, mit dir darüber zu diskutieren.\n\n👉 Wenn du mehr erfahren oder deine Ideen teilen möchtest, kannst du hier einen Termin von [Zeit] buchen: [Buchungslink].",
    "German Content V2": "Hallo [first name], danke für die Hinzufügung! 😊✨\n\nIch habe mich gefragt, war es mein letzter Beitrag über [Thema], der dich dazu gebracht hat, dich zu verbinden?\n\nIch rede wirklich gerne über [Thema], also wenn du dich austauschen oder Fragen stellen möchtest, kannst du hier einen Termin von [Zeit] buchen:\n👉 [Buchungslink].",
    "German Content V3": "Hallo [first name], danke für die Freundschaftsanfrage! 😊🤝\n\nIch bin neugierig, hast du mich hinzugefügt, nachdem du meinen letzten Beitrag zu [Thema] gesehen hast?\n\nIch liebe es, über dieses Thema zu diskutieren, und wenn du darüber sprechen möchtest, kannst du einen Termin von [Zeit] buchen, indem du hier klickst:\n👉 [Reservierungslink].",
    "Spanish Title": "Bienvenido | Pregunta Última Publicación + Cita",
    "Spanish Content V1": "Hola [first name], ¡gracias por la solicitud de amistad! 😊\n\nDime, ¿me has agregado a raíz de mi última publicación sobre [tema]?\nMe encanta intercambiar sobre este tema y estaría encantado a de discutirlo contigo.\n\n👉 Si quieres saber más o compartir tus ideas, puedes reservar un espacio de [tiempo] haciendo clic aquí: [enlace de reserva].",
    "Spanish Content V2": "Hola [first name], ¡gracias por agregarme! 😊✨\n\nMe preguntaba, ¿es mi última publicación sobre [tema] la que te hizo querer conectarte?\n\nRealmente me gusta hablar sobre [tema], así que si quieres intercambiar ideas o hacer preguntas, puedes reservar un espacio de [tiempo] aquí:\n👉 [enlace de reserva].",
    "Spanish Content V3": "Hola [first name], ¡gracias por la solicitud de amistad! 😊🤝\n\nTengo curiosidad, ¿me agregaste después de ver mi última publicación sobre [tema]?\n\nMe encanta intercambiar sobre este tema, y si quieres discutirlo, puedes hacer una cita de [tiempo] haciendo clic aquí:\n👉 [enlace de reserva]."
   },
   {
    "Statut": "OK",
    "Category": "Accept/Decline",
    "Article": 7,
    "French Title": "Refus | Liste pleine | Ressource à Télécharger",
    "French Content V1": "Bonjour [first name], merci pour ta demande d’ami ! 😊\n\nMalheureusement, ma liste d’amis est pleine. Mais pas de souci, je t’offre une ressource gratuite sur [sujet] que tu peux télécharger ici :\n\n👉 [lien de la ressource].\nEn espérant que ça te soit utile ! ✨  ",
    "French Content V2": "Salut [first name] ! Merci pour l’ajout ! 🌟\n\nMa liste d’amis est pleine, mais je t’offre avec plaisir une ressource gratuite sur [sujet] :\n\n👉 [lien de la ressource].\nJ’espère que cela te sera utile ! 📚",
    "French Content V3": "Hello [first name], merci pour ta demande d’ami ! 😊\n\nMalheureusement, je suis au maximum sur ma liste d’amis. Cependant, j’ai une ressource gratuite sur [sujet] que tu peux obtenir ici :\n\n👉 [lien de la ressource].\nJ’espère qu’elle te sera précieuse ! 🌟  ",
    "English Title": "Refusal | Full list | Resource to Download",
    "English Content V1": "Hello [first name], thank you for your friend request! 😊\n\nUnfortunately, my friends list is full. But no worries, I’m offering you a free resource on [topic] that you can download here:\n👉 [resource link].\n\nHoping it will be useful to you! ✨",
    "English Content V2": "Hi [first name]! Thank you for the addition! 🌟\n\nMy friends list is full, but I gladly offer you a free resource on [topic]:\n👉 [resource link].\n\nI hope you find it useful! 📚",
    "English Content V3": "Hello [first name], thank you for your friend request! 😊\n\nUnfortunately, I am at my maximum on my friends list. However, I have a free resource on [topic] that you can get here:\n👉 [link to the resource].\n\nI hope it will be valuable to you! 🌟",
    "German Title": "Refus | Liste voll | Ressource herunterladen",
    "German Content V1": "Hallo [first name], danke für deine Freundschaftsanfrage! 😊\n\nLeider ist meine Freundesliste voll. Aber keine Sorge, ich biete dir eine kostenlose Ressource zu [Thema], die du hier herunterladen kannst:\n👉 [Link zur Ressource].\n\nIch hoffe, es ist dir nützlich! ✨",
    "German Content V2": "Hallo [first name]! Danke für die Hinzufügung! 🌟\n\nMeine Freundesliste ist voll, aber ich biete dir gerne eine kostenlose Ressource zu [Thema] an:\n👉 [Link zur Ressource].\n\nIch hoffe, dass es dir nützlich sein wird! 📚",
    "German Content V3": "Hallo [first name], danke für deine Freundschaftsanfrage! 😊\n\nLeider bin ich auf meiner Freundesliste am Limit. Dennoch habe ich eine kostenlose Ressource zu [Thema], die du hier erhalten kannst:\n👉 [Link zur Ressource].\n\nIch hoffe, sie wird dir wertvoll sein! 🌟",
    "Spanish Title": "Refus | Lista completa | Recurso para descargar",
    "Spanish Content V1": "Hola [first name], ¡gracias por tu solicitud de amistad! 😊\n\nDesafortunadamente, mi lista de amigos está llena. Pero no te preocupes, te ofrezco un recurso gratuito sobre [tema] que puedes descargar aquí:\n👉 [enlace del recurso].\n\n¡Espero que te sea útil! ✨",
    "Spanish Content V2": "¡Hola [first name]! ¡Gracias por ltu solicitud! 🌟\n\nMi lista de amigos está llena, pero con gusto te ofrezco un recurso gratuito sobre [tema]:\n👉 [enlace del recurso].\n\n¡Espero que te sea útil! 📚",
    "Spanish Content V3": "Hola [first name], ¡gracias por tu solicitud de amistad! 😊\n\nDesafortunadamente, estoy al máximo en mi lista de amigos. Sin embargo, tengo un recurso gratuito sobre [tema] que puedes obtener aquí:\n👉 [enlace del recurso].\n\n¡Espero que te sea valioso! 🌟"
   },
   {
    "Statut": "OK",
    "Category": "Accept/Decline",
    "Article": 8,
    "French Title": "Refus | Liste pleine | Groupe Facebook",
    "French Content V1": "Bonjour [first name], merci pour ta demande d’ami ! 😊\n\nMa liste d’amis est actuellement pleine, mais tu peux toujours nous rejoindre sur mon groupe Facebook où je partage du contenu similaire :\n\n👉 [lien du groupe].\nÀ bientôt j’espère ! 🌟  ",
    "French Content V2": "Salut [first name] ! Merci pour ta demande ! 🎉\n\nMa liste est complète pour le moment, mais tu peux toujours rejoindre mon groupe Facebook pour accéder à des contenus similaires :\n\n👉 [lien du groupe].\nAu plaisir de t’y voir ! 💬",
    "French Content V3": "Hello [first name] ! Merci pour l’ajout ! 😊\n\nMa liste d’amis est au max, mais rejoins-nous sur mon groupe Facebook, où je partage régulièrement du contenu intéressant :\n\n👉 [lien du groupe].\nHâte de t’y retrouver ! 🌟  ",
    "English Title": "Refusal | Full list | Facebook group",
    "English Content V1": "Hello [first name], thank you for your friend request! 😊\n\nMy friends list is currently full, but you can still join us on my Facebook group where I share similar content:\n👉 [group link].\n\nHope to see you soon! 🌟",
    "English Content V2": "Hello [first name]! Thank you for your request! 🎉\n\nMy list is full at the moment, but you can still join my Facebook group to access similar content:\n👉 [group link].\n\nLooking forward to seeing you there! 💬",
    "English Content V3": "Hello [first name]! Thank you for the add! 😊\n\nMy friends list is full, but join us on my Facebook group, where I regularly share interesting content:\n👉 [group link].\n\nCan't wait to see you there! 🌟",
    "German Title": "Refus | Liste voll | Gruppe Facebook",
    "German Content V1": "Hallo [first name], danke für deine Freundschaftsanfrage! 😊\n\nMeine Freundesliste ist derzeit voll, aber du kannst immer noch meiner Facebook-Gruppe beitreten, wo ich ähnliche Inhalte teile:\n👉 [Link zur Gruppe].\n\nBis bald, ich hoffe! 🌟",
    "German Content V2": "Hallo [first name]! Vielen Dank für deine Anfrage! 🎉\n\nMeine Liste ist im Moment voll, aber du kannst immer noch meiner Facebook-Gruppe beitreten, um auf ähnliche Inhalte zuzugreifen:\n👉 [Link zur Gruppe].\n\nIch freue mich, dich dort zu sehen! 💬",
    "German Content V3": "Hallo [first name]! Danke für die Hinzufügung! 😊\n\nMeine Freundesliste ist voll, aber tritt uns in meiner Facebook-Gruppe bei, wo ich regelmäßig interessante Inhalte teile:\n👉 [Link zur Gruppe].\n\nIch freue mich darauf, dich dort zu sehen! 🌟",
    "Spanish Title": "Refus | Lista llena | Grupo de Facebook",
    "Spanish Content V1": "Hola [first name], ¡gracias por tu solicitud de amistad! 😊\n\nMi lista de amigos está actualmente llena, pero siempre puedes unirte a nuestro grupo de Facebook donde comparto contenido similar:\n👉 [enlace del grupo].\n\n¡Espero verte pronto! 🌟",
    "Spanish Content V2": "¡Hola [first name] ! ¡Gracias por tu solicitud! 🎉\n\nMi lista está completa por el momento, pero siempre puedes unirte a mi grupo de Facebook para acceder a contenidos similares:\n👉 [enlace del grupo].\n\n¡Espero verte allí! 💬",
    "Spanish Content V3": "Hola [first name] ! Gracias por agregarme ! 😊\n\nMi lista de amigos está al máximo, pero únete a nosotros en mi grupo de Facebook, donde comparto regularmente contenido interesante :\n👉 [enlace del grupo].\n\n¡Espero verte allí! 🌟"
   },
   {
    "Statut": "OK",
    "Category": "Updates & Information",
    "Article": 1,
    "French Title": "Annoncer une nouvelle fonctionnalité",
    "French Content V1": "Bonjour [first name], je voulais te tenir informé d’une nouveauté excitante : 🎉\n\nNous venons de lancer une nouvelle fonctionnalité dans [produit service], spécialement conçue pour optimiser [processus activité].\nCela pourrait vraiment t’aider à atteindre [résultat clé].\n\n👉 Si tu veux plus de détails, réserve ton créneau ici : [lien de réservation]. 😊  ",
    "French Content V2": "Salut [first name] ! Grande nouvelle : 🎉\n\nNous avons lancé une fonctionnalité inédite dans [produit service] qui aide à optimiser [processus activité].\nJe suis sûr que cela pourrait vraiment t’aider à atteindre [résultat clé].\n\n👉 Si tu veux discuter des détails, n’hésite pas à réserver ici : [lien de réservation]. 🚀  ",
    "French Content V3": "Hello [first name], j’ai une super nouvelle à partager ! 🌟\n\nOn vient de lancer une nouvelle fonctionnalité dans [produit service], conçue pour optimiser [processus activité].\nÇa pourrait vraiment t’aider à atteindre [résultat clé].\n\n👉 Si tu veux en savoir plus, tu peux réserver un créneau ici : [lien de réservation]. 💡",
    "English Title": "Announce a new feature",
    "English Content V1": "Hello [first name], I wanted to keep you informed about an exciting new development: 🎉\n\nWe have just launched a new feature in [product service], specifically designed to optimize [process activity].\nThis could really help you achieve [key result].\n\n👉 If you want more details, reserve your slot here: [booking link]. 😊",
    "English Content V2": "Hello [first name]! Great news: 🎉\n\nWe have launched a brand new feature in [product service] that helps optimize [process activity].\nI am sure this could really help you achieve [key result].\n\n👉 If you want to discuss the details, feel free to book here: [booking link]. 🚀",
    "English Content V3": "Hello [first name], I have some great news to share! 🌟\n\nWe just launched a new feature in [product service], designed to optimize [process activity].\nIt could really help you achieve [key result].\n\n👉 If you want to know more, you can book a slot here: [booking link]. 💡",
    "German Title": "Ankündigung einer neuen Funktion",
    "German Content V1": "Hallo [first name], ich wollte dich über eine aufregende Neuigkeit informieren: 🎉\n\nWir haben eine neue Funktion in [Produkt Dienstleistung] gestartet, die speziell entwickelt wurde, um [Prozess Aktivität] zu optimieren.\nDas könnte dir wirklich helfen, [Schlüsselergebnis] zu erreichen.\n\n👉 Wenn du mehr Details möchtest, reserviere deinen Termin hier: [Buchungslink]. 😊",
    "German Content V2": "Hallo [first name]! Große Neuigkeiten: 🎉\n\nWir haben eine neuartige Funktion in [Produkt Dienstleistung] gestartet, die dabei hilft, [Prozess Aktivität] zu optimieren.\nIch bin mir sicher, dass dir das wirklich helfen könnte, [Schlüsselresultat] zu erreichen.\n\n👉 Wenn du die Details besprechen möchtest, zögere nicht, hier zu buchen: [Buchungslink]. 🚀",
    "German Content V3": "Hallo [first name], ich habe eine tolle Neuigkeit zu teilen! 🌟\n\nWir haben gerade eine neue Funktion in [Produkt Dienstleistung] gestartet, die entwickelt wurde, um [Prozess Aktivität] zu optimieren.\nDas könnte dir wirklich helfen, [Schlüsselresultat] zu erreichen.\n\n👉 Wenn du mehr erfahren möchtest, kannst du hier einen Termin reservieren: [Reservierungslink]. 💡",
    "Spanish Title": "Anunciar una nueva funcionalidad",
    "Spanish Content V1": "Hola [first name], quería mantenerte informado de una novedad emocionante: 🎉\n\nAcabamos de lanzar una nueva funcionalidad en [producto servicio], especialmente diseñada para optimizar [proceso actividad].\nEsto podría realmente ayudarte a alcanzar [resultado clave].\n\n👉 Si quieres más detalles, reserva tu horario aquí: [enlace de reserva]. 😊",
    "Spanish Content V2": "¡Hola [first name]! Gran noticia: 🎉\n\nHemos lanzado una función innovadora en [producto servicio] que ayuda a optimizar [proceso actividad].\nEstoy seguro de que esto podría realmente ayudarte a alcanzar [resultado clave].\n\n👉 Si quieres discutir los detalles, no dudes en reservar aquí: [enlace de reserva]. 🚀",
    "Spanish Content V3": "Hola [first name], ¡tengo una súper noticia para compartir! 🌟\n\nAcabamos de lanzar una nueva funcionalidad en [producto servicio], diseñada para optimizar [proceso actividad].\nRealmente podría ayudarte a alcanzar [resultado clave].\n\n👉 Si quieres saber más, puedes reservar un espacio aquí: [enlace de reserva]. 💡"
   },
   {
    "Statut": "OK",
    "Category": "Updates & Information",
    "Article": 2,
    "French Title": "Mise à jour de service",
    "French Content V1": "Bonjour [first name], nous avons apporté des améliorations importantes à [produit service] pour encore mieux répondre à tes besoins dans [processus activité]. ✨\n\nCette mise à jour inclut [détail de la mise à jour], et je pense que cela pourrait vraiment t’aider à [résultat clé].\n\n👉 Si tu souhaites en discuter, réserve ton créneau ici : [lien de réservation]. 💬",
    "French Content V2": "Salut [first name], on a récemment amélioré [produit service] pour mieux répondre à tes attentes dans [processus activité]. 🚀\n\nLa mise à jour inclut [détail de la mise à jour], ce qui pourrait vraiment t’aider à atteindre [résultat clé].\n\n👉 Si tu veux en parler, tu peux réserver un créneau ici : [lien de réservation]. 😊  ",
    "French Content V3": "Hello [first name], je voulais te faire part des dernières améliorations de [produit service] pour faciliter [processus activité]. 🌟\n\nCette mise à jour inclut [détail de la mise à jour], ce qui pourrait être un vrai plus pour [résultat clé].\n\n👉 Réserve un créneau ici si tu souhaites en parler : [lien de réservation]. 💡  ",
    "English Title": "Service update",
    "English Content V1": "Hello [first name], we have made significant improvements to [product service] to better meet your needs in [process activity]. ✨\n\nThis update includes [update detail], and I think it could really help you achieve [key result].\n\n👉 If you would like to discuss this, book your slot here: [booking link]. 💬",
    "English Content V2": "Hello [first name], we recently improved [product service] to better meet your expectations in [process activity]. 🚀\n\nThe update includes [update detail], which could really help you achieve [key result].\n\n👉 If you want to discuss it, you can book a slot here: [booking link]. 😊",
    "English Content V3": "Hello [first name], I wanted to share with you the latest improvements of [product service] to facilitate [process activity]. 🌟\n\nThis update includes [update detail], which could be a real plus for [key result].\n\n👉 Book a slot here if you want to discuss it: [booking link]. 💡",
    "German Title": "Service-Update",
    "German Content V1": "Hallo [first name], wir haben wichtige Verbesserungen an [Produkt Dienstleistung] vorgenommen, um noch besser auf deine Bedürfnisse in [Prozess Aktivität] einzugehen. ✨\n\nDieses Update umfasst [Detail des Updates], und ich denke, dass es dir wirklich helfen könnte, [Schlüsselresultat] zu erreichen.\n\n👉 Wenn du darüber sprechen möchtest, reserviere hier deinen Termin: [Buchungslink]. 💬",
    "German Content V2": "Hallo [first name], wir haben kürzlich [Produkt Dienstleistung] verbessert, um besser auf deine Erwartungen in [Prozess Aktivität] einzugehen. 🚀\n\nDas Update umfasst [Detail des Updates], was dir wirklich helfen könnte, [Schlüssel-Ergebnis] zu erreichen.\n\n👉 Wenn du darüber sprechen möchtest, kannst du hier einen Termin buchen: [Buchungslink]. 😊",
    "German Content V3": "Hallo [first name], ich wollte dir von den neuesten Verbesserungen von [Produkt Dienstleistung] berichten, um [Prozess Aktivität] zu erleichtern. 🌟\n\nDieses Update umfasst [Detail des Updates], was ein echter Vorteil für [Schlüssel-Ergebnis] sein könnte\n.\n👉 Reserviere hier einen Termin, wenn du darüber sprechen möchtest: [Buchungslink]. 💡",
    "Spanish Title": "Actualización de servicio",
    "Spanish Content V1": "Hola [first name], hemos realizado mejoras importantes en [producto servicio] para satisfacer aún mejor tus necesidades en [proceso actividad]. ✨\n\nEsta actualización incluye [detalle de la actualización], y creo que esto podría realmente ayudarte a [resultado clave].\n\n👉 Si deseas discutirlo, reserva tu espacio aquí: [enlace de reserva]. 💬",
    "Spanish Content V2": "Hola [first name], recientemente hemos mejorado [producto servicio] para responder mejor a tus expectativas en [proceso actividad]. 🚀\n\nLa actualización incluye [detalle de la actualización], lo que podría realmente ayudarte a alcanzar [resultado clave].\n\n👉 Si quieres hablar de esto, puedes reservar un espacio aquí: [enlace de reserva]. 😊",
    "Spanish Content V3": "Hola [first name], quería informarte sobre las últimas mejoras de [producto servicio] para facilitar [proceso actividad]. 🌟\n\nEsta actualización incluye [detalle de la actualización], lo que podría ser una verdadera ventaja para [resultado clave].\n\n👉 Reserva un horario aquí si deseas hablar sobre ello: [enlace de reserva]. 💡"
   },
   {
    "Statut": "OK",
    "Category": "Updates & Information",
    "Article": 3,
    "French Title": "Notification de maintenance",
    "French Content V1": "Bonjour [first name], je voulais te prévenir que [produit service] sera en maintenance le [date] de [heure] à [heure]. ⚙️\n\nPendant cette période, certaines fonctionnalités seront temporairement indisponibles.\n\n👉 N’hésite pas à me contacter si tu as des questions ou des besoins spécifiques pendant ce temps. 📞",
    "French Content V2": "Salut [first name], je voulais t’informer que [produit service] sera en maintenance le [date] de [heure] à [heure]. 🔧\n\nDes fonctionnalités pourraient être temporairement inaccessibles.\n\n👉 Si tu as des questions, je reste dispo pour t’aider ! 😊  ",
    "French Content V3": "Hello [first name], un petit mot pour te prévenir que [produit service] sera en maintenance le [date] de [heure] à [heure]. 🛠️\n\nDes fonctionnalités seront temporairement hors service.\n\n👉 Si tu as des questions ou des besoins particuliers, je suis là pour t’aider ! 😊  ",
    "English Title": "Maintenance notification",
    "English Content V1": "Hello [first name], I wanted to inform you that [product service] will be undergoing maintenance on [date] from [time] to [time]. ⚙️\n\nDuring this period, some features will be temporarily unavailable.\n\n👉 Feel free to contact me if you have any questions or specific needs during this time. 📞",
    "English Content V2": "Hello [first name], I wanted to inform you that [product service] will be under maintenance on [date] from [time] to [time]. 🔧\n\nSome features may be temporarily inaccessible.\n\n👉 If you have any questions, I am available to help you! 😊",
    "English Content V3": "Hello [first name], a little note to let you know that [product service] will be under maintenance on [date] from [time] to [time]. 🛠️\n\nSome features will be temporarily out of service.\n\n👉 If you have any questions or specific needs, I am here to help you! 😊",
    "German Title": "Wartungsbenachrichtigung",
    "German Content V1": "Hallo [first name], ich wollte dich informieren, dass [Produkt Dienstleistung] am [Datum] von [Uhrzeit] bis [Uhrzeit] gewartet wird. ⚙️\n\nWährend dieser Zeit werden bestimmte Funktionen vorübergehend nicht verfügbar sein.\n\n👉 Zögere nicht, mich zu kontaktieren, wenn du Fragen oder spezielle Bedürfnisse während dieser Zeit hast. 📞",
    "German Content V2": "Hallo [first name], ich wollte dich informieren, dass [Produkt Dienstleistung] am [Datum] von [Uhrzeit] bis [Uhrzeit] gewartet wird. 🔧\n\nEinige Funktionen könnten vorübergehend nicht verfügbar sein.\n\n👉 Wenn du Fragen hast, stehe ich dir gerne zur Verfügung! 😊",
    "German Content V3": "Hallo [first name], ein kurzer Hinweis, um dich zu informieren, dass [Produkt Dienstleistung] am [Datum] von [Uhrzeit] bis [Uhrzeit] gewartet wird. 🛠️\n\nEinige Funktionen werden vorübergehend außer Betrieb sein.\n\n👉 Wenn du Fragen oder besondere Bedürfnisse hast, bin ich hier, um dir zu helfen! 😊",
    "Spanish Title": "Notificación de mantenimiento",
    "Spanish Content V1": "Hola [first name], quería avisarte que [producto servicio] estará en mantenimiento el [fecha] a [hora]. ⚙️\n\nDurante este período, algunas funcionalidades no estarán disponibles.\n\n👉 No dudes en contactarme si tienes preguntas o necesidades específicas durante este tiempo. 📞",
    "Spanish Content V2": "Hola [first name], quería informarte que [producto servicio] estará en mantenimiento el [fecha] de [hora] a [hora]. 🔧\n\nEs posible que algunas funciones estén temporalmente inaccesibles.\n\n👉 Si tienes preguntas, ¡estoy disponible para ayudarte! 😊",
    "Spanish Content V3": "Hola [first name], un pequeño mensaje para informarte que [producto servicio] estará en mantenimiento el [fecha] a [hora]. 🛠️\n\nAlgunas funcionalidades estarán temporalmente fuera de servicio.\n\n👉 Si tienes preguntas o necesidades particulares, ¡estoy aquí para ayudarte! 😊"
   },
   {
    "Statut": "OK",
    "Category": "Updates & Information",
    "Article": 4,
    "French Title": "Notification rupture de stock",
    "French Content V1": "\nBonjour [first name], je voulais te prévenir que [produit service] est actuellement en rupture de stock, victime de son succès ! 🚀\n\nNe t’inquiète pas, je te tiendrai informé(e) dès qu’il sera à nouveau disponible pour que tu puisses en profiter.\n\n👉 En attendant, n’hésite pas à me contacter si tu as des questions ou si je peux t’aider autrement ! 😊",
    "French Content V2": "Salut [first name], malheureusement, [produit service] est temporairement indisponible en raison de la forte demande. ⚡\n\nSouhaites-tu que je te tienne informé(e) dès qu’il sera de retour en stock ?\n\n👉 Si tu as des questions ou si tu veux explorer d’autres options, je suis disponible pour en discuter. 😊  ",
    "French Content V3": "Hello [first name], je voulais te prévenir que [produit service] est actuellement épuisé, la demande a été incroyable ! 🌟\n\nCependant, je m’assure de te tenir au courant dès qu’il sera de retour en stock.\n\n👉 Si tu le souhaites, fais-moi signe et je m’assurerai que tu sois parmi les premiers informés ! 😊  ",
    "English Title": "Notification out of stock",
    "English Content V1": "Hello [first name], I wanted to inform you that [product service] is currently out of stock, a victim of its success! 🚀\n\nDon't worry, I will keep you updated as soon as it is available again so you can take advantage of it.\n\n👉 In the meantime, feel free to contact me if you have any questions or if I can help you in any other way! 😊",
    "English Content V2": "Hi [first name], unfortunately, [product service] is temporarily unavailable due to high demand. ⚡\n\nWould you like me to keep you informed as soon as it is back in stock?\n\n👉 If you have any questions or if you want to explore other options, I am available to discuss. 😊",
    "English Content V3": "Hello [first name], I wanted to let you know that [product service] is currently out of stock, the demand has been incredible! 🌟\n\nHowever, I will make sure to keep you updated as soon as it is back in stock.\n\n👉 If you would like, let me know and I will ensure that you are among the first to be informed! 😊",
    "German Title": "Benachrichtigung über Lagerausverkauf",
    "German Content V1": "Hallo [first name], ich wollte dich informieren, dass [Produkt Dienstleistung] derzeit ausverkauft ist, ein Opfer seines Erfolgs! 🚀\n\nMach dir keine Sorgen, ich werde dich informieren, sobald es wieder verfügbar ist, damit du es nutzen kannst.\n\n👉 In der Zwischenzeit zögere nicht, mich zu kontaktieren, wenn du Fragen hast oder wenn ich dir anderweitig helfen kann! 😊",
    "German Content V2": "Hallo [first name], leider ist [Produkt Dienstleistung] vorübergehend nicht verfügbar aufgrund der hohen Nachfrage. ⚡\n\nMöchtest du, dass ich dich informiere, sobald es wieder auf Lager ist?\n\n👉 Wenn du Fragen hast oder andere Optionen erkunden möchtest, stehe ich zur Verfügung, um darüber zu sprechen. 😊",
    "German Content V3": "Hallo [first name], ich wollte dich informieren, dass [Produkt Dienstleistung] zurzeit ausverkauft ist, die Nachfrage war unglaublich! 🌟\n\nIch werde jedoch sicherstellen, dass ich dich informiere, sobald es wieder auf Lager ist.\n\n👉 Wenn du möchtest, lass es mich wissen und ich werde dafür sorgen, dass du zu den Ersten gehörst, die informiert werden! 😊",
    "Spanish Title": "Notificación de ruptura de stock",
    "Spanish Content V1": "Hola [first name], quería avisarte que [producto servicio] está actualmente agotado, ¡víctima de su éxito! 🚀\n\nNo te preocupes, te mantendré informado a tan pronto como esté disponible nuevamente para que puedas aprovecharlo.\n\n👉 Mientras tanto, no dudes en contactarme si tienes alguna pregunta o si puedo ayudarte de alguna otra manera. 😊",
    "Spanish Content V2": "Hola [first name], lamentablemente, [producto servicio] está temporalmente indisponible debido a la alta demanda. ⚡\n\n¿Quieres que te informe tan pronto como esté de vuelta en stock?\n\n👉 Si tienes alguna pregunta o si deseas explorar otras opciones, estoy disponible para discutirlo. 😊",
    "Spanish Content V3": "Hola [first name], quería avisarte que [producto servicio] está actualmente agotado, ¡la demanda ha sido increíble! 🌟\n\nSin embargo, me aseguraré de mantenerte informado tan pronto como esté de vuelta en stock.\n\n👉 Si lo deseas, házmelo saber y me aseguraré de que seas uno de los primeros en enterarte. 😊"
   },
   {
    "Statut": "OK",
    "Category": "Updates & Information",
    "Article": 5,
    "French Title": "Découvrir un article ou contenu",
    "French Content V1": "Bonjour [first name], nous venons de publier un article sur [sujet] qui pourrait vraiment t’intéresser, surtout si tu cherches à [résultat clé]. ✨\n\nCe contenu explore des stratégies concrètes que tu peux implémenter dans ton entreprise.\n\n👉 Je te partage le lien ici : [lien de l’article].\nSi tu veux en discuter, je suis dispo. 😊  ",
    "French Content V2": "Salut [first name], j’ai pensé que notre dernier article sur [sujet] pourrait te plaire, notamment si tu cherches à [résultat clé]. 🌟\n\nOn y partage des conseils pratiques pour ton entreprise.\n\n👉 Je te laisse le lien ici : [lien de l’article].\nJe suis dispo si tu veux en échanger ! 😊  ",
    "French Content V3": "Hello [first name], je voulais te partager notre tout nouvel article sur [sujet]. 💡\n\nIl pourrait te donner des idées intéressantes pour [résultat clé] avec des conseils que tu peux appliquer directement dans ton entreprise.\n\n👉 Tu peux le lire ici : [lien de l’article].\nDis-moi si tu veux qu’on en parle ! 😊",
    "English Title": "Discover an article or content",
    "English Content V1": "Hello [first name], we just published an article on [subject] that might really interest you, especially if you are looking to [key result]. ✨\n\nThis content explores concrete strategies that you can implement in your business.\n\n👉 I'm sharing the link here: [article link].\nIf you want to discuss it, I'm available. 😊",
    "English Content V2": "Hi [first name], I thought our latest article on [topic] could interest you, especially if you're looking to [key result]. 🌟\n\nWe share practical tips for your business.\n\n👉 I'll leave the link here: [article link].\nI'm available if you want to discuss it! 😊",
    "English Content V3": "Hello [first name], I wanted to share our brand new article on [subject]. 💡\n\nIt could give you interesting ideas for [key result] with tips that you can apply directly in your business.\n\n👉 You can read it here: [link to the article].\n\nLet me know if you want to talk about it! 😊",
    "German Title": "Ein Artikel oder Inhalt entdecken",
    "German Content V1": "Hallo [first name], wir haben gerade einen Artikel über [Thema] veröffentlicht, der dich wirklich interessieren könnte, besonders wenn du nach [Schlüsselresultat] suchst. ✨\n\nDieser Inhalt untersucht konkrete Strategien, die du in deinem Unternehmen umsetzen kannst.\n\n👉 Ich teile dir hier den Link: [Link zum Artikel].\n\nWenn du darüber sprechen möchtest, bin ich verfügbar. 😊",
    "German Content V2": "Hallo [first name], ich dachte, dass dir unser letzter Artikel über [Thema] gefallen könnte, insbesondere wenn du nach [schlüssel Ergebnis] suchst. 🌟\n\nWir teilen praktische Tipps für dein Unternehmen.\n\n👉 Ich lasse dir hier den Link: [Link zum Artikel].\n\nIch bin verfügbar, wenn du darüber sprechen möchtest! 😊",
    "German Content V3": "Hallo [first name], ich wollte dir unseren ganz neuen Artikel über [Thema] teilen. 💡\n\nEr könnte dir interessante Ideen für [Schlüssel Ergebnis] mit Tipps geben, die du direkt in deinem Unternehmen anwenden kannst.\n\n👉 Du kannst ihn hier lesen: [Link zum Artikel].\n\nSag mir Bescheid, wenn du darüber sprechen möchtest! 😊",
    "Spanish Title": "Descubrir un artículo o contenido",
    "Spanish Content V1": "Hola [first name], acabamos de publicar un artículo sobre [tema] que realmente podría interesarte, especialmente si buscas [resultado clave]. ✨\n\nEste contenido explora estrategias concretas que puedes implementar en tu empresa.\n\n👉 Te comparto el enlace aquí: [enlace del artículo].\n\nSi quieres discutirlo, estoy disponible. 😊",
    "Spanish Content V2": "Hola [first name], pensé que nuestro último artículo sobre [tema] podría gustarte, especialmente si estás buscando [resultado clave]. 🌟\n\nCompartimos consejos prácticos para tu empresa.\n👉 Te dejo el enlace aquí: [enlace del artículo].\n\nEstoy disponible si quieres charlar sobre ello! 😊",
    "Spanish Content V3": "Hola [first name], quería compartir contigo nuestro artículo más reciente sobre [tema]. 💡\n\nPodría darte ideas interesantes para [résultat clé] con consejos que puedes aplicar directamente en tu empresa.\n\n👉 Puedes leerlo aquí: [enlace del artículo].\n\n¡Dime si quieres que hablemos de ello! 😊"
   },
   {
    "Statut": "OK",
    "Category": "Partnerships",
    "Article": 1,
    "French Title": "Demande de recommandation",
    "French Content V1": "Bonjour [first name], comme tu as déjà utilisé [produit service] et que cela t’a permis d’atteindre [résultat clé], je pense que d’autres entreprises de ton réseau pourraient aussi en bénéficier. 🤝\n\nSi tu connais des contacts qui pourraient être intéressés, pourrais-tu me les recommander directement ? Cela pourrait vraiment les aider à [résultat clé]. 🌟  ",
    "French Content V2": "Salut [first name], je suis ravi(e) que [produit service] t’ait aidé à atteindre [résultat clé] ! 😊\n\nJe pense que d’autres entreprises de ton réseau pourraient aussi y trouver de la valeur.\n\n👉 Si tu connais des personnes qui pourraient être intéressées, pourrais-tu me les recommander ? Cela pourrait vraiment les aider à [résultat clé]. 🌟  ",
    "French Content V3": "Hello [first name], je suis content(e) de savoir que [produit service] t’a permis d’atteindre [résultat clé] ! 😊\n\nPenses-tu que des entreprises de ton réseau pourraient aussi en bénéficier ?\n\n👉 Si oui, pourrais-tu me recommander leurs coordonnées ? Cela pourrait vraiment les aider à [résultat clé]. 🌟  ",
    "English Title": "Request for recommendation",
    "English Content V1": "Hello [first name], since you have already used [product service] and it has helped you achieve [key result], I think other companies in your network could benefit from it as well. 🤝\n\nIf you know any contacts who might be interested, could you recommend them to me directly? It could really help them achieve [key result]. 🌟",
    "English Content V2": "Hi [first name], I am delighted that [product service] has helped you achieve [key result]! 😊\n\nI think other companies in your network could also find value in it.\n\n👉 If you know anyone who might be interested, could you recommend them to me? It could really help them achieve [key result]. 🌟",
    "English Content V3": "Hello [first name], I am happy to know that [product service] has allowed you to achieve [key result]! 😊\n\nDo you think that companies in your network could also benefit from it?\n\n👉 If so, could you recommend their contact details to me? It could really help them to [key result]. 🌟",
    "German Title": "Empfehlungsanfrage",
    "German Content V1": "Hallo [first name], da du bereits [Produkt Dienstleistung] verwendet hast und es dir ermöglicht hat, [Schlüssel Ergebnis] zu erreichen, denke ich, dass auch andere Unternehmen in deinem Netzwerk davon profitieren könnten. 🤝\n\nWenn du Kontakte kennst, die interessiert sein könnten, könntest du sie mir direkt empfehlen? \n\nDas könnte ihnen wirklich helfen, [Schlüssel Ergebnis] zu erreichen. 🌟",
    "German Content V2": "Hallo [first name], ich freue mich, dass [Produkt Dienstleistung] dir geholfen hat, [Schlüsselresultat] zu erreichen! 😊\n\nIch denke, dass auch andere Unternehmen in deinem Netzwerk davon profitieren könnten.\n\n👉 Wenn du Personen kennst, die interessiert sein könnten, könntest du mir diese empfehlen? \nDas könnte ihnen wirklich helfen, [Schlüsselresultat] zu erreichen. 🌟",
    "German Content V3": "Hallo [first name], ich freue mich zu hören, dass [Produkt Dienstleistung] dir geholfen hat, [Schlüsselresultat] zu erreichen! 😊\n\nGlaubst du, dass Unternehmen in deinem Netzwerk auch davon profitieren könnten?\n\n👉 Wenn ja, könntest du mir ihre Kontaktdaten empfehlen? Das könnte ihnen wirklich helfen, [Schlüsselresultat] zu erreichen. 🌟",
    "Spanish Title": "Solicitud de recomendación",
    "Spanish Content V1": "Hola [first name], como ya has utilizado [producto servicio] y te ha permitido alcanzar [resultado clave], creo que otras empresas de tu red también podrían beneficiarse. 🤝\n\nSi conoces contactos que podrían estar interesados, ¿podrías recomendármelos directamente? Realmente podría ayudarlos a [resultado clave]. 🌟",
    "Spanish Content V2": "Hola [first name], estoy encantado de que [producto servicio] te haya ayudado a alcanzar [resultado clave] ! 😊\n\nCreo que otras empresas de tu red también podrían encontrar valor en ello.\n\n👉 Si conoces a personas que podrían estar interesadas, ¿podrías recomendármelas? Eso podría realmente ayudarles a [resultado clave]. 🌟",
    "Spanish Content V3": "Hola [first name], estoy contento(a) de saber que [producto servicio] te ha permitido alcanzar [resultado clave] ! 😊\n\n¿Crees que empresas de tu red también podrían beneficiarse?\n\n👉 Si es así, ¿podrías recomendarme sus datos de contacto? Realmente podría ayudarlos a [resultado clave]. 🌟"
   },
   {
    "Statut": "OK",
    "Category": "Partnerships",
    "Article": 2,
    "French Title": "Proposition de partenariat",
    "French Content V1": "Bonjour [first name], en voyant l’expertise de ton entreprise dans [secteur], je pense qu’un partenariat serait bénéfique pour nous deux. 🤝\n\nEn combinant [tes forces] et [nos services], nous pourrions ensemble atteindre [objectif commun].\n\n👉 Si cela t’intéresse, réserve un créneau ici pour qu’on en discute : [lien de réservation]. 🌟  ",
    "French Content V2": "Salut [first name], étant donné l’expertise de ton entreprise dans [secteur], je pense qu’un partenariat pourrait être très enrichissant ! 🌟\n\nEn unissant [tes forces] et [nos services], nous pourrions atteindre ensemble [objectif commun].\n\n👉 Réserve un créneau ici si tu souhaites en discuter davantage : [lien de réservation]. 😊  ",
    "French Content V3": "Hello [first name], ton expertise dans [secteur] est impressionnante, et je pense qu’un partenariat pourrait vraiment apporter de la valeur des deux côtés. 💡\n\nEn combinant [tes forces] avec [nos services], nous pourrions atteindre ensemble [objectif commun].\n\n👉 Si cela te parle, réserve un créneau ici pour qu’on en discute : [lien de réservation]. 🌟  ",
    "English Title": "Partnership proposal",
    "English Content V1": "Hello [first name], seeing your company's expertise in [sector], I think a partnership would be beneficial for both of us. 🤝\n\nBy combining [your strengths] and [our services], we could together achieve [common goal].\n\n👉 If you are interested, book a slot here so we can discuss it: [booking link]. 🌟",
    "English Content V2": "Hi [first name], given your company’s expertise in [sector], I think a partnership could be very rewarding! 🌟\n\nBy combining [your strengths] and [our services], we could achieve [shared goal] together.\n\n👉 Reserve a slot here if you want to discuss it further: [booking link]. 😊",
    "English Content V3": "Hello [first name], your expertise in [sector] is impressive, and I think a partnership could really bring value to both sides. 💡\n\nBy combining [your strengths] with [our services], we could together achieve [common goal].\n\n👉 If this resonates with you, book a slot here so we can discuss it: [booking link]. 🌟",
    "German Title": "Vorschlag für eine Partnerschaft",
    "German Content V1": "Hallo [first name], angesichts der Expertise deines Unternehmens im Bereich [Sektor] denke ich, dass eine Partnerschaft für uns beide von Vorteil wäre. 🤝\n\nIndem wir [deine Stärken] und [unsere Dienstleistungen] kombinieren, könnten wir gemeinsam [gemeinsames Ziel] erreichen.\n\n👉 Wenn dich das interessiert, buche hier einen Termin, damit wir darüber sprechen können: [Buchungslink]. 🌟",
    "German Content V2": "Hallo [first name], angesichts der Expertise deines Unternehmens im Bereich [Sektor] denke ich, dass eine Partnerschaft sehr bereichernd sein könnte! 🌟\n\nIndem wir [deine Stärken] und [unsere Dienstleistungen] vereinen, könnten wir gemeinsam [gemeinsames Ziel] erreichen.\n\n👉 Reserviere hier einen Termin, wenn du weiter darüber sprechen möchtest: [Reservierungslink]. 😊",
    "German Content V3": "Hallo [first name], dein Fachwissen in [Bereich] ist beeindruckend, und ich denke, dass eine Partnerschaft wirklich beiden Seiten Wert bringen könnte. 💡\n\nIndem wir [deine Stärken] mit [unseren Dienstleistungen] kombinieren, könnten wir gemeinsam [gemeinsames Ziel] erreichen.\n\n👉 Wenn das für dich interessant klingt, reserviere hier einen Termin, um darüber zu sprechen: [Buchungslink]. 🌟",
    "Spanish Title": "Propuesta de asociación",
    "Spanish Content V1": "Hola [first name], al ver la experiencia de tu empresa en [sector], creo que una asociación sería beneficiosa para los dos. 🤝\n\nAl combinar [tus fortalezas] y [nuestros servicios], podríamos alcanzar juntos [objetivo común].\n\n👉 Si te interesa, reserva un espacio aquí para que lo discutamos: [enlace de reserva]. 🌟",
    "Spanish Content V2": "Hola [first name], dado la experiencia de tu empresa en [sector], ¡creo que una colaboración podría ser muy enriquecedora! 🌟\n\nAl unir [tus fuerzas] y [nuestros servicios], podríamos alcanzar juntos [objetivo común].\n\n👉 Reserva un espacio aquí si deseas discutir más: [enlace de reserva]. 😊",
    "Spanish Content V3": "Hola [first name], tu experiencia en [sector] es impresionante, y creo que una asociación podría realmente aportar valor de ambos lados. 💡\n\nAl combinar [tus fortalezas] con [nuestros servicios], podríamos alcanzar juntos [objetivo común].\n\n👉 Si esto te interesa, reserva un espacio aquí para que lo discutamos: [enlace de reserva]. 🌟"
   },
   {
    "Statut": "OK",
    "Category": "Partnerships",
    "Article": 3,
    "French Title": "Récompense pour parrainage",
    "French Content V1": "Bonjour [first name], comme tu as été satisfait par [produit service] et que cela t’a aidé à [résultat clé], je voulais te proposer une opportunité intéressante. 🎉\n\nPour chaque nouvelle [personne entreprise] que tu recommanderas à [nom de la société], tu pourrais gagner une récompense.\n\n👉 Est-ce que c’est quelque chose qui t’intéresserait ? 😊  ",
    "French Content V2": "Salut [first name], je suis ravi(e) de savoir que [produit service] t’a aidé à [résultat clé] ! 😊\n\nJ’aimerais te proposer une opportunité : tu pourrais gagner une récompense pour chaque nouvelle [personne entreprise] que tu recommanderas à [nom de la société].\n\n👉 Est-ce que cela t’intéresserait ? 🌟  ",
    "French Content V3": "Hello [first name], je suis ravi(e) que [produit service] ait contribué à [résultat clé] pour toi ! 😊\n\nJe voulais te proposer de recevoir une récompense pour chaque nouvelle [personne entreprise] que tu recommanderais à [nom de la société].\n\n👉 Est-ce quelque chose qui pourrait t’intéresser ? 🌟  ",
    "English Title": "Referral reward",
    "English Content V1": "Hello [first name], since you were satisfied with [product service] and it helped you achieve [key result], I wanted to offer you an interesting opportunity. 🎉\n\nFor every new [person company] you refer to [company name], you could earn a reward.\n\n👉 Is this something that would interest you? 😊",
    "English Content V2": "Hi [first name], I am delighted to know that [product service] helped you achieve [key result]! 😊\n\nI would like to offer you an opportunity: you could earn a reward for each new [person company] you recommend to [company name].\n\n👉 Would you be interested in that? 🌟",
    "English Content V3": "Hello [first name], I am delighted that [product service] has contributed to [key result] for you! 😊\n\nI wanted to offer you a reward for each new [person company] you would recommend to [company name].\n\n👉 Is this something that might interest you? 🌟",
    "German Title": "Belohnung für Empfehlungen",
    "German Content V1": "Hallo [first name], da du mit [Produkt Dienstleistung] zufrieden warst und es dir geholfen hat, [Schlüssel-Ergebnis] zu erreichen, wollte ich dir eine interessante Gelegenheit anbieten. 🎉\n\nFür jede neue [Person Unternehmen], die du an [Name des Unternehmens] empfiehlst, könntest du eine Belohnung gewinnen.\n\n👉 Ist das etwas, das dich interessieren würde? 😊",
    "German Content V2": "Hallo [first name], ich freue mich zu erfahren, dass dir [Produkt Dienstleistung] geholfen hat, [ergebnis] zu erreichen! 😊\n\nIch möchte dir eine Gelegenheit anbieten: Du könntest eine Belohnung für jede neue [Person Firma] verdienen, die du an [Name des Unternehmens] empfiehlst.\n\n👉 Würde dich das interessieren? 🌟",
    "German Content V3": "Hallo [first name], ich freue mich, dass [Produkt Dienstleistung] dir bei [Schlüssel-Ergebnis] geholfen hat! 😊\n\nIch wollte dir vorschlagen, eine Belohnung für jede neue [Person Firma], die du an [Name des Unternehmens] empfehlen würdest, zu erhalten.\n\n👉 Ist das etwas, das dich interessieren könnte? 🌟",
    "Spanish Title": "Recompensa por patrocinio",
    "Spanish Content V1": "Hola [first name], como has estado satisfecho con [producto servicio] y te ha ayudado a [resultado clave], quería ofrecerte una oportunidad interesante. 🎉\n\nPor cada nueva [persona empresa] que recomiendes a [nombre de la empresa], podrías ganar una recompensa.\n\n👉 ¿Es algo que te interesaría? 😊",
    "Spanish Content V2": "Hola [first name], ¡me alegra saber que [producto servicio] te ha ayudado a [resultado clave]! 😊\n\nMe gustaría ofrecerte una oportunidad: podrías ganar una recompensa por cada nueva [persona empresa] que recomiendes a [nombre de la empresa].\n\n👉 ¿Te interesaría? 🌟",
    "Spanish Content V3": "Hola [first name], ¡estoy encantado(a) de que [producto servicio] haya contribuido a [resultado clave] para ti! 😊\n\nQuería proponerte recibir una recompensa por cada nueva [persona empresa] que recomiendes a [nombre de la empresa].\n\n👉 ¿Es algo que podría interesarte? 🌟"
   },
   {
    "Statut": "OK",
    "Category": "Partnerships",
    "Article": 4,
    "French Title": "Collaboration stratégique",
    "French Content V1": "Bonjour [first name], je sais que [produit service] a été bénéfique pour ton entreprise en t’aidant à [résultat clé]. 🌟\n\nC’est pourquoi je pense qu’une collaboration stratégique avec nous pourrait être encore plus intéressante.\nNous pourrions nous allier pour [objectif commun].\n\n👉 Est-ce que ça t’intéresserait ? Je peux t’en dire plus si tu veux. 😊  ",
    "French Content V2": "Salut [first name], je vois que [produit service] a été utile pour t’aider à [résultat clé]. 🚀\n\nUne collaboration stratégique pourrait nous permettre d’aller encore plus loin ensemble, en travaillant sur [objectif commun].\n\n👉 Cela te semble-t-il intéressant ? Je peux t’en dire plus si tu veux ! 😊  ",
    "French Content V3": "Hello [first name], je vois que [produit service] t’a déjà aidé à [résultat clé]. Une collaboration avec nous pourrait ouvrir de nouvelles perspectives pour atteindre [objectif commun]. 💡\n\n👉 Qu’en penses-tu ? Je serais ravi(e) de t’en dire davantage si cela t’intéresse ! 🤝",
    "English Title": "Strategic collaboration",
    "English Content V1": "Hello [first name], I know that [product service] has been beneficial for your business by helping you achieve [key result]. 🌟\n\nThat’s why I think a strategic collaboration with us could be even more interesting.\nWe could join forces for [common goal].\n\n👉 Would that interest you? I can tell you more if you’d like. 😊",
    "English Content V2": "Hi [first name], I see that [product service] has been helpful in assisting you with [key result]. 🚀\n\nA strategic collaboration could allow us to go even further together, working on [common goal].\n\n👉 Does that seem interesting to you? I can tell you more if you want! 😊",
    "English Content V3": "Hello [first name], I see that [product service] has already helped you achieve [key result]. \n\nA collaboration with us could open new perspectives to reach [common goal]. 💡\n\n👉 What do you think? I would be happy to tell you more if you're interested! 🤝",
    "German Title": "Strategische Zusammenarbeit",
    "German Content V1": "Hallo [first name], ich weiß, dass [Produkt Dienstleistung] für dein Unternehmen von Vorteil war, indem es dir geholfen hat, [schlüssel Ergebnis] zu erreichen. 🌟\n\nDeshalb denke ich, dass eine strategische Zusammenarbeit mit uns noch interessanter sein könnte.\nWir könnten uns zusammenschließen, um [gemeinsames Ziel] zu erreichen.\n\n👉 Würde dich das interessieren? Ich kann dir gerne mehr darüber erzählen, wenn du möchtest. 😊",
    "German Content V2": "Hallo [first name], ich sehe, dass [Produkt Dienstleistung] dir geholfen hat, [schlüssel Ergebnis] zu erreichen. 🚀\n\nEine strategische Zusammenarbeit könnte uns ermöglichen, gemeinsam noch weiter zu kommen, indem wir an [gemeinsames Ziel] arbeiten.\n\n👉 Klingt das für dich interessant? Ich kann dir gerne mehr erzählen, wenn du möchtest! 😊",
    "German Content V3": "Hallo [first name], ich sehe, dass [Produkt Dienstleistung] dir bereits geholfen hat, [Schlüsselresultat] zu erreichen. Eine Zusammenarbeit mit uns könnte neue Perspektiven eröffnen, um [gemeinsames Ziel] zu erreichen. 💡\n\n👉 Was hältst du davon? Ich würde mich freuen, dir mehr darüber zu erzählen, wenn du interessiert bist! 🤝",
    "Spanish Title": "Colaboración estratégica",
    "Spanish Content V1": "Hola [first name], sé que [producto servicio] ha sido beneficioso para tu empresa al ayudarte a [resultado clave]. 🌟\n\nPor eso creo que una colaboración estratégica con nosotros podría ser aún más interesante.\nPodríamos unirnos para [objetivo común].\n\n👉 ¿Te interesaría? Puedo contarte más si quieres. 😊",
    "Spanish Content V2": "Hola [first name], veo que [producto servicio] ha sido útil para ayudarte a [resultado clave]. 🚀\n\nUna colaboración estratégica podría permitirnos ir aún más lejos juntos, trabajando en [objetivo común].\n\n👉 ¿Te parece interesante? ¡Puedo contarte más si quieres! 😊",
    "Spanish Content V3": "Hola [first name], veo que [producto servicio] ya te ha ayudado a [resultado clave]. Una colaboración con nosotros podría abrir nuevas perspectivas para alcanzar [objetivo común]. 💡\n\n👉 ¿Qué opinas? ¡Estaría encantado a de contarte más si te interesa! 🤝"
   },
   {
    "Statut": "OK",
    "Category": "Partnerships",
    "Article": 5,
    "French Title": "Invitation à un événement de partenariat",
    "French Content V1": "Bonjour [first name], je me permets de te contacter parce que ton expertise dans [secteur] et ta satisfaction avec [produit service] me font penser que tu pourrais profiter de notre événement de partenariat. 🌟\n\nCe sera une occasion unique de rencontrer d’autres leaders et d’explorer des opportunités de collaboration.\n\n👉 L’événement aura lieu le [date]. Réserve ta place ici : [lien de réservation]. 🤝",
    "French Content V2": "Salut [first name], je prends l’initiative de te contacter car ton expertise en [secteur] et ta satisfaction avec [produit service] m’ont fait penser que notre événement de partenariat pourrait vraiment t’intéresser. 💡\n\nC’est une opportunité unique de rencontrer d’autres leaders et de découvrir des pistes de collaboration.\n\n👉 L’événement aura lieu le [date], et tu peux réserver ta place ici : [lien de réservation]. 🌟  ",
    "French Content V3": "Hello [first name], avec ton expertise en [secteur] et ton expérience avec [produit service], je pense que notre événement de partenariat pourrait être une opportunité précieuse. 🎯\n\nTu pourras échanger avec des leaders inspirants et découvrir des idées pour développer [objectif commun].\n\n👉 Rendez-vous le [date] ! Réserve ta place ici : [lien de réservation]. 🗓️",
    "English Title": "Invitation to a partnership event",
    "English Content V1": "Hello [first name], I am reaching out to you because your expertise in [sector] and your satisfaction with [product service] make me think that you could benefit from our partnership event. 🌟\n\nIt will be a unique opportunity to meet other leaders and explore collaboration opportunities.\n\n👉 The event will take place on [date]. Reserve your spot here: [reservation link]. 🤝",
    "English Content V2": "Hi [first name], I’m taking the initiative to contact you because your expertise in [sector] and your satisfaction with [product service] made me think that our partnership event might really interest you. 💡\n\nIt’s a unique opportunity to meet other leaders and discover collaboration opportunities.\n\n👉 The event will take place on [date], and you can reserve your spot here: [reservation link]. 🌟",
    "English Content V3": "Hello [first name], with your expertise in [sector] and your experience with [product service], I believe that our partnership event could be a valuable opportunity. 🎯\n\nYou will be able to connect with inspiring leaders and discover ideas to develop [common goal].\n\n👉 See you on [date]! Reserve your spot here: [reservation link]. 🗓️",
    "German Title": "Einladung zu einer Partnerschaftsveranstaltung",
    "German Content V1": "Hallo [first name], ich erlaube mir, dich zu kontaktieren, weil deine Expertise im [Bereich] und deine Zufriedenheit mit [Produkt Dienstleistung] mich glauben lassen, dass du von unserer Partnerschaftsveranstaltung profitieren könntest. 🌟\n\nEs wird eine einzigartige Gelegenheit sein, andere Führungskräfte zu treffen und Möglichkeiten zur Zusammenarbeit zu erkunden.\n\n👉 Die Veranstaltung findet am [Datum] statt. Reserviere deinen Platz hier: [Reservierungslink]. 🤝",
    "German Content V2": "Hallo [first name], ich nehme die Initiative, dich zu kontaktieren, da dein Fachwissen in [Sektor] und deine Zufriedenheit mit [Produkt Dienstleistung] mich denken lassen haben, dass unser Partnerschaftsereignis dich wirklich interessieren könnte. 💡\n\nEs ist eine einzigartige Gelegenheit, andere Führungspersönlichkeiten zu treffen und Möglichkeiten zur Zusammenarbeit zu entdecken.\n\n👉 Die Veranstaltung findet am [Datum] statt, und du kannst dir hier deinen Platz reservieren: [Reservierungslink]. 🌟",
    "German Content V3": "Hallo [first name], mit deinem Fachwissen in [Bereich] und deiner Erfahrung mit [Produkt Dienstleistung] denke ich, dass unser Partnerschaftsevent eine wertvolle Gelegenheit sein könnte. 🎯\n\nDu wirst mit inspirierenden Führungspersönlichkeiten austauschen und Ideen entdecken, um [gemeinsames Ziel] zu entwickeln.\n\n👉 Treffen wir uns am [Datum]! Reserviere deinen Platz hier: [Reservierungslink]. 🗓️",
    "Spanish Title": "Invitación a un evento de asociación",
    "Spanish Content V1": "Hola [first name], me permito contactarte porque tu experiencia en [secteur] y tu satisfacción con [produit service] me hacen pensar que podrías beneficiarte de nuestro evento de asociación. 🌟\n\nSerá una ocasión única para conocer a otros líderes y explorar oportunidades de colaboración.\n\n👉 El evento tendrá lugar el [date]. Reserva tu lugar aquí: [enlace de reseva]. 🤝",
    "Spanish Content V2": "Hola [first name], me tomo la iniciativa de contactarte porque tu experiencia en [sector] y tu satisfacción con [produit service] me hicieron pensar que nuestro evento de asociación podría realmente interesarte. 💡\n\nEs una oportunidad única para conocer a otros líderes y descubrir posibles colaboraciones.\n\n👉 El evento tendrá lugar el [date], y puedes reservar tu lugar aquí: [enlace de reserva]. 🌟",
    "Spanish Content V3": "Hola [first name], con tu experiencia en [sector] y tu experiencia con [producto servicio], creo que nuestro evento de asociación podría ser una oportunidad valiosa. 🎯\n\nPodrás intercambiar ideas con líderes inspiradores y descubrir ideas para desarrollar [objetivo común].\n\n👉 ¡Nos vemos el [fecha]! Reserva tu lugar aquí: [enlace de reserva]. 🗓️"
   }
  
];

// Function to process and save categories and messages from the provided JSON
exports.addCategoryAndMessages = async (req, res) => {
  try {
    const user_id = 0;

    for (const item of object) {
      // Create or find the category
      const category = await findOrCreateCategory(user_id, item.Category);

      // Create messages and variants for each language
      for (const [languageWithTitle, title] of Object.entries(item).filter(
        ([key]) => key.endsWith("Title")
      )) {
        const messageTitle = title;
        const messageContent = {};
        const language = languageWithTitle.replace(" Title", "");

        // Collect content variants for this language
        for (const [key, content] of Object.entries(item).filter(([key]) =>
          key.includes(`Content`)
        )) {
          if (key.startsWith(language)) {
            const variantKey = key.split(" ").slice(-1)[0];
            messageContent[variantKey] = content;
          }
        }

        const exsistingMessage = await MessageTemplate.findOne({
          where: {
            title: messageTitle,
            category_id: category.id,
            language,
            user_id,
          },
        });
        if (exsistingMessage) {
          // console.log("message already exists");
          continue;
        }
        const message = await MessageTemplate.create({
          user_id,
          category_id: category.id,
          title: messageTitle,
          created_at: new Date(),
          language,
        });

        // Create message variants
        await createMessageVariants(message.id, messageContent, language);
      }
    }

    return res
      .status(201)
      .json({ message: "Categories and messages added successfully" });
  } catch (error) {
    console.error("Error adding categories and messages:", error);
    return res
      .status(500)
      .json({ error: "Failed to add categories and messages" });
  }
};

exports.deleteCategoryAndMessages = async (req, res) => {
  try {
    for (const item of object) {
      // Create or find the category
      let category = await Category.findOne({ where: { name: item.Category } });
      if (category) {
        await category.destroy();
      }
      // Create messages and variants for each language
      for (const [languageWithTitle, title] of Object.entries(item).filter(
        ([key]) => key.endsWith("Title")
      )) {
        const messageTitle = title;
        const messageContent = {};
        const language = languageWithTitle.replace(" Title", "");

        // Collect content variants for this language
        for (const [key, content] of Object.entries(item).filter(([key]) =>
          key.includes(`Content`)
        )) {
          if (key.startsWith(language)) {
            const variantKey = key.split(" ").slice(-1)[0];
            messageContent[variantKey] = content;
          }
        }

        const exsistingMessage = await Message.findOne({
          where: {
            title: messageTitle,
            language,
          },
        });
        if (exsistingMessage) {
          await MessageVariant.destroy({
            where: {
              message_id: exsistingMessage.id,
            },
          });
          await exsistingMessage.destroy();
        }
      }
    }

    return res
      .status(201)
      .json({ message: "Categories and messages deleted successfully" });
  } catch (error) {
    console.error("Error adding categories and messages:", error);
    return res.status(500).json({ error: error });
  }
};
