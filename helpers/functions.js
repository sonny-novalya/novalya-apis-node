const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { db } = require("../config/database/connection");
const secretKey = process.env.jwtSecretKey;
const axios = require("axios");
const { Section, SectionType, Sequelize } = require("./../Models");

const database = require("../Models/crm");

const tags = {
  fr: [
    {
      custom_color: "#ADD8E6",
      name: "Prospect Froid",
      randomCode: generateRandomCode(10),
      order_num: 1,
    },
    {
      custom_color: "#FF0000",
      name: "Prospect Chaud",
      randomCode: generateRandomCode(10),
      order_num: 2,
    },
  ],
  en: [
    {
      custom_color: "#ADD8E6",
      name: "Cold Lead",
      randomCode: generateRandomCode(10),
      order_num: 1,
    },
    {
      custom_color: "#FF0000",
      name: "Hot Lead",
      randomCode: generateRandomCode(10),
      order_num: 2,
    },
  ],
  de: [
    {
      custom_color: "#ADD8E6",
      name: "Kalte Aussicht",
      randomCode: generateRandomCode(10),
      order_num: 1,
    },
    {
      custom_color: "#FF0000",
      name: "Heiße Aussicht",
      randomCode: generateRandomCode(10),
      order_num: 2,
    },
  ],
  sr: [
    {
      custom_color: "#ADD8E6",
      name: "Prospecto Frío",
      randomCode: generateRandomCode(10),
      order_num: 1,
    },
    {
      custom_color: "#FF0000",
      name: "Prospecto Caliente",
      randomCode: generateRandomCode(10),
      order_num: 2,
    },
  ],
};

const stages = {
  en: [
    { name: "Prospection", stage_num: 1 },
    { name: "Conversation", stage_num: 2 },
    { name: "Invitation", stage_num: 3 },
  ],
  fr: [
    { name: "Prospection", stage_num: 1 },
    { name: "Conversation", stage_num: 2 },
    { name: "Invitation", stage_num: 3 },
  ],
  de: [
    { name: "Prospektion", stage_num: 1 },
    { name: "Gespräch", stage_num: 2 },
    { name: "Einladung", stage_num: 3 },
  ],
  sr: [
    { name: "Prospección", stage_num: 1 },
    { name: "Conversación", stage_num: 2 },
    { name: "Invitación", stage_num: 3 },
  ],
};

const messageSectionsFacebook = {
  en: [
    {
      section: "Hello (First Name)",
      variants: [
        "Hello [first name]\n",
        "Hi [first name]\n",
        "Hey [first name]\n",
      ],
    },
    {
      section: "How are you",
      variants: ["How are you?\n\n", "How is it going?\n\n", "What’s up?\n\n"],
    },
    {
      section: "Beautiful day",
      variants: [
        "I’ve came across your profile and I wanted to wish you a beautiful day 🙂\n\n",
        "Your profile popped up in my feed and so I just came to wish you a wonderful day 😃\n\n",
        "Your profile has been randomly shown to me and I jump on the occasion to wish you a great day 😎\n\n",
      ],
    },
  ],
  fr: [
    {
      section: "Bonjour (prénom)",
      variants: [
        "Bonjour [first name]\n",
        "Salut [first name]\n",
        "Hello [first name]\n",
      ],
    },
    {
      section: "Hola (nombre)",
      variants: [
        "Comment vas tu ?\n\n",
        "Comment ça va ?\n\n",
        "J’espère que tu vas bien.\n\n",
      ],
    },
    {
      section: "Belle journée",
      variants: [
        "J’ai vu ton profil et je voulais te souhaiter une belle journée 🙂\n\n",
        "Ton profil est apparu dans mon feed et je suis juste venu te souhaiter une merveilleuse journée 😃\n\n",
        "Ton profil m'a été suggéré par hasard et je saute sur l'occasion pour te souhaiter une excellente journée 😎\n\n",
      ],
    },
  ],
  sr: [
    {
      section: "Guten Morgen (Vornamen)",
      variants: [
        "Hola [first name]\n",
        "Saludos [first name]\n",
        "Hey [first name]\n",
      ],
    },
    {
      section: "Cómo estás",
      variants: [
        "Cómo estás?\n\n",
        "Espero que estés bien.\n\n",
        "Espero que te encuentres bien.\n\n",
      ],
    },
    {
      section: "Hermoso dia",
      variants: [
        "He visto tu perfil y quería desearte un hermoso día 🙂\n\n",
        "Tu perfil apareció en mi feed y solo quería desearte un día maravilloso 😃\n\n",
        "Tu perfil me fue sugerido por casualidad y aprovecho la oportunidad para desearte un excelente día 😎\n\n",
      ],
    },
  ],
  de: [
    {
      section: "Guten Morgen",
      variants: [
        "Guten Morgen [first name]\n",
        "Hallo [first name]\n",
        "Hello [first name]\n",
      ],
    },
    {
      section: "Wie geht es dir ?",
      variants: [
        "Wie geht es dir?\n\n",
        "Wie geht es dir?\n\n",
        "Ich hoffe, dass es dir gut geht.\n\n",
      ],
    },
    {
      section: "Schöner Tag",
      variants: [
        "Ich habe dein Profil gesehen und wollte dir einen schönen Tag wünschen 🙂\n\n",
        "Dein Profil ist in meinem Feed erschienen und ich bin nur gekommen, um dir einen wunderbaren Tag zu wünschen. 😃\n\n",
        "Dein Profil wurde mir zufällig vorgeschlagen und ich ergreife die Gelegenheit, um dir einen tollen Tag zu wünschen 😎\n\n",
      ],
    },
  ],
};

const messageSectionsInstagram = {
  en: [
    {
      section: "Hello (No name)",
      variants: ["Hello\n", "Hi\n", "Hey\n"],
    },
    {
      section: "How are you",
      variants: ["How are you?\n\n", "How is it going?\n\n", "What’s up?\n\n"],
    },
    {
      section: "Beautiful day",
      variants: [
        "I’ve came across your profile and I wanted to wish you a beautiful day 🙂\n\n",
        "Your profile popped up in my feed and so I just came to wish you a wonderful day 😃\n\n",
        "Your profile has been randomly shown to me and I jump on the occasion to wish you a great day 😎\n\n",
      ],
    },
  ],
  fr: [
    {
      section: "Bonjour (sans prénom)",
      variants: ["Bonjour\n", "Salut\n", "Hello\n"],
    },
    {
      section: "Hola (nombre)",
      variants: [
        "Comment vas tu ?\n\n",
        "Comment ça va ?\n\n",
        "J’espère que tu vas bien.\n\n",
      ],
    },
    {
      section: "Belle journée",
      variants: [
        "J’ai vu ton profil et je voulais te souhaiter une belle journée 🙂\n\n",
        "Ton profil est apparu dans mon feed et je suis juste venu te souhaiter une merveilleuse journée 😃\n\n",
        "Ton profil m'a été suggéré par hasard et je saute sur l'occasion pour te souhaiter une excellente journée 😎\n\n",
      ],
    },
  ],
  sr: [
    {
      section: "Hola (sin nombre)",
      variants: ["Hola\n", "Saludos\n", "Hey\n"],
    },
    {
      section: "Cómo estás",
      variants: [
        "Cómo estás?\n\n",
        "Espero que estés bien.\n\n",
        "Espero que te encuentres bien.\n\n",
      ],
    },
    {
      section: "Hermoso dia",
      variants: [
        "He visto tu perfil y quería desearte un hermoso día 🙂\n\n",
        "Tu perfil apareció en mi feed y solo quería desearte un día maravilloso 😃\n\n",
        "Tu perfil me fue sugerido por casualidad y aprovecho la oportunidad para desearte un excelente día 😎\n\n",
      ],
    },
  ],
  de: [
    {
      section: "Guten Morgen (ohne Vornamen)",
      variants: ["Guten Morgen\n", "Hallo\n", "Hello\n"],
    },
    {
      section: "Wie geht es dir ?",
      variants: [
        "Wie geht es dir?\n\n",
        "Wie geht es dir?\n\n",
        "Ich hoffe, dass es dir gut geht.\n\n",
      ],
    },
    {
      section: "Schöner Tag",
      variants: [
        "Ich habe dein Profil gesehen und wollte dir einen schönen Tag wünschen 🙂\n\n",
        "Dein Profil ist in meinem Feed erschienen und ich bin nur gekommen, um dir einen wunderbaren Tag zu wünschen. 😃\n\n",
        "Dein Profil wurde mir zufällig vorgeschlagen und ich ergreife die Gelegenheit, um dir einen tollen Tag zu wünschen 😎\n\n",
      ],
    },
  ],
};

const birthdayMessagesSections = {
  fr: [
    {
      section: "Anniversaire - INTRO",
      variants: [
        "Un jour spécial est arrivé [first name]\n\n",
        "Il paraitrait que c’est un jour spécial [first name]\n\n",
        "Hello [first name]\n\n",
      ],
    },
    {
      section: "Anniversaire - Souhait",
      variants: [
        "Je te souhaite un Joyeux anniversaire 🙂\n\n",
        "Happy Birthday 🥳\n\n",
        "Je te souhaite un très Joyeux Anniversaire 🎂\n\n",
      ],
    },
    {
      section: "Anniversaire - Question",
      variants: [
        "Qu’est ce que tu as prévu de beau ?\n\n",
        "Comment est-ce que tu vas fêter ça ?\n\n",
        "Quels sont tes plans pour célébrer dignement ce moment ?\n\n",
      ],
    },
  ],
  en: [
    {
      section: "Birthday - INTRO",
      variants: [
        "It's a special day [first name]\n\n",
        "It seems to be a special day today [first name]\n\n",
        "Hello [first name]\n\n",
      ],
    },
    {
      section: "Birthday - Wish",
      variants: [
        "I wish you a Happy Birthday 🎂\n\n",
        "Happy Birthday to you 🥳\n\n",
        "Wishing you a Happy Birthday 🎉\n\n",
      ],
    },
    {
      section: "Birthday - Question",
      variants: [
        "What do you have planned?\n\n",
        "How are you gonna celebrate?\n\n",
        "What are your plans for celebrating this moment in style?\n\n",
      ],
    },
  ],
  sr: [
    {
      section: "Cumpleaños - INTRO",
      variants: [
        "Ha llegado un día especial [first name]\n\n",
        "Parece que es un día especial [first name]\n\n",
        "Hola [first name]",
      ],
    },
    {
      section: "Cumpleaños - Deseo",
      variants: [
        "Te deseo un feliz cumpleaños 🎂\n\n",
        "Feliz Cumpleaños 🥳\n\n",
        "Te deseo un muy feliz cumpleaños 🎉\n\n",
      ],
    },
    {
      section: "Cumpleaños - Pregunta",
      variants: [
        "¿Qué planes tienes?\n\n",
        "Cómo lo vas a festejar?\n\n",
        "Qué planeas hacer para festejarlo como se debe?\n\n",
      ],
    },
  ],
  de: [
    {
      section: "Geburtstag- INTRO",
      variants: [
        "Ein besonderer Tag ist gekommen [first name]\n\n",
        "Angeblich ist es ein besonderer Tag [first name]\n\n",
        "Hallo [first name]\n\n",
      ],
    },
    {
      section: "Geburtstag- Wunsch",
      variants: [
        "Ich wünsche dir alles Gute zum Geburtstag 🎂\n\n",
        "Alles Gute zum Geburtstag 🥳\n\n",
        "Ich wünsche Ihnen alles Gute zum Geburtstag 🎉\n\n",
      ],
    },
    {
      section: "Geburtstag- Frage",
      variants: [
        "Was hast du Schönes geplant?\n\n",
        "Wie wirst du feiern?\n\n",
        "Welche Pläne hast du, um diesen Moment würdig zu feiern?\n\n",
      ],
    },
  ],
};

const belatedBirthdayMessagesSections = {
  fr: [
    {
      section: "Anniversaire - Retard - INTRO",
      variants: [
        "Oups 😬 je viens de voir qu’un jour spécial vient de passer…\n\n",
        "J’ai réalisé que ton anniversaire est passé !\n\n",
        "Ohhhh noonnn… Je viens de voir que j’ai loupé ton anniversaire\n\n.",
      ],
    },
    {
      section: "Anniversaire - Retard - Souhait",
      variants: [
        "Un peu en retard mais je te souhaite un Joyeux anniversaire [first name] 🙂\n\n",
        "Il n’est jamais trop tard pour ce genre d’occasion… Happy Birthday [first name] 🥳\n\n",
        "Je te souhaite un très Joyeux Anniversaire [first name] 🎂\n\n",
      ],
    },
    {
      section: "Anniversaire - Retard- Question",
      variants: [
        "Qu’est ce que tu as fait de beau ?\n\n",
        "Comment est-ce que tu as fêté ça ?\n\n",
        "Comment as-tu célébré ce moment ?\n\n",
      ],
    },
  ],
  en: [
    {
      section: "Birthday - Delay- INTRO",
      variants: [
        "Oups 😬 I've just seen that a special day has come and gone…\n\n",
        "I realized that your birthday has come and gone!\n\n",
        "Ohhhh noonnn... I just saw that I missed your birthday.\n\n",
      ],
    },
    {
      section: "Birthday - Delay- Wish",
      variants: [
        "A bit late but I wish you a Happy Birthday [first name] 🙂\n\n",
        "It's never too late for this kind of occasion… Happy Birthday [first name] 🥳\n\n",
        "Wishing you a very Happy Birthday [first name] 🎂\n\n",
      ],
    },
    {
      section: "Birthday - Delay- Question",
      variants: [
        "What have you done?\n\n",
        "How did you celebrate?\n\n",
        "How did you celebrate the moment?\n\n",
      ],
    },
  ],
  sr: [
    {
      section: "Cumpleaños - Retardo - INTRO",
      variants: [
        "😬 Acabo de ver que acaba de pasar un día especial…\n\n",
        "Me di cuenta que tu cumple ya pasó!\n\n",
        "Ohhhh noonnn... Acabo de ver que me perdí tu cumpleaños.\n\n",
      ],
    },
    {
      section: "Cumpleaños- Retardo - Souhait",
      variants: [
        "Un poco tarde pero te deseo un Feliz Cumpleaños [first name] 🙂\n\n",
        "Nunca es tarde para ese tipo de ocasión, Feliz cumpleaños [first name] 🥳\n\n",
        "Te deseo un muy Feliz Cumpleaños [first name] 🎂\n\n",
      ],
    },
    {
      section: "Cumpleaños- Retardo - Question",
      variants: [
        "¿Cómo la pasaste?\n\n",
        "¿Cómo lo festejaste?\n\n",
        "¿Lo festejaste como se debe?\n\n",
      ],
    },
  ],
  de: [
    {
      section: "Geburtstag- Verzögerung - INTRO",
      variants: [
        "Oups 😬 ich habe gerade gesehen, dass ein besonderer Tag vergangen ist…\n\n",
        "Mir ist aufgefallen, dass dein Geburtstag vorbei ist!\n\n",
        "Ohhhhh noonnn... Ich habe gerade gesehen, dass ich deinen Geburtstag verpasst habe.\n\n",
      ],
    },
    {
      section: "Geburtstag- Verzögerung - Wunsch",
      variants: [
        "Ein bisschen spät, aber ich wünsche dir alles Gute zum Geburtstag [first name] 🙂\n\n",
        "Für solche Anlässe ist es nie zu spät ... Happy Birthday [first name] 🥳\n\n",
        "Ich wünsche dir einen sehr glücklichen Geburtstag [first name] 🎂\n\n",
      ],
    },
    {
      section: "Geburtstag- Verzögerung - Frage",
      variants: [
        "Was hast du Schönes getan?\n\n",
        "Wie hast du gefeiert?\n\n",
        "Wie hast du diesen Moment gefeiert?\n\n",
      ],
    },
  ],
};

const prospectionMessageNames = {
  en: "Simple Connection",
  fr: "Connexion Simple",
  sr: "Conexión sencilla",
  de: "Einfache Verbindung",
};

const birthdayTodayMessageNames = {
  en: "Birthday",
  fr: "Anniversaire",
  sr: "Cumpleaños",
  de: "Geburtstag",
};

const birthdayPastMessageNames = {
  en: "Birthday (late)",
  fr: "Anniversaire (retard)",
  sr: "Birthday (tarde)",
  de: "Geburtstag (spät)",
};

function generateRandomCode(length) {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

const createMessage = async (name, user_id, sections, types) => {
  try {
    const newMessage = await database.MessageData.create({ user_id, name });

    if (types && types.length > 0) {
      const typePromises = types.map(async (type) => {
        return await database.MessageDataType.create({
          message_data_id: newMessage.id,
          type,
        });
      });
      await Promise.all(typePromises);
    }

    if (sections && sections.length > 0) {
      for (const section of sections) {
        await database.MessageSection.create({
          message_data_id: newMessage.id,
          section_id: section,
        });
      }
      return true;
    }
  } catch (error) {
    return error.message;
  }
};

const createDefaultTagsAndMessages = async (user_id, lang, res) => {
  try {
    if (!user_id || user_id === "undefined") {
      res
        .status(404)
        .json({ status: "error", message: "user_id is not valid" });
    }

    const availableLanguages = ["en", "fr", "sr", "de"];
    const language = availableLanguages.includes(lang.toLowerCase())
      ? lang.toLowerCase()
      : "en";

    const userTags = tags[language].map((tag) => ({ ...tag, user_id }));

    // Check if tags already exist for the user in the tag table
    const existingFbTags = await database.tag.findAll({
      where: { user_id },
    });

    // Check if tags already exist for the user in the instatag table
    const existingInstaTags = await database.instatag.findAll({
      where: { user_id },
    });

    let createdFbTags = [];
    let createdInstaTags = [];

    // Insert only if no tags exist for the user in the tag table
    if (existingFbTags.length === 0) {
      createdFbTags = await database.tag.bulkCreate(userTags, {
        returning: true,
      });
    }

    // Insert only if no tags exist for the user in the instatag table
    if (existingInstaTags.length === 0) {
      createdInstaTags = await database.instatag.bulkCreate(userTags, {
        returning: true,
      });
    }

    const userFbStages = createdFbTags.flatMap((tag) =>
      stages[language].map((stage) => ({ ...stage, user_id, tag_id: tag.id }))
    );

    const userInstaStages = createdInstaTags.flatMap((tag) =>
      stages[language].map((stage) => ({ ...stage, user_id, tag_id: tag.id }))
    );

    await Promise.all([
      database.stage.bulkCreate(userFbStages),
      database.instastage.bulkCreate(userInstaStages),
    ]);

    const prospectFacebookSectionsData = messageSectionsFacebook[language].map(
      (section) => ({
        ...section,
        varient: section.variants,
        user_id,
      })
    );

    const prospectInstaSectionsData = messageSectionsInstagram[language].map(
      (section) => ({
        ...section,
        varient: section.variants,
        user_id,
      })
    );

    const birthdayMessagesSectionsData = birthdayMessagesSections[language].map(
      (section) => ({
        ...section,
        varient: section.variants,
        user_id,
      })
    );

    const belatedBirthdayMessagesSectionsData = belatedBirthdayMessagesSections[
      language
    ].map((section) => ({
      ...section,
      varient: section.variants,
      user_id,
    }));

    // Check if sections already exist for the user in the Section table
    const existingSections = await database.Section.findAll({
      where: { user_id },
    });

    const prospectionMessageName = prospectionMessageNames[language];
    const birthdayTodayMessageName = birthdayTodayMessageNames[language];
    const birthdayPastMessageName = birthdayPastMessageNames[language];

    let facebookSections = [];
    let instaSections = [];
    let birthdayTodaySections = [];
    let birthdayBelatedSections = [];

    if (existingSections.length == 0) {
      facebookSections = await Section.bulkCreate(
        prospectFacebookSectionsData,
        { returning: true }
      );
      instaSections = await Section.bulkCreate(prospectInstaSectionsData, {
        returning: true,
      });
      birthdayTodaySections = await Section.bulkCreate(
        birthdayMessagesSectionsData,
        { returning: true }
      );
      birthdayBelatedSections = await Section.bulkCreate(
        belatedBirthdayMessagesSectionsData,
        { returning: true }
      );
    }

    const facebookSectionIds = facebookSections.map((section) => section.id);
    const instaSectionIds = instaSections.map((section) => section.id);

    const birthdayTodaySectionIds = birthdayTodaySections.map(
      (section) => section.id
    );
    const birthdayBelatedSectionIds = birthdayBelatedSections.map(
      (section) => section.id
    );

    if (facebookSectionIds.length) {
      const facebookMessage = createMessage(
        prospectionMessageName,
        user_id,
        facebookSectionIds,
        ["connect"]
      );
    }

    if (instaSectionIds.length) {
      const instagramMessage = createMessage(
        prospectionMessageName,
        user_id,
        instaSectionIds,
        ["instagram-connect"]
      );
    }
    if (birthdayTodaySectionIds.length) {
      const birthdayTodayMessage = createMessage(
        birthdayTodayMessageName,
        user_id,
        birthdayTodaySectionIds,
        ["birthday"]
      );
    }
    if (birthdayBelatedSectionIds.length) {
      const birthdayPastMessage = createMessage(
        birthdayPastMessageName,
        user_id,
        birthdayBelatedSectionIds,
        ["birthday"]
      );
    }

    return true;
  } catch (error) {
    return false;
  }
};

// Promisify the query function
const Qry = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) {
        reject(err);
        console.log(err)
      } else {
        resolve(result);
      }
    });
  });
};

async function emptyArray(arr) {
  if (Array.isArray(arr)) {
    arr.length = 0;
  } else {
    throw new Error("Parameter is not an array.");
  }
}

//find available space in tree
async function findAvailableSpace(pid, leg) {
  try {
    const [rows] = await Qry(
      "SELECT `pid`, `userid` FROM `binarytree` WHERE `pid` = ? AND `leg` = ?",
      [pid, leg]
    );
    if (!rows || rows.length === 0) {
      return pid;
    }
    const nextID = await findAvailableSpace(rows.userid, leg);
    return nextID !== null ? nextID : null;
  } catch (error) {
    return null;
  }
}

async function sendDataToRoute(data) {
  try {
    const response = await axios.post(
      "https://novalyabackend.novalya.com/user/api/ipn",
      data
    );
  } catch (error) {}
}

async function adminAuthorizationNew(req, res, next) {
  // Check if the authorization header is present
  if (!req.headers.authorization) {
    res
      .status(401)
      .json({ status: "error", message: "Authorization header is missing." });
    return false;
  } else {
    const token = req.headers.authorization.split(" ")[1];
    return new Promise((resolve) => {
      jwt.verify(token, secretKey, async (err, user) => {
        if (err) {
          res.status(401).json({ status: "error", message: "token_expired" });
          resolve(false); // Use resolve instead of reject
        } else {
          try {
            const selectUser = await Qry(
              `SELECT * FROM usersdata WHERE username = '${user.username}'`
            );
            const userData = selectUser[0];
            if (
              userData &&
              userData.username === user.username &&
              userData.usertype === "admin"
            ) {
              return next();
            } else {
              res
                .status(401)
                .json({ status: "error", message: "Invalid admin User." });
              resolve(false); // Use resolve instead of reject
            }
          } catch (error) {
            res
              .status(500)
              .json({ status: "error", message: "Server error occurred" });
            resolve(false); // Use resolve instead of reject
          }
        }
      });
    });
  }
}

async function checkAuthorization(req, res) {
  // Check if the authorization header is present
  if (!req.headers.authorization) {
    res.status(401).json({ status: "error", message: "Authorization header is missing." });
    return false;
  } else {
    const token = req.headers.authorization.split(" ")[1];
    // console.log('req.headers---824', req.headers);
    // console.log('req.headers.webiste---824', req.headers.website);
    var website = (req.headers.website) ? req.headers.website : 'app';
    return new Promise((resolve) => {
      
      jwt.verify(token, secretKey, async (err, user) => {
        // console.log(err);
        if (err) {
          res.status(401).json({ status: "error", message: "token_expired" });
          resolve(false); // Use resolve instead of reject
        } else {
          try {
            if(website == 'nuskin'){

              var selectUser = await Qry(
                `SELECT * FROM usersdata 
                 WHERE (username = '${user?.TokenName}' OR email = '${user?.TokenName}')
                 AND website = 'nuskin'`
              );
              console.log('selectUser[0]---844', selectUser[0]);
            } else {

              var selectUser = await Qry(
                `SELECT * FROM usersdata WHERE (username = '${user?.TokenName}' or email = '${user?.TokenName}')`
              );
            }
            const userData = selectUser[0];
            if (userData && (userData.username === user?.TokenName || userData.email === user?.TokenName)) {
              resolve(userData.id);
            } else {
              res
                .status(401)
                .json({ status: "error", message: "Invalid User." });
              resolve(false); // Use resolve instead of reject
            }
          } catch (error) {
            res
              .status(500)
              .json({ status: "error", message: "Server error occurred" });
            resolve(false); // Use resolve instead of reject
          }
        }
      });
    });
  }
}

async function manualLoginAuthorization(token, res) {
  return new Promise((resolve) => {
    jwt.verify(token, secretKey, async (err, user) => {
     
      if (err) {
        res.status(401).json({ status: "error", message: "token_expired" });
        resolve(false); // Use resolve instead of reject
      } else {
        try {
       
          const selectUser = await Qry(
            `SELECT * FROM usersdata WHERE (username = '${user?.TokenName}' or email = '${user?.TokenName}')`
          );
          const userData = selectUser[0];


          const selectAdmin = await Qry(
            `SELECT * FROM usersdata WHERE id = '${user.createdby.id}' and usertype = 'admin'`
          );

          if (selectUser.length > 0 && selectAdmin.length > 0) {
            resolve(userData.id);
          } else {
            res.status(401).json({ status: "error", message: "Invalid User." });
            resolve(false); // Use resolve instead of reject
          }
        } catch (error) {
          res
            .status(500)
            .json({ status: "error", message: "Server error occurred" });
          resolve(false); // Use resolve instead of reject
        }
      }
    });
  });
}

async function getAuthUser(req) {
  return new Promise((resolve, reject) => {
    if (!req.headers.authorization) {
      reject({ status: "error", message: "Authorization header is missing." });
      // return { status: 'error', message: 'Authorization header is missing.' };
    } else {
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, secretKey, async (err, user) => {
    
        if (err) {
          reject(err.message);
        } else {
          try {
            const selectUser = await Qry(
              `SELECT * FROM usersdata WHERE (username = '${user?.TokenName}' or email = '${user?.TokenName}')`
            );
            const userData = selectUser[0];

            if (userData && (userData.username === user?.TokenName || userData.email === user?.TokenName)) {
              resolve(userData.id);
            } else {
              resolve({ status: "error", message: "Invalid User." });
            }
          } catch (error) {
            resolve({ status: "error", message: "Server error occurred" });
          }
        }
      });
    }
  });
}

async function authMiddleware(req, res, next) {
  // Check if the authorization header is present
  if (!req.headers.authorization) {
    return res
      .status(401)
      .json({ status: "error", message: "Authorization header is missing." });
    return false;
  } else {
    const token = req.headers.authorization.split(" ")[1];

    return new Promise((resolve) => {
      jwt.verify(token, secretKey, async (err, user) => {
      
        if (err) {
          return res
            .status(401)
            .json({ status: "error", message: "token_expired" });
          resolve(false); // Use resolve instead of reject
        } else {
          try {
            const selectUser = await Qry(
              `SELECT * FROM usersdata WHERE (username = '${user?.TokenName}' or email = '${user?.TokenName}')`
            );
            const userData = selectUser[0];

            if (userData &&  (userData.username === user?.TokenName || userData.email === user?.TokenName)) {
              return resolve(userData);
              return next();
            } else {
              return res
                .status(401)
                .json({ status: "error", message: "Invalid User." });
              resolve(false); // Use resolve instead of reject
            }
          } catch (error) {
            return res
              .status(500)
              .json({ status: "error", message: "Server error occurred" });
            resolve(false); // Use resolve instead of reject
          }
        }
      });
    });
  }
}

async function adminAuthorization(req, res) {
  // Check if the authorization header is present

  if (!req.headers.authorization) {
    res
      .status(401)
      .json({ status: "error", message: "Authorization header is missing." });
    return false;
  } else {
    const token = req.headers.authorization.split(" ")[1];
    return new Promise((resolve) => {
      jwt.verify(token, secretKey, async (err, user) => {
        if (err) {
          res.status(401).json({ status: "error", message: "token_expired" });
          resolve(false); // Use resolve instead of reject
        } else {
          try {
            const selectUser = await Qry(
              `SELECT * FROM usersdata WHERE username = '${user.username}'`
            );
            const userData = selectUser[0];

            if (
              userData &&
              userData.username === user.username &&
              (userData.usertype === "admin" ||
                userData.usertype === "reseller")
            ) {
              var adminData = {
                id: userData.id,
                usertype: userData.usertype,
                firstname: userData.firstname,
                lastname: userData.lastname,
                parentId: userData.parent_id,
              };
              resolve(adminData); // this is for get status to the user like admin, reseller
              // resolve(userData.id); //sachin 16-04-24 : it was old on this date
            } else {
              res
                .status(401)
                .json({ status: "error", message: "Invalid admin User." });
              resolve(false); // Use resolve instead of reject
            }
          } catch (error) {
            res
              .status(500)
              .json({ status: "error", message: "Server error occurred" });
            resolve(false); // Use resolve instead of reject
          }
        }
      });
    });
  }
}

function randomToken(length = 100) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ12345689";
  let myString = "";
  for (let i = 0; i < length; i++) {
    const pos = crypto.randomInt(0, chars.length - 1);
    myString += chars[pos];
  }
  return myString;
}

async function settings_data(keyname) {
  try {
    const settingSelectQuery = `SELECT * FROM setting WHERE keyname = ?`;
    const settingSelectResult = await Qry(settingSelectQuery, [keyname]);
    return settingSelectResult;
  } catch (error) {
    return null;
  }
}

async function binary_tree_get_users(userid) {
  try {
    let data = [];

    const userSelectLeftQuery = `SELECT userid,pid FROM binarytree WHERE pid = ? and leg = ?`;
    const userSelectLeftResult = await Qry(userSelectLeftQuery, [userid, "L"]);

    data.push(userSelectLeftResult[0]);

    const userSelectRightQuery = `SELECT userid,pid FROM binarytree WHERE pid = ? and leg = ?`;
    const userSelectRightResult = await Qry(userSelectRightQuery, [
      userid,
      "R",
    ]);

    data.push(userSelectRightResult[0]);

    return data;
  } catch (error) {
    return null;
  }
}

// start current months active referrals
async function current_month_active_referrals_function(userid) {
  try {
    const leftPersonalActiveGraphQuery = `Select COUNT(id) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
    const leftPersoanlActiveGraphResult = await Qry(
      leftPersonalActiveGraphQuery,
      ["L", "Referral Binary Points"]
    );

    const rightPersonalActiveGraphQuery = `Select COUNT(id) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
    const rightPersoanlActiveGraphResult = await Qry(
      rightPersonalActiveGraphQuery,
      ["R", "Referral Binary Points"]
    );

    const deductleftPersonalActiveGraphQuery = `Select COUNT(id) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
    const deductleftPersoanlActiveGraphResult = await Qry(
      deductleftPersonalActiveGraphQuery,
      ["L", "Deduct Referral Binary Points"]
    );

    const deductrightPersonalActiveGraphQuery = `Select COUNT(id) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
    const deductrightPersoanlActiveGraphResult = await Qry(
      deductrightPersonalActiveGraphQuery,
      ["R", "Deduct Referral Binary Points"]
    );

    let personalActiveLeftCount =
      leftPersoanlActiveGraphResult[0].total -
      deductleftPersoanlActiveGraphResult[0].total;
    let personalActiveRightCount =
      rightPersoanlActiveGraphResult[0].total -
      deductrightPersoanlActiveGraphResult[0].total;

    let obj = {
      leftPersonalActiveMembers: personalActiveLeftCount,
      rightPersonalActiveMembers: personalActiveRightCount,
    };

    return obj;
  } catch (error) {
    return null;
  }
}
// end current months active referrals

// start current months organization members
async function current_month_organization_members_function(userid) {
  try {
    const leftOrganizationGraphQuery = `Select COUNT(id) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
    const leftOrganizationGraphResult = await Qry(leftOrganizationGraphQuery, [
      "L",
      "Binary Points",
    ]);

    const rightOrganizationGraphQuery = `Select COUNT(id) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
    const rightOrganizationGraphResult = await Qry(
      rightOrganizationGraphQuery,
      ["R", "Binary Points"]
    );

    const deductleftOrganizationGraphQuery = `Select COUNT(id) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
    const deductleftOrganizationGraphResult = await Qry(
      deductleftOrganizationGraphQuery,
      ["L", "Deduct Binary Points"]
    );

    const deductrightOrganizationGraphQuery = `Select COUNT(id) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
    const deductrightOrganizationGraphResult = await Qry(
      deductrightOrganizationGraphQuery,
      ["R", "Deduct Binary Points"]
    );

    let organizationLeftCount =
      leftOrganizationGraphResult[0].total -
      deductleftOrganizationGraphResult[0].total;
    let organizationRightCount =
      rightOrganizationGraphResult[0].total -
      deductrightOrganizationGraphResult[0].total;

    let obj = {
      leftOrganizationMembers: organizationLeftCount,
      rightOrganizationMembers: organizationRightCount,
    };

    return obj;
  } catch (error) {
    return null;
  }
}
// end current months organization members

// start current months organization points
async function current_month_organization_points_function(userid) {
  try {
    const leftOrganizationPointsGraphQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
    const leftOrganizationPointsGraphResult = await Qry(
      leftOrganizationPointsGraphQuery,
      ["L", "Binary Points"]
    );

    const rightOrganizationPointsGraphQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
    const rightOrganizationPointsGraphResult = await Qry(
      rightOrganizationPointsGraphQuery,
      ["R", "Binary Points"]
    );

    const deductleftOrganizationPointsGraphQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
    const deductleftOrganizationPointsGraphResult = await Qry(
      deductleftOrganizationPointsGraphQuery,
      ["L", "Deduct Binary Points"]
    );

    const deductrightOrganizationPointsGraphQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
    const deductrightOrganizationPointsGraphResult = await Qry(
      deductrightOrganizationPointsGraphQuery,
      ["R", "Deduct Binary Points"]
    );

    const addAdminleftOrganizationPointsGraphQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
    const addAdminleftOrganizationPointsGraphResult = await Qry(
      addAdminleftOrganizationPointsGraphQuery,
      ["L", "Add Binary Points By Admin"]
    );

    const addAdminRightOrganizationPointsGraphQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
    const addAdminRightOrganizationPointsGraphResult = await Qry(
      addAdminRightOrganizationPointsGraphQuery,
      ["R", "Add Binary Points By Admin"]
    );

    const deductAdminleftOrganizationPointsGraphQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
    const deductAdminleftOrganizationPointsGraphResult = await Qry(
      deductAdminleftOrganizationPointsGraphQuery,
      ["L", "Deduct Binary Points By Admin"]
    );

    const deductAdminRightOrganizationPointsGraphQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
    const deductAdminRightOrganizationPointsGraphResult = await Qry(
      deductAdminRightOrganizationPointsGraphQuery,
      ["R", "Deduct Binary Points By Admin"]
    );

    if (
      leftOrganizationPointsGraphResult[0].total === null ||
      leftOrganizationPointsGraphResult[0].total === ""
    ) {
      leftOrganizationPointsGraphResult[0].total = 0;
    }
    if (
      rightOrganizationPointsGraphResult[0].total === null ||
      rightOrganizationPointsGraphResult[0].total === ""
    ) {
      rightOrganizationPointsGraphResult[0].total = 0;
    }
    if (
      deductleftOrganizationPointsGraphResult[0].total === null ||
      deductleftOrganizationPointsGraphResult[0].total === ""
    ) {
      deductleftOrganizationPointsGraphResult[0].total = 0;
    }
    if (
      deductrightOrganizationPointsGraphResult[0].total === null ||
      deductrightOrganizationPointsGraphResult[0].total === ""
    ) {
      deductrightOrganizationPointsGraphResult[0].total = 0;
    }

    if (
      addAdminleftOrganizationPointsGraphResult[0].total === null ||
      addAdminleftOrganizationPointsGraphResult[0].total === ""
    ) {
      addAdminleftOrganizationPointsGraphResult[0].total = 0;
    }

    if (
      addAdminRightOrganizationPointsGraphResult[0].total === null ||
      addAdminRightOrganizationPointsGraphResult[0].total === ""
    ) {
      addAdminRightOrganizationPointsGraphResult[0].total = 0;
    }

    if (
      deductAdminleftOrganizationPointsGraphResult[0].total === null ||
      deductAdminleftOrganizationPointsGraphResult[0].total === ""
    ) {
      deductAdminleftOrganizationPointsGraphResult[0].total = 0;
    }

    if (
      deductAdminRightOrganizationPointsGraphResult[0].total === null ||
      deductAdminRightOrganizationPointsGraphResult[0].total === ""
    ) {
      deductAdminRightOrganizationPointsGraphResult[0].total = 0;
    }

    let organizationLeftPointsCount =
      leftOrganizationPointsGraphResult[0].total +
      addAdminleftOrganizationPointsGraphResult[0].total -
      (deductleftOrganizationPointsGraphResult[0].total +
        deductAdminleftOrganizationPointsGraphResult[0].total);
    let organizationRightPointsCount =
      rightOrganizationPointsGraphResult[0].total +
      addAdminRightOrganizationPointsGraphResult[0].total -
      (deductrightOrganizationPointsGraphResult[0].total +
        deductAdminRightOrganizationPointsGraphResult[0].total);

    let obj = {
      leftOrganizationPoints: organizationLeftPointsCount,
      rightOrganizationPoints: organizationRightPointsCount,
    };

    return obj;
  } catch (error) {
    return null;
  }
}
// end current months organization points

// start current months Referral Points
async function current_month_referral_points_function(userid) {
  try {
    const leftReferralPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
    const leftReferralPointsResult = await Qry(leftReferralPointsQuery, [
      "L",
      "Referral Binary Points",
    ]);

    const rightReferralPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
    const rightReferralPointsResult = await Qry(rightReferralPointsQuery, [
      "R",
      "Referral Binary Points",
    ]);

    const leftDeductReferralPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
    const leftDeductReferralPointsResult = await Qry(
      leftDeductReferralPointsQuery,
      ["L", "Deduct Referral Binary Points"]
    );

    const rightDeductReferralPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
    const rightDeductReferralPointsResult = await Qry(
      rightDeductReferralPointsQuery,
      ["R", "Deduct Referral Binary Points"]
    );

    const addleftReferralPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
    const addleftReferralPointsResult = await Qry(addleftReferralPointsQuery, [
      "L",
      "Add Referral Binary Points By Admin",
    ]);

    const addrightReferralPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
    const addrightReferralPointsResult = await Qry(
      addrightReferralPointsQuery,
      ["R", "Add Referral Binary Points By Admin"]
    );

    const deductleftReferralPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
    const deductleftReferralPointsResult = await Qry(
      deductleftReferralPointsQuery,
      ["L", "Deduct Referral Binary Points By Admin"]
    );

    const deductrightReferralPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
    const deductrightReferralPointsResult = await Qry(
      deductrightReferralPointsQuery,
      ["R", "Deduct Referral Binary Points By Admin"]
    );

    if (
      leftReferralPointsResult[0].total === null ||
      leftReferralPointsResult[0].total === ""
    ) {
      leftReferralPointsResult[0].total = 0;
    }
    if (
      leftDeductReferralPointsResult[0].total === null ||
      leftDeductReferralPointsResult[0].total === ""
    ) {
      leftDeductReferralPointsResult[0].total = 0;
    }
    if (
      rightReferralPointsResult[0].total === null ||
      rightReferralPointsResult[0].total === ""
    ) {
      rightReferralPointsResult[0].total = 0;
    }
    if (
      rightDeductReferralPointsResult[0].total === null ||
      rightDeductReferralPointsResult[0].total === ""
    ) {
      rightDeductReferralPointsResult[0].total = 0;
    }

    if (
      addleftReferralPointsResult[0].total === null ||
      addleftReferralPointsResult[0].total === ""
    ) {
      addleftReferralPointsResult[0].total = 0;
    }

    if (
      addrightReferralPointsResult[0].total === null ||
      addrightReferralPointsResult[0].total === ""
    ) {
      addrightReferralPointsResult[0].total = 0;
    }

    if (
      deductleftReferralPointsResult[0].total === null ||
      deductleftReferralPointsResult[0].total === ""
    ) {
      deductleftReferralPointsResult[0].total = 0;
    }

    if (
      deductrightReferralPointsResult[0].total === null ||
      deductrightReferralPointsResult[0].total === ""
    ) {
      deductrightReferralPointsResult[0].total = 0;
    }

    let leftReferralPoints =
      leftReferralPointsResult[0].total -
      leftDeductReferralPointsResult[0].total +
      addleftReferralPointsResult[0].total -
      deductleftReferralPointsResult[0].total;
    let rightReferralPoints =
      rightReferralPointsResult[0].total -
      rightDeductReferralPointsResult[0].total +
      addrightReferralPointsResult[0].total -
      deductrightReferralPointsResult[0].total;

    let obj = {
      leftReferralPoints: leftReferralPoints,
      rightReferralPoints: rightReferralPoints,
    };

    return obj;
  } catch (error) {
    return null;
  }
}
// end current months Referral Points

async function binary_tree_get_users_data(topUserId, treeUserId) {
  try {
    const selectUserDataQuery = `SELECT COUNT(*) as total FROM usersdata WHERE id = ? and sponsorid = ?`;
    const selectUserDataResult = await Qry(selectUserDataQuery, [
      treeUserId,
      topUserId,
    ]);
    let countResult = selectUserDataResult[0].total;

    // start rank data and user data
    let userRankSponsorData = null;
    let crown = false;

    if (countResult > 0) {
      crown = true;
    }

    const userSelectQuery = `
        SELECT ud.id, ud.username, ud.rank, ud.novarank, ud.firstname, ud.lastname, ud.user_type, ud.sponsorid, ud.email, ud.mobile, ud.randomcode, ud.subscription_status, ud.picture,
        rn.name AS rank_name,
        ltr.name AS life_time_rank_name,
        nrn.name AS nova_rank_name,
        np.nextBillingAt AS renewal_date
        FROM usersdata ud
        LEFT JOIN rank rn ON ud.rank = rn.id
        LEFT JOIN rank ltr ON ud.life_time_rank = ltr.id
        LEFT JOIN novafree_rank nrn ON ud.novarank = nrn.id
        LEFT JOIN new_packages np ON ud.id = np.userid
        WHERE ud.id = ?
    `;
    const userRanksResult = await Qry(userSelectQuery, [treeUserId]);
    userRankSponsorData = userRanksResult[0];
    if (userRanksResult[0]?.sponsorid !== "") {
      const selectSponsorDataQuery = `SELECT username FROM usersdata WHERE id = ?`;
      const selectSponsorDataResult = await Qry(selectSponsorDataQuery, [
        userRanksResult[0]?.sponsorid,
      ]);
      userRankSponsorData.sponsor_name = selectSponsorDataResult[0].username;

      const selectTreeDataQuery = `SELECT pid FROM binarytree WHERE userid = ?`;
      const selectTreeDataResult = await Qry(selectTreeDataQuery, [treeUserId]);

      const selectUserDataRandomCodeQuery = `SELECT randomcode FROM usersdata WHERE id = ?`;
      const selectUserDataRandomCodeResult = await Qry(
        selectUserDataRandomCodeQuery,
        [selectTreeDataResult[0].pid]
      );
      userRankSponsorData.levelUpRandomCode =
        selectUserDataRandomCodeResult[0].randomcode;
    }

    let color;

    if (
      userRankSponsorData?.subscription_status === "Active" ||
      userRankSponsorData?.subscription_status === "subscription_renewed" ||
      userRankSponsorData?.subscription_status === ""
    ) {
      // Convert the timestamp to a Date object
      const timestamp = userRankSponsorData.renewal_date;
      const date = new Date(timestamp * 1000); // JavaScript uses milliseconds, so multiply by 1000

      // Get the year, month, and day from the Date object
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // Months are zero-based, so add 1
      const day = date.getDate();

      // Get the current date
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const currentDay = currentDate.getDate();

      // Compare the day from the timestamp with the current day
      if (currentDay <= day) {
        color = "blue";
      } else {
        color = "green";
      }
    }
    if (
      userRankSponsorData?.subscription_status === "subscription_cancelled" ||
      userRankSponsorData?.subscription_status === "payment_refunded"
    ) {
      color = "red";
    }
    if (userRankSponsorData?.subscription_status === "payment_failed") {
      color = "orange";
    }

    // start rank data and user data

    let data = {
      userRankSponsorData: userRankSponsorData,
      crown: crown,
      color: color,
    };
    return data;
  } catch (error) {
    return null;
  }
}

// start previous months active referrals
async function pre_month_active_referrals_function(userid, month) {
  try {
    const leftPersonalActiveGraphQuery = `Select COUNT(id) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
    const leftPersoanlActiveGraphResult = await Qry(
      leftPersonalActiveGraphQuery,
      ["L", "Referral Binary Points", month]
    );

    const rightPersonalActiveGraphQuery = `Select COUNT(id) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
    const rightPersoanlActiveGraphResult = await Qry(
      rightPersonalActiveGraphQuery,
      ["R", "Referral Binary Points", month]
    );

    const deductleftPersonalActiveGraphQuery = `Select COUNT(id) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
    const deductleftPersoanlActiveGraphResult = await Qry(
      deductleftPersonalActiveGraphQuery,
      ["L", "Deduct Referral Binary Points", month]
    );

    const deductrightPersonalActiveGraphQuery = `Select COUNT(id) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
    const deductrightPersoanlActiveGraphResult = await Qry(
      deductrightPersonalActiveGraphQuery,
      ["R", "Deduct Referral Binary Points", month]
    );

    let personalActiveLeftCount =
      leftPersoanlActiveGraphResult[0].total -
      deductleftPersoanlActiveGraphResult[0].total;
    let personalActiveRightCount =
      rightPersoanlActiveGraphResult[0].total -
      deductrightPersoanlActiveGraphResult[0].total;

    let obj = {
      leftPersonalActiveMembers: personalActiveLeftCount,
      rightPersonalActiveMembers: personalActiveRightCount,
    };

    return obj;
  } catch (error) {
    return null;
  }
}
// end previous months active referrals

// start previous months organization members
async function pre_month_organization_members_function(userid, month) {
  try {
    const leftOrganizationGraphQuery = `Select COUNT(id) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
    const leftOrganizationGraphResult = await Qry(leftOrganizationGraphQuery, [
      "L",
      "Binary Points",
      month,
    ]);

    const rightOrganizationGraphQuery = `Select COUNT(id) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
    const rightOrganizationGraphResult = await Qry(
      rightOrganizationGraphQuery,
      ["R", "Binary Points", month]
    );

    const deductleftOrganizationGraphQuery = `Select COUNT(id) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
    const deductleftOrganizationGraphResult = await Qry(
      deductleftOrganizationGraphQuery,
      ["L", "Deduct Binary Points", month]
    );

    const deductrightOrganizationGraphQuery = `Select COUNT(id) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
    const deductrightOrganizationGraphResult = await Qry(
      deductrightOrganizationGraphQuery,
      ["R", "Deduct Binary Points", month]
    );

    let organizationLeftCount =
      leftOrganizationGraphResult[0].total -
      deductleftOrganizationGraphResult[0].total;
    let organizationRightCount =
      rightOrganizationGraphResult[0].total -
      deductrightOrganizationGraphResult[0].total;

    let obj = {
      leftOrganizationMembers: organizationLeftCount,
      rightOrganizationMembers: organizationRightCount,
    };

    return obj;
  } catch (error) {
    return null;
  }
}
// end previous months organization members

// start previous months organization points
async function pre_month_organization_points_function(userid, month) {
  try {
    const leftOrganizationPointsGraphQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
    const leftOrganizationPointsGraphResult = await Qry(
      leftOrganizationPointsGraphQuery,
      ["L", "Binary Points", month]
    );

    const rightOrganizationPointsGraphQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
    const rightOrganizationPointsGraphResult = await Qry(
      rightOrganizationPointsGraphQuery,
      ["R", "Binary Points", month]
    );

    const deductleftOrganizationPointsGraphQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
    const deductleftOrganizationPointsGraphResult = await Qry(
      deductleftOrganizationPointsGraphQuery,
      ["L", "Deduct Binary Points", month]
    );

    const deductrightOrganizationPointsGraphQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
    const deductrightOrganizationPointsGraphResult = await Qry(
      deductrightOrganizationPointsGraphQuery,
      ["R", "Deduct Binary Points", month]
    );

    const addAdminleftOrganizationPointsGraphQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
    const addAdminleftOrganizationPointsGraphResult = await Qry(
      addAdminleftOrganizationPointsGraphQuery,
      ["L", "Add Binary Points By Admin", month]
    );

    const addAdminRightOrganizationPointsGraphQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
    const addAdminRightOrganizationPointsGraphResult = await Qry(
      addAdminRightOrganizationPointsGraphQuery,
      ["R", "Add Binary Points By Admin", month]
    );

    const deductAdminleftOrganizationPointsGraphQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
    const deductAdminleftOrganizationPointsGraphResult = await Qry(
      deductAdminleftOrganizationPointsGraphQuery,
      ["L", "Deduct Binary Points By Admin", month]
    );

    const deductAdminRightOrganizationPointsGraphQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
    const deductAdminRightOrganizationPointsGraphResult = await Qry(
      deductAdminRightOrganizationPointsGraphQuery,
      ["R", "Deduct Binary Points By Admin", month]
    );

    if (
      leftOrganizationPointsGraphResult[0].total === null ||
      leftOrganizationPointsGraphResult[0].total === ""
    ) {
      leftOrganizationPointsGraphResult[0].total = 0;
    }
    if (
      rightOrganizationPointsGraphResult[0].total === null ||
      rightOrganizationPointsGraphResult[0].total === ""
    ) {
      rightOrganizationPointsGraphResult[0].total = 0;
    }
    if (
      deductleftOrganizationPointsGraphResult[0].total === null ||
      deductleftOrganizationPointsGraphResult[0].total === ""
    ) {
      deductleftOrganizationPointsGraphResult[0].total = 0;
    }
    if (
      deductrightOrganizationPointsGraphResult[0].total === null ||
      deductrightOrganizationPointsGraphResult[0].total === ""
    ) {
      deductrightOrganizationPointsGraphResult[0].total = 0;
    }

    if (
      addAdminleftOrganizationPointsGraphResult[0].total === null ||
      addAdminleftOrganizationPointsGraphResult[0].total === ""
    ) {
      addAdminleftOrganizationPointsGraphResult[0].total = 0;
    }

    if (
      addAdminRightOrganizationPointsGraphResult[0].total === null ||
      addAdminRightOrganizationPointsGraphResult[0].total === ""
    ) {
      addAdminRightOrganizationPointsGraphResult[0].total = 0;
    }

    if (
      deductAdminleftOrganizationPointsGraphResult[0].total === null ||
      deductAdminleftOrganizationPointsGraphResult[0].total === ""
    ) {
      deductAdminleftOrganizationPointsGraphResult[0].total = 0;
    }

    if (
      deductAdminRightOrganizationPointsGraphResult[0].total === null ||
      deductAdminRightOrganizationPointsGraphResult[0].total === ""
    ) {
      deductAdminRightOrganizationPointsGraphResult[0].total = 0;
    }

    let organizationLeftPointsCount =
      leftOrganizationPointsGraphResult[0].total +
      addAdminleftOrganizationPointsGraphResult[0].total -
      (deductleftOrganizationPointsGraphResult[0].total +
        deductAdminleftOrganizationPointsGraphResult[0].total);
    let organizationRightPointsCount =
      rightOrganizationPointsGraphResult[0].total +
      addAdminRightOrganizationPointsGraphResult[0].total -
      (deductrightOrganizationPointsGraphResult[0].total +
        deductAdminRightOrganizationPointsGraphResult[0].total);

    let obj = {
      leftOrganizationPoints: organizationLeftPointsCount,
      rightOrganizationPoints: organizationRightPointsCount,
    };

    return obj;
  } catch (error) {
    return null;
  }
}
// end previous months organization points

// start previous months Referral Points
async function pre_month_referral_points_function(userid, month) {
  try {
    const leftReferralPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
    const leftReferralPointsResult = await Qry(leftReferralPointsQuery, [
      "L",
      "Referral Binary Points",
      month,
    ]);

    const leftDeductReferralPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
    const leftDeductReferralPointsResult = await Qry(
      leftDeductReferralPointsQuery,
      ["L", "Deduct Referral Binary Points", month]
    );

    const rightReferralPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
    const rightReferralPointsResult = await Qry(rightReferralPointsQuery, [
      "R",
      "Referral Binary Points",
      month,
    ]);

    const rightDeductReferralPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
    const rightDeductReferralPointsResult = await Qry(
      rightDeductReferralPointsQuery,
      ["R", "Deduct Referral Binary Points", month]
    );

    const addleftReferralPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
    const addleftReferralPointsResult = await Qry(addleftReferralPointsQuery, [
      "L",
      "Add Referral Binary Points By Admin",
      month,
    ]);

    const addrightReferralPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
    const addrightReferralPointsResult = await Qry(
      addrightReferralPointsQuery,
      ["R", "Add Referral Binary Points By Admin", month]
    );

    const deductleftReferralPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
    const deductleftReferralPointsResult = await Qry(
      deductleftReferralPointsQuery,
      ["L", "Deduct Referral Binary Points By Admin", month]
    );

    const deductrightReferralPointsQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${userid}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
    const deductrightReferralPointsResult = await Qry(
      deductrightReferralPointsQuery,
      ["R", "Deduct Referral Binary Points By Admin", month]
    );

    if (
      addleftReferralPointsResult[0].total === null ||
      addleftReferralPointsResult[0].total === ""
    ) {
      addleftReferralPointsResult[0].total = 0;
    }

    if (
      addrightReferralPointsResult[0].total === null ||
      addrightReferralPointsResult[0].total === ""
    ) {
      addrightReferralPointsResult[0].total = 0;
    }

    if (
      deductleftReferralPointsResult[0].total === null ||
      deductleftReferralPointsResult[0].total === ""
    ) {
      deductleftReferralPointsResult[0].total = 0;
    }

    if (
      deductrightReferralPointsResult[0].total === null ||
      deductrightReferralPointsResult[0].total === ""
    ) {
      deductrightReferralPointsResult[0].total = 0;
    }

    if (
      leftReferralPointsResult[0].total === null ||
      leftReferralPointsResult[0].total === ""
    ) {
      leftReferralPointsResult[0].total = 0;
    }
    if (
      leftDeductReferralPointsResult[0].total === null ||
      leftDeductReferralPointsResult[0].total === ""
    ) {
      leftDeductReferralPointsResult[0].total = 0;
    }
    if (
      rightReferralPointsResult[0].total === null ||
      rightReferralPointsResult[0].total === ""
    ) {
      rightReferralPointsResult[0].total = 0;
    }
    if (
      rightDeductReferralPointsResult[0].total === null ||
      rightDeductReferralPointsResult[0].total === ""
    ) {
      rightDeductReferralPointsResult[0].total = 0;
    }

    let leftReferralPoints =
      leftReferralPointsResult[0].total -
      leftDeductReferralPointsResult[0].total +
      addleftReferralPointsResult[0].total -
      deductleftReferralPointsResult[0].total;
    let rightReferralPoints =
      rightReferralPointsResult[0].total -
      rightDeductReferralPointsResult[0].total +
      addrightReferralPointsResult[0].total -
      deductrightReferralPointsResult[0].total;

    let obj = {
      leftReferralPoints: leftReferralPoints,
      rightReferralPoints: rightReferralPoints,
    };

    return obj;
  } catch (error) {
    return null;
  }
}
// end previous months Referral Points

function currentMonthFun() {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // Adding 1 to get month number (1-12)
  return currentMonth;
}

function getLastDateOfMonth(year, month) {
  let lastDay = new Date(year, month, 0).getDate(); // Get the last day of the month
  let formattedMonth = month.toString().padStart(2, '0'); // Ensure two-digit month
  return `${year}-${formattedMonth}-${lastDay}`;
}

// start total payment
async function total_payment_function(userid, month,year) {
  let currentDate = new Date();
  let currentYear = currentDate.getFullYear()
  year = year || currentYear
  try {
    let currentMonth = currentMonthFun();
    const countQuer1 = await Qry(
      `SELECT COUNT(*) as userCount FROM transactions WHERE event_type = ? AND type = ? AND receiverid = ? AND ((MONTH(createdat) = ? AND YEAR(createdat) = ${year}) OR (MONTH(createdat) = 1 AND DAY(createdat) >= 28 AND YEAR(createdat) = ${year}))`,
      ["subscription_created", "Level 1 Bonus", userid, month]
    );

    const countQuer2 = await Qry(
      "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and event_type != ? and MONTH(createdat) = ? and YEAR(createdat) = ?",
      [userid, "Level 1 Bonus", "subscription_changed", month,year]
    );

    let countQuer3;

    // start condition is for monthly commission cronjob
    if (currentMonth === month) {
      countQuer3 = await Qry(
       `SELECT COUNT(*) as userCount FROM usersdata WHERE sponsorid = ${userid} AND sub_type = 'year' AND DATEDIFF(NOW(), createdat) <= 365 AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') and MONTH(createdat) != ${month}`
      );
    } else {
      countQuer3 = await Qry(
        // "SELECT COUNT(*) as userCount FROM usersdata WHERE sponsorid = ? AND sub_type = 'year' AND DAY(NOW()) >= DAY(createdat) AND DATEDIFF(NOW(), createdat) <= 365 AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') and MONTH(createdat) != ?",
      `SELECT COUNT(*) as userCount FROM usersdata WHERE sponsorid = ${userid} AND sub_type = 'year' AND DATEDIFF(NOW(), createdat) <= 365 AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') and MONTH(createdat) != ${month}`
      );
    }
    // end condition is for monthly commission cronjob

    const countQuer4 = await Qry(
      "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = ? and YEAR(createdat) = ?",
      [userid, "Level 1 Bonus Deducted", month,year]
    );

    const countQuer5 =  await Qry(
      "SELECT COUNT(*) as userCount FROM usersdata WHERE sponsorid = ? AND sub_type = 'month' AND plan_period = 3 AND DATEDIFF(NOW(), createdat) <= 90 AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') AND  MONTH(createdat) != ?",
      [userid,month]
    );

   
    // let totalUser = usersCount[0].userCount;
    let totalUser;

    if (month === 2) {
      totalUser =
        countQuer1[0].userCount +
        countQuer2[0].userCount +
        countQuer3[0].userCount -
        countQuer4[0].userCount
         + countQuer5[0].userCount
    } else {
      totalUser =
        countQuer2[0].userCount +
        countQuer3[0].userCount -
        countQuer4[0].userCount 
        + countQuer5[0].userCount
    }

    

    console.log( countQuer2[0].userCount,countQuer3[0].userCount,countQuer5[0].userCount,totalUser,"<==================2060===================>")
    

    let unilevelData
    unilevelData = await Qry(
      "SELECT * FROM unilevels WHERE `number_of_users` <= ? ORDER BY `id` DESC LIMIT 1",
      [totalUser]
    );

    if (unilevelData.length === 0) {
      unilevelData = await Qry("SELECT * FROM unilevels WHERE id = ?", [0]);
    }

    const selectUsersPkgData = `SELECT * FROM new_packages WHERE userid = ? and type = ?`;
    let resultUserPkgData = await Qry(selectUsersPkgData, [userid, "package"]);

    let currentUserPlanId = resultUserPkgData[0].planid;

    let totalPaymentEUR = 0;
    let totalPaymentUSD = 0;

    let level1USD = 0;
    let level2USD = 0;

    let level1EUR = 0;
    let level2EUR = 0;

    let dataArry = [];
    let detail = "";

    // start level 1 and 2
    let selectTraLevelTpay;

    // if (month === 2) {
    //   selectTraLevelTpay = `SELECT * FROM transactions WHERE receiverid = ? AND (type = ? or type = ? or type = ?) and ((MONTH(createdat) = ? and YEAR(createdat) = ${year}) or (MONTH(createdat) = 1 AND DAY(createdat) >= 28 AND YEAR(createdat) = ${year}))`;
    // } else {
      selectTraLevelTpay = `SELECT * FROM transactions WHERE receiverid = ? AND (type = ? or type = ? or type = ?) and MONTH(createdat) = ? and YEAR(createdat) = ${year}`;
    // }
    let resultTraLevelTPay = await Qry(selectTraLevelTpay, [
      userid,
      "Level 1 Bonus",
      "Level 2 Bonus",
      "Bonus Add By Admin",
      month,
    ]);

    let x = 1;

    console.log(resultTraLevelTPay,"<==================2115===================>")

    for (const data of resultTraLevelTPay) {
      let senderid = data.senderid;
      let reason = data.reason ? data.reason : "";

      if(data.type === "Bonus Add By Admin") {
        let obj = {
          id: x,
          amount: data.amount.toFixed(2),
          username: "",
          firstname: "",
          lastname: "",
          type: data.type,
          details: data.details,
          createdat: data.createdat,
          currency: data.currency,
          payOutPer: "",
          "reason": reason,
        };
        // if (bonus !== 0) {
          dataArry.push(obj);
        // }
      } else {
        const selectUsersPkgData1122 = `SELECT * FROM new_packages WHERE userid = ? and type = ?`;
        let resultUserPkgData1122 = await Qry(selectUsersPkgData1122, [
          senderid,
          "package",
        ]);

        let senderPlanId = resultUserPkgData1122[0]?.planid;

        const selectSender1 = `SELECT * FROM usersdata WHERE id = ?`;
        let resultSender1 = await Qry(selectSender1, [senderid]);
        let levelBonus = 0;
        let amount = data.paid_amount;
        let currency = data.currency;
        let payOutPer = 0;

        let senderCreatedat = resultSender1[0]?.createdat;
        const dateString = senderCreatedat;
        const date = new Date(dateString);
        // Extract month (0-indexed, so January is 0)
        const monthh = date.getMonth() + 1; // Adding 1 to get 1-indexed month
        // Extract day
        const day = date.getDate();

        if (data.type === "Level 1 Bonus") {
          levelBonus = unilevelData[0].level1;

          if (
            currentUserPlanId ===
              "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-USD-Monthly" ||
            currentUserPlanId ===
              "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-EUR-Monthly" ||
            currentUserPlanId ===
              "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-USD-Monthly" ||
            currentUserPlanId ===
              "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-EUR-Monthly"
          ) {
            if (month === 4 && monthh === 4 && day >= 14 && day <= 21) {
              levelBonus = 50;
            }
          }

          if (month === 4 && monthh === 4 && day >= 22 && day <= 28) {
            levelBonus = 50;
          }

          if (month === 2 && data.event_type === "subscription_created") {
            levelBonus = 50;
          }
        }

        if (data.type === "Level 2 Bonus") {
          levelBonus = unilevelData[0].level2;
        }

        payOutPer = levelBonus;

        let bonus = (amount / 100) * levelBonus;

        if (
          (senderPlanId === "Challenge-Affiliate-PRO-FR-2x147-USD-Monthly" ||
            senderPlanId === "Challenge-Affiliate-PRO-FR-2x147-EUR-Monthly") &&
          (monthh === 4 || (monthh === 5 && day <= 10))
        ) {
          if (data.type === "Level 1 Bonus") {
            bonus = 50;
            payOutPer = 0;
          }
          if (data.type === "Level 2 Bonus") {
            bonus = 0;
            payOutPer = 0;
          }
        }

        // start for unilevel report

        if (data.type === "Level 1 Bonus" || data.type === "Level 2 Bonus") {
          detail = `You have received ${
            bonus.toFixed(2) + " " + currency
          } amount as ${data.type}.`;
        }

        if (data.details === "Formation-Sonny-Novalya-Transformer-vos-leads-en-RDV-qualifies-EUR") {
          bonus= data.paid_amount ? data.paid_amount * 0.4: 40

          detail = data.details;
        }

        let obj = {
          id: x,
          amount: bonus.toFixed(2),
          username: resultSender1[0]?.username,
          firstname: resultSender1[0]?.firstname,
          lastname: resultSender1[0]?.lastname,
          type: data.type,
          details: detail,
          createdat: data.createdat,
          currency: currency,
          payOutPer: payOutPer,
          "reason": reason,
        };
        if (bonus !== 0) {
          dataArry.push(obj);
        }

        // start for unilevel report

        if (currency === "EUR") {
          totalPaymentEUR = totalPaymentEUR + bonus;

          // for total earning (following section)
          if (data.type === "Level 1 Bonus") {
            level1EUR = level1EUR + bonus;
          }
          if (data.type === "Level 2 Bonus") {
            level2EUR = level2EUR + bonus;
          }
          // for total earning (following section)
        }

        if (currency === "USD") {
          totalPaymentUSD = totalPaymentUSD + bonus;

          // for total earning (following section)
          if (data.type === "Level 1 Bonus") {
            level1USD = level1USD + bonus;
          }
          if (data.type === "Level 2 Bonus") {
            level2USD = level2USD + bonus;
          }
          // for total earning (following section)
        }
      }

      x = x + 1;
    }

    // end level 1 and 2

    // start deduct level 1 and 2
    const selectTraLevelDedTPay = `SELECT * FROM transactions WHERE receiverid = ? AND (type = ? or type = ? or type = ?) and MONTH(createdat) = ? and YEAR(createdat) = ${year}`;
    let resultTraLevelDedTPAY = await Qry(selectTraLevelDedTPay, [
      userid,
      "Level 1 Bonus Deducted",
      "Level 2 Bonus Deducted",
      "Bonus Deduct By Admin",
      month,
    ]);

    for (const data of resultTraLevelDedTPAY) {
      let senderid = data.senderid;
      let reason = data.reason ? data.reason : "";

      if(data.type === "Bonus Deduct By Admin") {
        let obj = {
          id: x,
          amount: data.amount.toFixed(2),
          username: "",
          firstname: "",
          lastname: "",
          type: data.type,
          details: data.details,
          createdat: data.createdat,
          currency: data.currency,
          payOutPer: "",
          "reason": reason,
        };
        // if (bonus !== 0) {
          dataArry.push(obj);
        // }
      } else {
        const selectUsersPkgData1122 = `SELECT * FROM new_packages WHERE userid = ? and type = ?`;
        let resultUserPkgData1122 = await Qry(selectUsersPkgData1122, [
          senderid,
          "package",
        ]);

        let senderPlanId = resultUserPkgData1122[0]?.planid;

        const selectSender1 = `SELECT * FROM usersdata WHERE id = ?`;
        let resultSender1 = await Qry(selectSender1, [senderid]);
        let levelBonus = 0;
        let amount = data.paid_amount;
        let currency = data.currency;
        let payOutPer = 0;

        let senderCreatedat = resultSender1[0]?.createdat;
        const dateString = senderCreatedat;
        const date = new Date(dateString);
        // Extract month (0-indexed, so January is 0)
        const monthh = date.getMonth() + 1; // Adding 1 to get 1-indexed month
        // Extract day
        const day = date.getDate();

        if (data.type === "Level 1 Bonus Deducted") {
          levelBonus = unilevelData[0].level1;

          if (
            currentUserPlanId ===
              "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-USD-Monthly" ||
            currentUserPlanId ===
              "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-EUR-Monthly" ||
            currentUserPlanId ===
              "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-USD-Monthly" ||
            currentUserPlanId ===
              "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-EUR-Monthly"
          ) {
            if (monthh === 4 && day >= 14 && day <= 21) {
              levelBonus = 50;
            }
          }

          if (monthh === 4 && day >= 22 && day <= 28) {
            levelBonus = 50;
          }

          // if (month === 2) {
          //   levelBonus = 50;
          // }
        }

        if (data.type === "Level 2 Bonus Deducted") {
          levelBonus = unilevelData[0].level2;
        }

        payOutPer = levelBonus;

        let bonus = (amount / 100) * levelBonus;

        if (
          (senderPlanId === "Challenge-Affiliate-PRO-FR-2x147-USD-Monthly" ||
            senderPlanId === "Challenge-Affiliate-PRO-FR-2x147-EUR-Monthly") &&
          (monthh === 4 || (monthh === 5 && day <= 10))
        ) {
          if (data.type === "Level 1 Bonus Deducted") {
            bonus = 50;
            payOutPer = 0;
          }
          if (data.type === "Level 2 Bonus Deducted") {
            bonus = 0;
            payOutPer = 0;
          }
        }

        // start for unilevel report

        if (
          data.type === "Level 1 Bonus Deducted" ||
          data.type === "Level 2 Bonus Deducted"
        ) {
          detail = `${
            bonus.toFixed(2) + " " + currency
          } has been deducted successfully as ${data.type}.`;
        }

        let obj = {
          id: x,
          amount: bonus.toFixed(2),
          username: resultSender1[0]?.username,
          firstname: resultSender1[0]?.firstname,
          lastname: resultSender1[0]?.lastname,
          type: data.type,
          details: detail,
          createdat: data.createdat,
          currency: currency,
          payOutPer: payOutPer,
          "reason": reason,
        };
        if (bonus !== 0) {
          dataArry.push(obj);
        }

        // end for unilevel report

        if (currency === "EUR") {
          totalPaymentEUR = totalPaymentEUR - bonus;

          // for total earning (following section)
          if (data.type === "Level 1 Bonus Deducted") {
            level1EUR = level1EUR - bonus;
          }
          if (data.type === "Level 2 Bonus Deducted") {
            level2EUR = level2EUR - bonus;
          }
          // for total earning (following section)
        }

        if (currency === "USD") {
          totalPaymentUSD = totalPaymentUSD - bonus;

          // for total earning (following section)
          if (data.type === "Level 1 Bonus Deducted") {
            level1USD = level1USD - bonus;
          }
          if (data.type === "Level 2 Bonus Deducted") {
            level2USD = level2USD - bonus;
          }
          // for total earning (following section)
        }
      }
      x = x + 1;
    }
    // end deduct level 1 and 2

    const selectPoolBonusUSD = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND (type = ? or type = ? or type = ?) AND status = ? AND MONTH(createdat) = ? AND YEAR(createdat) = ${year}`;
    let resultPoolBonusUSD = await Qry(selectPoolBonusUSD, [
      userid,
      "Pool 1 Bonus",
      "Pool 2 Bonus",
      "Pool 3 Bonus",
      "Pending",
      month,
    ]);

    if (resultPoolBonusUSD[0].totalAmount === null) {
      resultPoolBonusUSD[0].totalAmount = 0;
    }

    let bonusUSD = resultPoolBonusUSD[0].totalAmount;

    // start condition is for monthly commission cronjob
    if (currentMonth === month) {
      totalPaymentUSD = totalPaymentUSD + bonusUSD;
    }
    // end condition is for monthly commission cronjob

    const selectBalanceAddAdminUSD = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND type = ? AND currency = ? AND MONTH(createdat) = ? AND YEAR(createdat) = ${year}`;
    let resultBalanceAddAdminUSD = await Qry(selectBalanceAddAdminUSD, [
      userid,
      "Bonus Add By Admin",
      "USD",
      month,
    ]);

    if (resultBalanceAddAdminUSD[0].totalAmount === null) {
      resultBalanceAddAdminUSD[0].totalAmount = 0;
    }

    const selectBalanceDeductAdminUSD = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND type = ? AND currency = ? AND MONTH(createdat) = ? AND YEAR(createdat) = ${year}`;
    let resultBalanceDeductAdminUSD = await Qry(selectBalanceDeductAdminUSD, [
      userid,
      "Bonus Deduct By Admin",
      "USD",
      month,
    ]);

    if (resultBalanceDeductAdminUSD[0].totalAmount === null) {
      resultBalanceDeductAdminUSD[0].totalAmount = 0;
    }

    const selectBalanceAddAdminEUR = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND type = ? AND currency = ? AND MONTH(createdat) = ? AND YEAR(createdat) = ${year}`;
    let resultBalanceAddAdminEUR = await Qry(selectBalanceAddAdminEUR, [
      userid,
      "Bonus Add By Admin",
      "EUR",
      month,
    ]);

    if (resultBalanceAddAdminEUR[0].totalAmount === null) {
      resultBalanceAddAdminEUR[0].totalAmount = 0;
    }

    const selectBalanceDeductAdminEUR = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND type = ? AND currency = ? AND MONTH(createdat) = ? AND YEAR(createdat) =${year}`;
    let resultBalanceDeductAdminEUR = await Qry(selectBalanceDeductAdminEUR, [
      userid,
      "Bonus Deduct By Admin",
      "EUR",
      month,
    ]);

    if (resultBalanceDeductAdminEUR[0].totalAmount === null) {
      resultBalanceDeductAdminEUR[0].totalAmount = 0;
    }

    let usdOthers =
      resultBalanceAddAdminUSD[0].totalAmount -
      resultBalanceDeductAdminUSD[0].totalAmount;
    let eurOthers =
      resultBalanceAddAdminEUR[0].totalAmount -
      resultBalanceDeductAdminEUR[0].totalAmount;

      console.log(totalPaymentEUR,totalPaymentUSD,totalPaymentUSD+totalPaymentEUR) , "=====>2485<======="

    totalPaymentEUR = totalPaymentEUR + eurOthers;
    totalPaymentUSD = totalPaymentUSD + usdOthers;
    console.log(totalPaymentEUR,totalPaymentUSD,totalPaymentUSD+totalPaymentEUR) , "=====>2485<======="

    let obj = {
      totalPaymentEUR: totalPaymentEUR,
      totalPaymentUSD: totalPaymentUSD,
      level1USD: level1USD,
      level2USD: level2USD,
      level1EUR: level1EUR,
      level2EUR: level2EUR,
      bonusUSD: bonusUSD,
      usdOthers: usdOthers,
      eurOthers: eurOthers,
      dataArray: dataArry,
      totalUser: totalUser,
    };

    return obj;
  } catch (error) {
    console.log("error", error)
    return null;
  }
}

// total payment function affilate payment
// async function total_payment_function_afcm_tbl(userid, month,year) {
//   try {
//     let currentMonth = currentMonthFun();
//     let cmonth = month || currentMonth;
//     let cyear = year || new Date().getFullYear();
//     let cdate = getLastDateOfMonth(cyear, cmonth);

//     const countQuer1 = await Qry(
//       "SELECT COUNT(*) AS userCount FROM usersdata WHERE sponsorid = ? AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') AND createdat <= ? AND trial_status = ?",
//       [userid, cdate, "inactive"]
//     );

//     let totalUser = countQuer1[0].userCount;
//     let unilevelData = await Qry(
//       "SELECT * FROM unilevels WHERE `number_of_users` <= ? ORDER BY `id` DESC LIMIT 1",
//       [totalUser]
//     );

//     const selectUsersPkgData = `SELECT * FROM new_packages WHERE userid = ? and type = ?`;
//     let resultUserPkgData = await Qry(selectUsersPkgData, [userid, "package"]);
//     let currentUserPlanId = resultUserPkgData[0].planid;
//     let dataArry = [];
//     let detail = "";

//     let selectTraLevelTpay = `SELECT * FROM transactions WHERE receiverid = ? AND (type = ? or type = ? or type = ?) and MONTH(createdat) = ? and YEAR(createdat) = ${year}`;
//     let resultTraLevelTPay = await Qry(selectTraLevelTpay, [
//       userid,
//       "Level 1 Bonus",
//       "Level 2 Bonus",
//       "Bonus Add By Admin",
//       month,
//     ]);

//     let x = 1;
//     for (const data of resultTraLevelTPay) {
//       let senderid = data.senderid;
//       let reason = data.reason ? data.reason : "";

//       if(data.type === "Bonus Add By Admin") {
//         let obj = {
//           id: x,
//           amount: data.amount.toFixed(2),
//           username: "",
//           firstname: "",
//           lastname: "",
//           type: data.type,
//           details: data.details,
//           createdat: data.createdat,
//           currency: data.currency,
//           payOutPer: "",
//           "reason": reason,
//         };
//         dataArry.push(obj);

//       } else {

//         const selectUsersPkgData1122 = `SELECT * FROM new_packages WHERE userid = ? and type = ?`;
//         let resultUserPkgData1122 = await Qry(selectUsersPkgData1122, [
//           senderid,
//           "package",
//         ]);

//         let senderPlanId = resultUserPkgData1122[0]?.planid;

//         const selectSender1 = `SELECT * FROM usersdata WHERE id = ?`;
//         let resultSender1 = await Qry(selectSender1, [senderid]);
//         let levelBonus = 0;
//         let amount = data.paid_amount;
//         let currency = data.currency;
//         let payOutPer = 0;

//         let senderCreatedat = resultSender1[0]?.createdat;
//         const dateString = senderCreatedat;
//         const date = new Date(dateString);
//         const monthh = date.getMonth() + 1;
//         const day = date.getDate();
//         if (data.type === "Level 1 Bonus") {
//           levelBonus = unilevelData[0].level1;

//           if (
//             currentUserPlanId ===
//               "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-USD-Monthly" ||
//             currentUserPlanId ===
//               "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-EUR-Monthly" ||
//             currentUserPlanId ===
//               "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-USD-Monthly" ||
//             currentUserPlanId ===
//               "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-EUR-Monthly"
//           ) {
//             if (month === 4 && monthh === 4 && day >= 14 && day <= 21) {
//               levelBonus = 50;
//             }
//           }

//           if (month === 4 && monthh === 4 && day >= 22 && day <= 28) {
//             levelBonus = 50;
//           }

//           if (month === 2 && data.event_type === "subscription_created") {
//             levelBonus = 50;
//           }
//         }

//         if (data.type === "Level 2 Bonus") {
//           levelBonus = unilevelData[0].level2;
//         }

//         payOutPer = levelBonus;

//         let bonus = (amount / 100) * levelBonus;

//         if (
//           (senderPlanId === "Challenge-Affiliate-PRO-FR-2x147-USD-Monthly" ||
//             senderPlanId === "Challenge-Affiliate-PRO-FR-2x147-EUR-Monthly") &&
//           (monthh === 4 || (monthh === 5 && day <= 10))
//         ) {
//           if (data.type === "Level 1 Bonus") {
//             bonus = 50;
//             payOutPer = 0;
//           }
//           if (data.type === "Level 2 Bonus") {
//             bonus = 0;
//             payOutPer = 0;
//           }
//         }

//         // start for unilevel report
//         if (data.type === "Level 1 Bonus" || data.type === "Level 2 Bonus") {
//           detail = `You have received ${
//             bonus.toFixed(2) + " " + currency
//           } amount as ${data.type}.`;
//         }

//         if (data.details === "Formation-Sonny-Novalya-Transformer-vos-leads-en-RDV-qualifies-EUR") {
//           bonus= data.paid_amount ? data.paid_amount * 0.4: 40

//           detail = data.details;
//         }

//         let obj = {
//           id: x,
//           amount: bonus.toFixed(2),
//           username: resultSender1[0]?.username,
//           firstname: resultSender1[0]?.firstname,
//           lastname: resultSender1[0]?.lastname,
//           type: data.type,
//           details: detail,
//           createdat: data.createdat,
//           currency: currency,
//           payOutPer: payOutPer,
//           "reason": reason,
//         };
//         if (bonus !== 0) {
//           dataArry.push(obj);
//         }
//       }
//       x = x + 1;
//     }

//     // end level 1 and 2

//     // start deduct level 1 and 2
//     const selectTraLevelDedTPay = `SELECT * FROM transactions WHERE receiverid = ? AND (type = ? or type = ? or type = ?) and MONTH(createdat) = ? and YEAR(createdat) = ${year}`;
//     let resultTraLevelDedTPAY = await Qry(selectTraLevelDedTPay, [
//       userid,
//       "Level 1 Bonus Deducted",
//       "Level 2 Bonus Deducted",
//       "Bonus Deduct By Admin",
//       month,
//     ]);

//     for (const data of resultTraLevelDedTPAY) {
//       let senderid = data.senderid;
//       let reason = data.reason ? data.reason : "";

//       if(data.type === "Bonus Deduct By Admin") {
//         let obj = {
//           id: x,
//           amount: data.amount.toFixed(2),
//           username: "",
//           firstname: "",
//           lastname: "",
//           type: data.type,
//           details: data.details,
//           createdat: data.createdat,
//           currency: data.currency,
//           payOutPer: "",
//           "reason": reason,
//         };
//         dataArry.push(obj);
//       } else {
//         const selectUsersPkgData1122 = `SELECT * FROM new_packages WHERE userid = ? and type = ?`;
//         let resultUserPkgData1122 = await Qry(selectUsersPkgData1122, [
//           senderid,
//           "package",
//         ]);

//         let senderPlanId = resultUserPkgData1122[0]?.planid;

//         const selectSender1 = `SELECT * FROM usersdata WHERE id = ?`;
//         let resultSender1 = await Qry(selectSender1, [senderid]);
//         let levelBonus = 0;
//         let amount = data.paid_amount;
//         let currency = data.currency;
//         let payOutPer = 0;

//         let senderCreatedat = resultSender1[0]?.createdat;
//         const dateString = senderCreatedat;
//         const date = new Date(dateString);
//         const monthh = date.getMonth() + 1;
//         // Extract day
//         const day = date.getDate();

//         if (data.type === "Level 1 Bonus Deducted") {
//           levelBonus = unilevelData[0].level1;

//           if (
//             currentUserPlanId ===
//               "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-USD-Monthly" ||
//             currentUserPlanId ===
//               "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-EUR-Monthly" ||
//             currentUserPlanId ===
//               "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-USD-Monthly" ||
//             currentUserPlanId ===
//               "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-EUR-Monthly"
//           ) {
//             if (monthh === 4 && day >= 14 && day <= 21) {
//               levelBonus = 50;
//             }
//           }

//           if (monthh === 4 && day >= 22 && day <= 28) {
//             levelBonus = 50;
//           }

//           // if (month === 2) {
//           //   levelBonus = 50;
//           // }
//         }

//         if (data.type === "Level 2 Bonus Deducted") {
//           levelBonus = unilevelData[0].level2;
//         }

//         payOutPer = levelBonus;

//         let bonus = (amount / 100) * levelBonus;

//         if (
//           (senderPlanId === "Challenge-Affiliate-PRO-FR-2x147-USD-Monthly" ||
//             senderPlanId === "Challenge-Affiliate-PRO-FR-2x147-EUR-Monthly") &&
//           (monthh === 4 || (monthh === 5 && day <= 10))
//         ) {
//           if (data.type === "Level 1 Bonus Deducted") {
//             bonus = 50;
//             payOutPer = 0;
//           }
//           if (data.type === "Level 2 Bonus Deducted") {
//             bonus = 0;
//             payOutPer = 0;
//           }
//         }

//         // start for unilevel report

//         if (
//           data.type === "Level 1 Bonus Deducted" ||
//           data.type === "Level 2 Bonus Deducted"
//         ) {
//           detail = `${
//             bonus.toFixed(2) + " " + currency
//           } has been deducted successfully as ${data.type}.`;
//         }

//         let obj = {
//           id: x,
//           amount: bonus.toFixed(2),
//           username: resultSender1[0]?.username,
//           firstname: resultSender1[0]?.firstname,
//           lastname: resultSender1[0]?.lastname,
//           type: data.type,
//           details: detail,
//           createdat: data.createdat,
//           currency: currency,
//           payOutPer: payOutPer,
//           "reason": reason,
//         };
//         if (bonus !== 0) {
//           dataArry.push(obj);
//         }
//       }
//       x = x + 1;
//     }
//     // end deduct level 1 and 2
//     return dataArry;
//   } catch (error) {
//     console.log("error", error)
//     return null;
//   }
// }

// total payment function affilate payment
async function total_payment_function_afcm_tbl(userid, month, year) {
  try {
    function getLevel1Rate({ month, year, unilevelRate }) {
      return Number(year) > 2025 || (Number(year) === 2025 && Number(month) >= 5)
        ? 40
        : unilevelRate;
    }

    const isBeforeMay2025 = Number(year) < 2025 || (Number(year) === 2025 && Number(month) < 5);

    let currentMonth = currentMonthFun();
    let cmonth = month || currentMonth;
    let cyear = year || new Date().getFullYear();
    let cdate = getLastDateOfMonth(cyear, cmonth);

    const countQuer1 = await Qry(
      "SELECT COUNT(*) AS userCount FROM usersdata WHERE sponsorid = ? AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') AND createdat <= ? AND trial_status = ?",
      [userid, cdate, "inactive"]
    );

    let totalUser = countQuer1[0].userCount;
    let unilevelData = await Qry(
      "SELECT * FROM unilevels WHERE `number_of_users` <= ? ORDER BY `id` DESC LIMIT 1",
      [totalUser]
    );

    const selectUsersPkgData = `SELECT * FROM new_packages WHERE userid = ? and type = ?`;
    let resultUserPkgData = await Qry(selectUsersPkgData, [userid, "package"]);
    let currentUserPlanId = resultUserPkgData[0].planid;
    let dataArry = [];
    let detail = "";

    let levelTypes = isBeforeMay2025
      ? ["Level 1 Bonus", "Level 2 Bonus", "Bonus Add By Admin"]
      : ["Level 1 Bonus", "Bonus Add By Admin"];

    const placeholders = levelTypes.map(() => "?").join(", ");

    const selectTraLevelTpay = `
      SELECT * FROM transactions 
      WHERE receiverid = ? 
      AND type IN (${placeholders}) 
      AND MONTH(createdat) = ? 
      AND YEAR(createdat) = ${year}`;

    let resultTraLevelTPay = await Qry(selectTraLevelTpay, [
      userid,
      ...levelTypes,
      month,
    ]);

    let x = 1;
    for (const data of resultTraLevelTPay) {
      let senderid = data.senderid;
      let reason = data.reason || "";

      if (data.type === "Bonus Add By Admin") {
        dataArry.push({
          id: x++,
          amount: data.amount.toFixed(2),
          username: "",
          firstname: "",
          lastname: "",
          type: data.type,
          details: data.details,
          createdat: data.createdat,
          currency: data.currency,
          payOutPer: "",
          reason,
        });
      } else {
        const resultUserPkgData1122 = await Qry(
          `SELECT * FROM new_packages WHERE userid = ? and type = ?`,
          [senderid, "package"]
        );

        let senderPlanId = resultUserPkgData1122[0]?.planid;
        const resultSender1 = await Qry(`SELECT * FROM usersdata WHERE id = ?`, [senderid]);

        let senderCreatedat = resultSender1[0]?.createdat;
        const date = new Date(senderCreatedat);
        const monthh = date.getMonth() + 1;
        const day = date.getDate();

        let levelBonus = getLevel1Rate({ month, year, unilevelRate: unilevelData[0].level1 });
        let payOutPer = levelBonus;
        let amount = data.paid_amount;
        let bonus = (amount / 100) * levelBonus;
        let currency = data.currency;

        if (levelBonus !== 40) {
          if (
            currentUserPlanId ===
              "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-USD-Monthly" ||
            currentUserPlanId ===
              "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-EUR-Monthly" ||
            currentUserPlanId ===
              "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-USD-Monthly" ||
            currentUserPlanId ===
              "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-EUR-Monthly"
          ) {
            if (month === 4 && monthh === 4 && day >= 14 && day <= 21) {
              levelBonus = 50;
              payOutPer = 50;
              bonus = (amount / 100) * 50;
            }
          }

          if (month === 4 && monthh === 4 && day >= 22 && day <= 28) {
            levelBonus = 50;
            payOutPer = 50;
            bonus = (amount / 100) * 50;
          }

          if (month === 2 && data.event_type === "subscription_created") {
            levelBonus = 50;
            payOutPer = 50;
            bonus = (amount / 100) * 50;
          }
        }

        if (
          (senderPlanId === "Challenge-Affiliate-PRO-FR-2x147-USD-Monthly" ||
            senderPlanId === "Challenge-Affiliate-PRO-FR-2x147-EUR-Monthly") &&
          (monthh === 4 || (monthh === 5 && day <= 10))
        ) {
          bonus = 50;
          payOutPer = 0;
        }

        if (
          data.details ===
          "Formation-Sonny-Novalya-Transformer-vos-leads-en-RDV-qualifies-EUR"
        ) {
          bonus = data.paid_amount ? data.paid_amount * 0.4 : 40;
          detail = data.details;
        } else {
          detail = `You have received ${bonus.toFixed(2)} ${currency} amount as ${data.type}.`;
        }

        if (bonus !== 0) {
          dataArry.push({
            id: x++,
            amount: bonus.toFixed(2),
            username: resultSender1[0]?.username,
            firstname: resultSender1[0]?.firstname,
            lastname: resultSender1[0]?.lastname,
            type: data.type,
            details: detail,
            createdat: data.createdat,
            currency: currency,
            payOutPer: payOutPer,
            reason,
          });
        }
      }
    }

    let levelDeductTypes = isBeforeMay2025
      ? ["Level 1 Bonus Deducted", "Level 2 Bonus Deducted", "Bonus Deduct By Admin"]
      : ["Level 1 Bonus Deducted", "Bonus Deduct By Admin"];

    const deductPlaceholders = levelDeductTypes.map(() => "?").join(", ");

    const selectTraLevelDedTPay = `
      SELECT * FROM transactions 
      WHERE receiverid = ? 
      AND type IN (${deductPlaceholders}) 
      AND MONTH(createdat) = ? 
      AND YEAR(createdat) = ${year}`;

    let resultTraLevelDedTPAY = await Qry(selectTraLevelDedTPay, [
      userid,
      ...levelDeductTypes,
      month,
    ]);

    for (const data of resultTraLevelDedTPAY) {
      let senderid = data.senderid;
      let reason = data.reason || "";

      if (data.type === "Bonus Deduct By Admin") {
        dataArry.push({
          id: x++,
          amount: data.amount.toFixed(2),
          username: "",
          firstname: "",
          lastname: "",
          type: data.type,
          details: data.details,
          createdat: data.createdat,
          currency: data.currency,
          payOutPer: "",
          reason,
        });
      } else {
        const resultUserPkgData1122 = await Qry(
          `SELECT * FROM new_packages WHERE userid = ? and type = ?`,
          [senderid, "package"]
        );

        let senderPlanId = resultUserPkgData1122[0]?.planid;
        const resultSender1 = await Qry(`SELECT * FROM usersdata WHERE id = ?`, [senderid]);

        let senderCreatedat = resultSender1[0]?.createdat;
        const date = new Date(senderCreatedat);
        const monthh = date.getMonth() + 1;
        const day = date.getDate();

        let levelBonus = getLevel1Rate({ month, year, unilevelRate: unilevelData[0].level1 });
        let payOutPer = levelBonus;
        let amount = data.paid_amount;
        let bonus = (amount / 100) * levelBonus;
        let currency = data.currency;

        if (levelBonus !== 40) {
          if (
            currentUserPlanId ===
              "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-USD-Monthly" ||
            currentUserPlanId ===
              "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-EUR-Monthly" ||
            currentUserPlanId ===
              "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-USD-Monthly" ||
            currentUserPlanId ===
              "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-EUR-Monthly"
          ) {
            if (monthh === 4 && day >= 14 && day <= 21) {
              levelBonus = 50;
              payOutPer = 50;
              bonus = (amount / 100) * 50;
            }
          }

          if (monthh === 4 && day >= 22 && day <= 28) {
            levelBonus = 50;
            payOutPer = 50;
            bonus = (amount / 100) * 50;
          }
        }

        if (
          (senderPlanId === "Challenge-Affiliate-PRO-FR-2x147-USD-Monthly" ||
            senderPlanId === "Challenge-Affiliate-PRO-FR-2x147-EUR-Monthly") &&
          (monthh === 4 || (monthh === 5 && day <= 10))
        ) {
          bonus = 50;
          payOutPer = 0;
        }

        detail = `${bonus.toFixed(2)} ${currency} has been deducted successfully as ${data.type}.`;

        if (bonus !== 0) {
          dataArry.push({
            id: x++,
            amount: bonus.toFixed(2),
            username: resultSender1[0]?.username,
            firstname: resultSender1[0]?.firstname,
            lastname: resultSender1[0]?.lastname,
            type: data.type,
            details: detail,
            createdat: data.createdat,
            currency: currency,
            payOutPer: payOutPer,
            reason,
          });
        }
      }
    }

    return dataArry;
  } catch (error) {
    console.log("error", error);
    return null;
  }
}

// total payment function affilate payment
async function total_payment_function_afcm_tblNew(userid, month, year) {
  try {
    const cmonth = month || currentMonthFun();
    const cyear = year || new Date().getFullYear();
    const cdate = getLastDateOfMonth(cyear, cmonth);
    const course_plans =  ['Formation-Sonny-Novalya-Transformer-vos-leads-en-RDV-qualifies-EUR',
      'Formation-Sonny-Novalya-Transformer-vos-leads-en-RDV-qualifies-USD',
      'Formation-Leads-en-RDV-Qualifies-Basic-Plan-EUR-Monthly',
      'Formation-Leads-en-RDV-Qualifies-Basic-Plan-USD-Monthly'];

    const [{ userCount }] = await Qry(
      `SELECT COUNT(*) AS userCount 
        FROM usersdata 
        WHERE sponsorid = ? 
          AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') 
          AND createdat <= ? 
          AND trial_status = ?`,
      [userid, cdate, "inactive"]
    );

    console.log("2203=====>", userCount)

    const [unilevel] = await Qry(
      `SELECT * FROM unilevels WHERE number_of_users <= ? ORDER BY id DESC LIMIT 1`,
      [userCount]
    );

    const nac_date = new Date(cdate);
    const nac_cutoff = new Date(Date.UTC(2025, 4, 1, 0, 0, 0));
    let nac_status = nac_date >= nac_cutoff?true:false;

    let dataArry = [];
    let x = 1;

    const transactionTypes = [
      {
        types: ["Level 1 Bonus", "Level 2 Bonus", "Bonus Add By Admin"],
        isDeduct: false
      },
      {
        types: ["Level 1 Bonus Deducted", "Level 2 Bonus Deducted", "Bonus Deduct By Admin"],
        isDeduct: true
      }
    ];

    for (const { types, isDeduct } of transactionTypes) {
      const placeholders = types.map(() => '?').join(', ');
      const query = `SELECT * FROM transactions 
                     WHERE receiverid = ? 
                       AND type IN (${placeholders}) 
                       AND MONTH(createdat) = ? 
                       AND YEAR(createdat) = ?`;

      const result = await Qry(query, [userid, ...types, cmonth, cyear]);
      
      for (const data of result) {
        const {
          senderid,
          type,
          paid_amount,
          createdat,
          currency,
          amount,
          details,
          reason = ""
        } = data;
        
        if (type.includes("By Admin")) {
          dataArry.push({
            id: x++,
            amount: amount.toFixed(2),
            username: "",
            firstname: "",
            lastname: "",
            type,
            details,
            createdat,
            currency,
            payOutPer: "",
            reason
          });
          continue;
        }

        const [sender] = await Qry(`SELECT username, firstname, lastname FROM usersdata WHERE id = ?`, [senderid]);

        let bonus = 0;
        let payOutPer = 0;
        if(nac_status){

          bonus = paid_amount * 0.4;
          payOutPer = 40;
        }else{

          const levelBonus = (() => {
            if (type.includes("Level 1")) return unilevel?.level1 ?? 0;
            if (type.includes("Level 2")) return unilevel?.level2 ?? 0;
            return 0;
          })();
          bonus = (paid_amount / 100) * levelBonus;
          payOutPer = levelBonus;

          if (details && course_plans.includes(details)) {
            bonus = paid_amount?paid_amount * 0.4 : 40;
            payOutPer = 40;
          }
        }
        
        let detailMsg = isDeduct
          ? `${bonus.toFixed(2)} ${currency} has been deducted successfully as ${type}.`
          : `You have received ${bonus.toFixed(2)} ${currency} amount as ${type}.`;

        if (bonus !== 0) {
          dataArry.push({
            id: x++,
            amount: bonus.toFixed(2),
            username: sender?.username || "",
            firstname: sender?.firstname || "",
            lastname: sender?.lastname || "",
            type,
            details: detailMsg,
            createdat,
            currency,
            payOutPer: payOutPer,
            reason
          });
        }
      }
    }

    return dataArry;
  } catch (error) {
    console.error("error", error);
    return null;
  }
}

async function Grand_total_payment_function(userid,month,usersdata,transactions,unilevels,new_packages){

  try{
  
    // Assuming transactions data is an array of objects
    const filteredTransactions1 = transactions.filter(transaction => {
      return transaction.event_type === "subscription_created" &&
        transaction.type === "Level 1 Bonus" &&
        transaction.receiverid === userid &&
        ((new Date(transaction.createdat).getMonth() + 1 === month &&
          new Date(transaction.createdat).getFullYear() === new Date().getFullYear()) ||
          (new Date(transaction.createdat).getMonth() + 1 === 1 &&
            new Date(transaction.createdat).getDate() >= 28 &&
            new Date(transaction.createdat).getFullYear() === new Date().getFullYear()))
    });

    // Assuming transactions is an array of transaction objects
    const filteredTransactions2 = transactions.filter(transaction =>
      transaction.receiverid === userid &&
      transaction.type === "Level 1 Bonus" &&
      transaction.event_type !== "subscription_changed" &&
      new Date(transaction.createdat).getMonth() + 1 === month &&
      new Date(transaction.createdat).getFullYear() === new Date().getFullYear()
    );

    // Define the current date and month
    const now = new Date();
    const currentDay = now.getDate();
    const currentYear = now.getFullYear();
    const currentMonth = currentMonthFun(); // Assuming this function returns the current month


    // let countQuer3;

    // This is work fine when we provide complete usersdata not only provide data based on usertype and user_type because we also need sponsor user so used below query3 i used
    // // Filter usersdata based on conditions
    // if (currentMonth === month) {
    //   countQuer3 = usersdata.filter(user =>
    //     user.sponsorid === String(userid) &&
    //     user.sub_type === 'year' &&
    //     new Date(user.createdat).getDate() <= currentDay &&
    //     (now - new Date(user.createdat)) <= 365 * 24 * 60 * 60 * 1000 && // within the past 365 days
    //     !['payment_refunded', 'subscription_cancelled', 'payment_failed'].includes(user.subscription_status) &&
    //     new Date(user.createdat).getMonth() + 1 !== month
    //   ).length;
    // } else {
    //   countQuer3 = usersdata.filter(user =>
    //     user.sponsorid === String(userid) &&
    //     user.sub_type === 'year' &&
    //     (now - new Date(user.createdat)) <= 365 * 24 * 60 * 60 * 1000 && // within the past 365 days
    //     !['payment_refunded', 'subscription_cancelled', 'payment_failed'].includes(user.subscription_status) &&
    //     new Date(user.createdat).getMonth() + 1 !== month
    //   ).length;
    // }

    let countQuer3;

    // start condition is for monthly commission cronjob
    // let currentMonth = currentMonthFun();
    if (currentMonth === month) {
      countQuer3 = await Qry(
        "SELECT COUNT(*) as userCount FROM usersdata WHERE sponsorid = ? AND sub_type = 'year' AND DAY(NOW()) >= DAY(createdat) AND DATEDIFF(NOW(), createdat) <= 365 AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') and MONTH(createdat) != ?",
        // "SELECT COUNT(*) as userCount FROM usersdata WHERE sponsorid = ? AND sub_type = 'year' AND DATEDIFF(NOW(), createdat) <= 365 AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') and MONTH(createdat) != ?",
        [userid, month]
      );
    } else {
      countQuer3 = await Qry(
        // "SELECT COUNT(*) as userCount FROM usersdata WHERE sponsorid = ? AND sub_type = 'year' AND DAY(NOW()) >= DAY(createdat) AND DATEDIFF(NOW(), createdat) <= 365 AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') and MONTH(createdat) != ?",
        "SELECT COUNT(*) as userCount FROM usersdata WHERE sponsorid = ? AND sub_type = 'year' AND DATEDIFF(NOW(), createdat) <= 365 AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') and MONTH(createdat) != ?",
        [userid, month]
      );
    }
    countQuer3 = countQuer3[0].userCount;
    // end condition is for monthly commission cronjob

    // Filter transactions based on conditions
    const filteredTransactions = transactions.filter(transaction =>
      transaction.receiverid === userid &&
      transaction.type === "Level 1 Bonus Deducted" &&
      new Date(transaction.createdat).getMonth() + 1 === month &&
      new Date(transaction.createdat).getFullYear() === currentYear
    );

    const countQuer1 = filteredTransactions1.length;
    const countQuer2 = filteredTransactions2.length;
    const countQuer4 = filteredTransactions.length;

    let totalUser;

    if (month === 2) {
      totalUser =
        countQuer1 +
        countQuer2 +
        countQuer3 -
        countQuer4;
    } else {
      totalUser =
        countQuer2 +
        countQuer3 -
        countQuer4;
    }

    // Filter unilevels based on number_of_users condition
    const filteredUnilevels = unilevels.filter(unilevelEntry =>
      unilevelEntry.number_of_users <= totalUser
    );

    // Sort the filtered data by id in descending order
    const sortedUnilevels = filteredUnilevels.sort((a, b) => b.id - a.id);

    // Get the first record from the sorted data
    let unilevelData = sortedUnilevels[0] || null;

    // If no record is found, get the record with id = 0
    if (!unilevelData) {
      unilevelData = unilevels.find(unilevelEntry => unilevelEntry.id === 0) || null;
    }

    // const userIdFilter = userid; // Your actual userid
    const typeFilter = "package"; // Your actual type

    // Filter the new_packages data
    const resultUserPkgData = new_packages.filter(pkg =>
      pkg.userid === userid &&
      pkg.type === typeFilter
    );

    
    let currentUserPlanId = resultUserPkgData[0]?.planid || "";

    let totalPaymentEUR = 0;
    let totalPaymentUSD = 0;

    let level1USD = 0;
    let level2USD = 0;

    let level1EUR = 0;
    let level2EUR = 0;

    let dataArry = [];
    let detail = "";


    const userIdFilter = userid; // Your actual userid
    const typeFilters = ["Level 1 Bonus", "Level 2 Bonus"]; // Your type filters
    const monthFilter = month; // Your actual month

    // Filter the transactions data
    let resultTraLevelTPay;

    if (month === 2) {
      resultTraLevelTPay = transactions.filter(transaction =>
        transaction.receiverid === userIdFilter &&
        typeFilters.includes(transaction.type) &&
        (new Date(transaction.createdat).getMonth() + 1 === monthFilter && new Date(transaction.createdat).getFullYear() === currentYear ||
          (new Date(transaction.createdat).getMonth() + 1 === 1 && new Date(transaction.createdat).getDate() >= 28 && new Date(transaction.createdat).getFullYear() === currentYear))
      );
    } else {
      resultTraLevelTPay = transactions.filter(transaction =>
        transaction.receiverid === userIdFilter &&
        typeFilters.includes(transaction.type) &&
        new Date(transaction.createdat).getMonth() + 1 === monthFilter &&
        new Date(transaction.createdat).getFullYear() === currentYear
      );
    }



    let x = 1;
    // start level 1 and 2
    for (const data of resultTraLevelTPay) {

      const senderid = data?.senderid; // Your actual senderid
      const typeFilter = "package"; // Your actual type

      // Filter the new_packages data
      const resultUserPkgData1122 = new_packages.filter(pkg =>
        pkg.userid === senderid &&
        pkg.type === typeFilter
      );

      let senderPlanId = resultUserPkgData1122[0]?.planid;

      // const senderIdFilter = senderid; // Your actual senderid
      // console.log(senderid)
      // Find the user data
      const resultSender1 = usersdata.find(user =>
        user.id === senderid
    ) || null; // Use null if no matching record is found



      let levelBonus = 0;
      let amount = data?.paid_amount;
      let currency = data?.currency;
      let payOutPer = 0;

      // let senderCreatedat = resultSender1[0]?.createdat;
      let senderCreatedat = resultSender1?.createdat;
      // console.log(senderCreatedat)
      const dateString = senderCreatedat;
      const date = new Date(dateString);
      // Extract month (0-indexed, so January is 0)
      const monthh = date.getMonth() + 1; // Adding 1 to get 1-indexed month
      // Extract day
      const day = date.getDate();

      if (data.type === "Level 1 Bonus") {
        levelBonus = unilevelData?.level1;

        if (
          currentUserPlanId ===
          "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-USD-Monthly" ||
          currentUserPlanId ===
          "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-EUR-Monthly" ||
          currentUserPlanId ===
          "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-USD-Monthly" ||
          currentUserPlanId ===
          "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-EUR-Monthly"
        ) {
          if (month === 4 && monthh === 4 && day >= 14 && day <= 21) {
            levelBonus = 50;
          }
        }

        if (month === 4 && monthh === 4 && day >= 22 && day <= 28) {
          levelBonus = 50;
        }

        if (month === 2 && data.event_type === "subscription_created") {
          levelBonus = 50;
        }
      }

      if (data.type === "Level 2 Bonus") {
        levelBonus = unilevelData?.level2;
      }

      payOutPer = levelBonus;

      let bonus = (amount / 100) * levelBonus;

      if (
        (senderPlanId === "Challenge-Affiliate-PRO-FR-2x147-USD-Monthly" ||
          senderPlanId === "Challenge-Affiliate-PRO-FR-2x147-EUR-Monthly") &&
        (monthh === 4 || (monthh === 5 && day <= 10))
      ) {
        if (data.type === "Level 1 Bonus") {
          bonus = 50;
          payOutPer = 0;
        }
        if (data.type === "Level 2 Bonus") {
          bonus = 0;
          payOutPer = 0;
        }
      }

      // start for unilevel report

      if (data?.type === "Level 1 Bonus" || data?.type === "Level 2 Bonus") {
        detail = `You have received ${bonus.toFixed(2) + " " + currency
          } amount as ${data.type}.`;
      }

      let obj = {
        id: x,
        amount: bonus.toFixed(2),
        username: resultSender1?.username,
        type: data?.type,
        details: detail,
        createdat: data?.createdat,
        currency: currency,
        payOutPer: payOutPer,
      };
      if (bonus !== 0) {
        dataArry.push(obj);
      }

      // start for unilevel report

      if (currency === "EUR") {
        totalPaymentEUR = totalPaymentEUR + bonus;

        // for total earning (following section)
        if (data?.type === "Level 1 Bonus") {
          level1EUR = level1EUR + bonus;
        }
        if (data?.type === "Level 2 Bonus") {
          level2EUR = level2EUR + bonus;
        }
        // for total earning (following section)
      }

      if (currency === "USD") {
        totalPaymentUSD = totalPaymentUSD + bonus;

        // for total earning (following section)
        if (data?.type === "Level 1 Bonus") {
          level1USD = level1USD + bonus;
        }
        if (data?.type === "Level 2 Bonus") {
          level2USD = level2USD + bonus;
        }
        // for total earning (following section)
      }

      x = x + 1;
    }


    const userIdFilter1 = userid; // Your actual userid
    const typeFilters1 = ["Level 1 Bonus Deducted", "Level 2 Bonus Deducted"]; // Your actual type filters

    // Filter the transactions data
    const resultTraLevelDedTPAY = transactions.filter(transaction =>
      transaction.receiverid === userIdFilter1 &&
      typeFilters1.includes(transaction.type) &&
      new Date(transaction.createdat).getMonth() + 1 === monthFilter &&
      new Date(transaction.createdat).getFullYear() === currentYear
    );

    // start deduct level 1 and 2
    for (const data of resultTraLevelDedTPAY) {
      let senderid = data?.senderid;


      const typeFilter = "package"; // Your actual type

      // Filter the new_packages data
      const resultUserPkgData1122 = new_packages.filter(pkg =>
        pkg.userid === senderid &&
        pkg.type === typeFilter
      );

      let senderPlanId = resultUserPkgData1122[0]?.planid;

      // Find the user data
      const resultSender1 = usersdata.find(user =>
        user.id === senderid
      ) || null; // Use null if no matching record is found


      let levelBonus = 0;
      let amount = data?.paid_amount;
      let currency = data.currency;
      let payOutPer = 0;

      let senderCreatedat = resultSender1?.createdat;
      const dateString = senderCreatedat;
      const date = new Date(dateString);
      // Extract month (0-indexed, so January is 0)
      const monthh = date.getMonth() + 1; // Adding 1 to get 1-indexed month
      // Extract day
      const day = date.getDate();

      if (data?.type === "Level 1 Bonus Deducted") {
        // levelBonus = unilevelData[0]?.level1;
        levelBonus = unilevelData?.level1;

        if (
          currentUserPlanId ===
          "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-USD-Monthly" ||
          currentUserPlanId ===
          "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-EUR-Monthly" ||
          currentUserPlanId ===
          "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-USD-Monthly" ||
          currentUserPlanId ===
          "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-EUR-Monthly"
        ) {
          if (monthh === 4 && day >= 14 && day <= 21) {
            levelBonus = 50;
          }
        }

        if (monthh === 4 && day >= 22 && day <= 28) {
          levelBonus = 50;
        }

        if (month === 2) {
          levelBonus = 50;
        }
      }

      if (data?.type === "Level 2 Bonus Deducted") {
        levelBonus = unilevelData?.level2;
      }

      payOutPer = levelBonus;

      let bonus = (amount / 100) * levelBonus;

      if (
        (senderPlanId === "Challenge-Affiliate-PRO-FR-2x147-USD-Monthly" ||
          senderPlanId === "Challenge-Affiliate-PRO-FR-2x147-EUR-Monthly") &&
        (monthh === 4 || (monthh === 5 && day <= 10))
      ) {
        if (data.type === "Level 1 Bonus Deducted") {
          bonus = 50;
          payOutPer = 0;
        }
        if (data.type === "Level 2 Bonus Deducted") {
          bonus = 0;
          payOutPer = 0;
        }
      }

      // start for unilevel report

      if (
        data?.type === "Level 1 Bonus Deducted" ||
        data?.type === "Level 2 Bonus Deducted"
      ) {
        detail = `${bonus.toFixed(2) + " " + currency
          } has been deducted successfully as ${data.type}.`;
      }

      let obj = {
        id: x,
        amount: bonus.toFixed(2),
        username: resultSender1?.username,
        type: data?.type,
        details: detail,
        createdat: data?.createdat,
        currency: currency,
        payOutPer: payOutPer,
      };
      if (bonus !== 0) {
        dataArry.push(obj);
      }

      // end for unilevel report

      if (currency === "EUR") {
        totalPaymentEUR = totalPaymentEUR - bonus;

        // for total earning (following section)
        if (data?.type === "Level 1 Bonus Deducted") {
          level1EUR = level1EUR - bonus;
        }
        if (data?.type === "Level 2 Bonus Deducted") {
          level2EUR = level2EUR - bonus;
        }
        // for total earning (following section)
      }

      if (currency === "USD") {
        totalPaymentUSD = totalPaymentUSD - bonus;

        // for total earning (following section)
        if (data.type === "Level 1 Bonus Deducted") {
          level1USD = level1USD - bonus;
        }
        if (data.type === "Level 2 Bonus Deducted") {
          level2USD = level2USD - bonus;
        }
        // for total earning (following section)
      }

      x = x + 1;
    }
    // end deduct level 1 and 2


    const userIdFilter2 = userid; // Your actual userid
    const typeFilters2 = ["Pool 1 Bonus", "Pool 2 Bonus", "Pool 3 Bonus"]; // Your actual type filters
    const statusFilter2 = "Pending"; // Your actual status
    const monthFilter2 = month; // Your actual month
    const currentYear2 = new Date().getFullYear(); // Current year

    // Filter and calculate the total amount
    const filteredTransactions11 = transactions.filter(transaction =>
      transaction.receiverid === userIdFilter2 &&
      typeFilters2.includes(transaction.type) &&
      transaction.status === statusFilter2 &&
      new Date(transaction.createdat).getMonth() + 1 === monthFilter2 &&
      new Date(transaction.createdat).getFullYear() === currentYear2
    );

    const totalAmount1 = filteredTransactions11.reduce((sum, transaction) => sum + parseFloat(transaction.amount), 0);

    const resultPoolBonusUSD = { totalAmount1 };

    if (resultPoolBonusUSD.totalAmount1 === null) {
      resultPoolBonusUSD.totalAmount1 = 0;
    }

    let bonusUSD = resultPoolBonusUSD.totalAmount1;

    // start condition is for monthly commission cronjob
    if (currentMonth === month) {
      totalPaymentUSD = totalPaymentUSD + bonusUSD;
    }
    // end condition is for monthly commission cronjob




    const userIdFilter5 = userid; // Your actual userid
    const typeFilter5 = "Bonus Add By Admin"; // Your actual type
    const currencyFilter5 = "USD"; // Your actual currency
    const monthFilter5 = month; // Your actual month
    const currentYear5 = new Date().getFullYear(); // Current year

    // Filter and calculate the total amount
    const filteredTransactions5 = transactions.filter(transaction =>
      transaction.receiverid === userIdFilter5 &&
      transaction.type === typeFilter5 &&
      transaction.currency === currencyFilter5 &&
      new Date(transaction.createdat).getMonth() + 1 === monthFilter5 &&
      new Date(transaction.createdat).getFullYear() === currentYear5
    );

    const totalAmount2 = filteredTransactions5.reduce((sum, transaction) => sum + parseFloat(transaction.amount), 0);

    const resultBalanceAddAdminUSD = { totalAmount2 };

    if (resultBalanceAddAdminUSD.totalAmount2 === null) {
      resultBalanceAddAdminUSD.totalAmount2 = 0;
    }



    const userIdFilter6 = userid; // Your actual userid
    const typeFilter6 = "Bonus Deduct By Admin"; // Your actual type
    const currencyFilter6 = "USD"; // Your actual currency
    const monthFilter6 = month; // Your actual month
    const currentYear6 = new Date().getFullYear(); // Current year

    // Filter and calculate the total amount
    const filteredTransactions6 = transactions.filter(transaction =>
      transaction.receiverid === userIdFilter6 &&
      transaction.type === typeFilter6 &&
      transaction.currency === currencyFilter6 &&
      new Date(transaction.createdat).getMonth() + 1 === monthFilter6 &&
      new Date(transaction.createdat).getFullYear() === currentYear6
    );

    const totalAmount3 = filteredTransactions6.reduce((sum, transaction) => sum + parseFloat(transaction.amount), 0);

    const resultBalanceDeductAdminUSD = { totalAmount3 };

    if (resultBalanceDeductAdminUSD.totalAmount3 === null) {
      resultBalanceDeductAdminUSD.totalAmount3 = 0;
    }




    const userIdFilter7 = userid; // Your actual userid
    const typeFilter7 = "Bonus Add By Admin"; // Your actual type
    const currencyFilter7 = "EUR"; // Your actual currency
    const monthFilter7 = month; // Your actual month
    const currentYear7 = new Date().getFullYear(); // Current year

    // Filter and calculate the total amount
    const filteredTransactions7 = transactions.filter(transaction =>
      transaction.receiverid === userIdFilter7 &&
      transaction.type === typeFilter7 &&
      transaction.currency === currencyFilter7 &&
      new Date(transaction.createdat).getMonth() + 1 === monthFilter7 &&
      new Date(transaction.createdat).getFullYear() === currentYear7
    );

    const totalAmount4 = filteredTransactions7.reduce((sum, transaction) => sum + parseFloat(transaction.amount), 0);

    const resultBalanceAddAdminEUR = { totalAmount4 };


    if (resultBalanceAddAdminEUR.totalAmount4 === null) {
      resultBalanceAddAdminEUR.totalAmount4 = 0;
    }



    const userIdFilter8 = userid; // Your actual userid
    const typeFilter8 = "Bonus Deduct By Admin"; // Your actual type
    const currencyFilter8 = "EUR"; // Your actual currency
    const monthFilter8 = month; // Your actual month
    const currentYear8 = new Date().getFullYear(); // Current year

    // Filter and calculate the total amount
    const filteredTransactions8 = transactions.filter(transaction =>
      transaction.receiverid === userIdFilter8 &&
      transaction.type === typeFilter8 &&
      transaction.currency === currencyFilter8 &&
      new Date(transaction.createdat).getMonth() + 1 === monthFilter8 &&
      new Date(transaction.createdat).getFullYear() === currentYear8
    );

    const totalAmount = filteredTransactions8.reduce((sum, transaction) => sum + parseFloat(transaction.amount), 0);

    const resultBalanceDeductAdminEUR = { totalAmount };

    // console.log(resultBalanceDeductAdminEUR);


    if (resultBalanceDeductAdminEUR.totalAmount === null) {
      resultBalanceDeductAdminEUR.totalAmount = 0;
    }

    let usdOthers =
      resultBalanceAddAdminUSD.totalAmount2 -
      resultBalanceDeductAdminUSD.totalAmount3;

    let eurOthers =
      resultBalanceAddAdminEUR.totalAmount4 -
      resultBalanceDeductAdminEUR.totalAmount;

    totalPaymentUSD = totalPaymentUSD + usdOthers;
    totalPaymentEUR = totalPaymentEUR + eurOthers;


    let obj = {
      totalPaymentUSD: totalPaymentUSD,
      totalPaymentEUR: totalPaymentEUR,
    };

    return obj;

  
  }catch(error){
    console.log(error);
    return null;
  }
  
}


async function total_payment_function1(userid, month) {
  try {
    const countQuer1 = await Qry(
      "SELECT COUNT(*) as userCount FROM transactions1 WHERE receiverid = ? and type = ? and MONTH(createdat) = 1 AND DAY(createdat) >= 28 AND YEAR(createdat) = YEAR(now())",
      [userid, "Level 1 Bonus"]
    );

    const countQuer2 = await Qry(
      "SELECT COUNT(*) as userCount FROM transactions1 WHERE receiverid = ? and type = ? and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())",
      [userid, "Level 1 Bonus", month]
    );

    const countQuer3 = await Qry(
      "SELECT COUNT(*) as userCount FROM usersdata WHERE sponsorid = ? AND sub_type = 'year' AND DAY(NOW()) >= DAY(createdat) AND DATEDIFF(NOW(), createdat) <= 365 AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') and MONTH(createdat) != MONTH(now())",
      [userid]
    );

    const countQuer4 = await Qry(
      "SELECT COUNT(*) as userCount FROM transactions1 WHERE receiverid = ? and type = ? and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())",
      [userid, "Level 1 Bonus Deducted", month]
    );

    let totalUser =
      countQuer2[0].userCount +
      countQuer3[0].userCount -
      countQuer4[0].userCount;

    let unilevelData;
    unilevelData = await Qry(
      "SELECT * FROM unilevels WHERE `number_of_users` <= ? ORDER BY `id` DESC LIMIT 1",
      [totalUser]
    );

    if (unilevelData.length === 0) {
      unilevelData = await Qry("SELECT * FROM unilevels WHERE id = ?", [0]);
    }

    const selectUsersPkgData = `SELECT * FROM new_packages WHERE userid = ? and type = ?`;
    let resultUserPkgData = await Qry(selectUsersPkgData, [userid, "package"]);

    let currentUserPlanId = resultUserPkgData[0].planid;

    let totalPaymentEUR = 0;
    let totalPaymentUSD = 0;

    let level1USD = 0;
    let level2USD = 0;

    let level1EUR = 0;
    let level2EUR = 0;

    // start level 1 and 2
    const selectTraLevelTpay = `SELECT * FROM transactions1 WHERE receiverid = ? AND (type = ? or type = ?) and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())`;
    let resultTraLevelTPay = await Qry(selectTraLevelTpay, [
      userid,
      "Level 1 Bonus",
      "Level 2 Bonus",
      month,
    ]);

    for (const data of resultTraLevelTPay) {
      let senderid = data.senderid;

      const selectSender1 = `SELECT * FROM usersdata WHERE id = ?`;
      let resultSender1 = await Qry(selectSender1, [senderid]);
      let levelBonus = 0;
      let amount = data.paid_amount;
      let currency = data.currency;

      let senderCreatedat = resultSender1[0].createdat;
      const dateString = senderCreatedat;
      const date = new Date(dateString);
      // Extract month (0-indexed, so January is 0)
      const month = date.getMonth() + 1; // Adding 1 to get 1-indexed month
      // Extract day
      const day = date.getDate();

      if (data.type === "Level 1 Bonus") {
        levelBonus = unilevelData[0].level1;

        if (
          currentUserPlanId ===
            "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-USD-Monthly" ||
          currentUserPlanId ===
            "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-EUR-Monthly" ||
          currentUserPlanId ===
            "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-USD-Monthly" ||
          currentUserPlanId ===
            "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-EUR-Monthly"
        ) {
          if (month === 4 && day >= 14 && day <= 21) {
            levelBonus = 50;
          }
        }

        if (month === 4 && day >= 22 && day <= 28) {
          levelBonus = 50;
        }
      }

      if (data.type === "Level 2 Bonus") {
        levelBonus = unilevelData[0].level2;
      }

      let bonus = (amount / 100) * levelBonus;

      if (currency === "EUR") {
        totalPaymentEUR = totalPaymentEUR + bonus;

        // for total earning (following section)
        if (data.type === "Level 1 Bonus") {
          level1EUR = level1EUR + bonus;
        }
        if (data.type === "Level 2 Bonus") {
          level2EUR = level2EUR + bonus;
        }
        // for total earning (following section)
      }

      if (currency === "USD") {
        totalPaymentUSD = totalPaymentUSD + bonus;

        // for total earning (following section)
        if (data.type === "Level 1 Bonus") {
          level1USD = level1USD + bonus;
        }
        if (data.type === "Level 2 Bonus") {
          level2USD = level2USD + bonus;
        }
        // for total earning (following section)
      }
    }

    // end level 1 and 2

    // start deduct level 1 and 2
    const selectTraLevelDedTPay = `SELECT * FROM transactions1 WHERE receiverid = ? AND (type = ? or type = ?) and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())`;
    let resultTraLevelDedTPAY = await Qry(selectTraLevelDedTPay, [
      userid,
      "Level 1 Bonus Deducted",
      "Level 2 Bonus Deducted",
      month,
    ]);

    for (const data of resultTraLevelDedTPAY) {
      let senderid = data.senderid;

      const selectSender1 = `SELECT * FROM usersdata WHERE id = ?`;
      let resultSender1 = await Qry(selectSender1, [senderid]);
      let levelBonus = 0;
      let amount = data.paid_amount;
      let currency = data.currency;

      let senderCreatedat = resultSender1[0].createdat;
      const dateString = senderCreatedat;
      const date = new Date(dateString);
      // Extract month (0-indexed, so January is 0)
      const month = date.getMonth() + 1; // Adding 1 to get 1-indexed month
      // Extract day
      const day = date.getDate();

      if (data.type === "Level 1 Bonus Deducted") {
        levelBonus = unilevelData[0].level1;

        if (
          currentUserPlanId ===
            "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-USD-Monthly" ||
          currentUserPlanId ===
            "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-EUR-Monthly" ||
          currentUserPlanId ===
            "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-USD-Monthly" ||
          currentUserPlanId ===
            "Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-EUR-Monthly"
        ) {
          if (month === 4 && day >= 14 && day <= 21) {
            levelBonus = 50;
          }
        }

        if (month === 4 && day >= 22 && day <= 28) {
          levelBonus = 50;
        }
      }

      if (data.type === "Level 2 Bonus Deducted") {
        levelBonus = unilevelData[0].level2;
      }

      let bonus = (amount / 100) * levelBonus;

      if (currency === "EUR") {
        totalPaymentEUR = totalPaymentEUR - bonus;

        // for total earning (following section)
        if (data.type === "Level 1 Bonus Deducted") {
          level1EUR = level1EUR - bonus;
        }
        if (data.type === "Level 2 Bonus Deducted") {
          level2EUR = level2EUR - bonus;
        }
        // for total earning (following section)
      }

      if (currency === "USD") {
        totalPaymentUSD = totalPaymentUSD - bonus;

        // for total earning (following section)
        if (data.type === "Level 1 Bonus Deducted") {
          level1USD = level1USD - bonus;
        }
        if (data.type === "Level 2 Bonus Deducted") {
          level2USD = level2USD - bonus;
        }
        // for total earning (following section)
      }
    }
    // end deduct level 1 and 2

    let obj = {
      totalPaymentEUR: totalPaymentEUR,
      totalPaymentUSD: totalPaymentUSD,
    };

    return obj;
  } catch (error) {
    return null;
  }
}

async function pendng_commission(userid, month) {
  try {
    // const countQuer1 = await Qry(
    //   "SELECT COUNT(*) as userCount FROM transactions WHERE event_type = ? AND type = ? AND receiverid = ? AND ((MONTH(createdat) = ? AND YEAR(createdat) = YEAR(NOW())) OR (MONTH(createdat) = 1 AND DAY(createdat) >= 28 AND YEAR(createdat) = YEAR(NOW())))",
    //   ["subscription_created", "Level 1 Bonus", userid, month]
    // );

    // const countQuer2 = await Qry(
    //   "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and event_type != ? and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())",
    //   [userid, "Level 1 Bonus", "subscription_changed", month]
    // );

    // let countQuer3;

    // start condition is for monthly commission cronjob
    let currentMonth = currentMonthFun();
    // if (currentMonth === month) {
    //   countQuer3 = await Qry(
    //     "SELECT COUNT(*) as userCount FROM usersdata WHERE sponsorid = ? AND sub_type = 'year' AND DAY(NOW()) >= DAY(createdat) AND DATEDIFF(NOW(), createdat) <= 365 AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') and MONTH(createdat) != ?",
    //     // "SELECT COUNT(*) as userCount FROM usersdata WHERE sponsorid = ? AND sub_type = 'year' AND DATEDIFF(NOW(), createdat) <= 365 AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') and MONTH(createdat) != ?",
    //     [userid, month]
    //   );
    // }
    // else {
    //   countQuer3 = await Qry(
    //     // "SELECT COUNT(*) as userCount FROM usersdata WHERE sponsorid = ? AND sub_type = 'year' AND DAY(NOW()) >= DAY(createdat) AND DATEDIFF(NOW(), createdat) <= 365 AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') and MONTH(createdat) != ?",
    //     "SELECT COUNT(*) as userCount FROM usersdata WHERE sponsorid = ? AND sub_type = 'year' AND DATEDIFF(NOW(), createdat) <= 365 AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') and MONTH(createdat) != ?",
    //     [userid, month]
    //   );
    // }
    // end condition is for monthly commission cronjob

    // const countQuer4 = await Qry(
    //   "SELECT COUNT(*) as userCount FROM transactions WHERE receiverid = ? and type = ? and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())",
    //   [userid, "Level 1 Bonus Deducted", month]
    // );

    // let totalUser;

    // if (month === 2) {
    //   totalUser = countQuer1[0].userCount + countQuer2[0].userCount + countQuer3[0].userCount - countQuer4[0].userCount;
    // }
    // else {
    //   totalUser = countQuer2[0].userCount + countQuer3[0].userCount - countQuer4[0].userCount;
    // }

    // let unilevelData;
    // unilevelData = await Qry(
    //   "SELECT * FROM unilevels WHERE `number_of_users` <= ? ORDER BY `id` DESC LIMIT 1",
    //   [totalUser]
    // );

    // if (unilevelData.length === 0) {
    //   unilevelData = await Qry("SELECT * FROM unilevels WHERE id = ?", [0]);
    // }

    // const selectUsersPkgData = `SELECT * FROM new_packages WHERE userid = ? and type = ?`;
    // let resultUserPkgData = await Qry(selectUsersPkgData, [
    //   userid, 'package'
    // ]);

    // let currentUserPlanId = resultUserPkgData[0].planid

    let totalPaymentEUR = 0;
    let totalPaymentUSD = 0;

    let level1USD = 0;
    let level2USD = 0;

    let level1EUR = 0;
    let level2EUR = 0;

    let dataArry = [];
    let detail = "";

    // start level 1 and 2
    // let selectTraLevelTpay;

    // if (month === 2) {
    //   selectTraLevelTpay = `SELECT * FROM transactions WHERE receiverid = ? AND (type = ? or type = ?) and ((MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())) or (MONTH(createdat) = 1 AND DAY(createdat) >= 28 AND YEAR(createdat) = YEAR(NOW())))`;
    // }
    // else {
    //   selectTraLevelTpay = `SELECT * FROM transactions WHERE receiverid = ? AND (type = ? or type = ?) and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())`;
    // }
    // let resultTraLevelTPay = await Qry(
    //   selectTraLevelTpay,
    //   [userid, "Level 1 Bonus", "Level 2 Bonus", month]
    // );

    // let x = 1

    // for (const data of resultTraLevelTPay) {
    //   let senderid = data.senderid

    //   const selectUsersPkgData1122 = `SELECT * FROM new_packages WHERE userid = ? and type = ?`;
    //   let resultUserPkgData1122 = await Qry(selectUsersPkgData1122, [
    //     senderid, 'package'
    //   ]);

    //   let senderPlanId = resultUserPkgData1122[0].planid

    //   const selectSender1 = `SELECT * FROM usersdata WHERE id = ?`;
    //   let resultSender1 = await Qry(
    //     selectSender1,
    //     [senderid]
    //   );
    //   let levelBonus = 0
    //   let amount = data.paid_amount
    //   let currency = data.currency
    //   let payOutPer = 0

    //   let senderCreatedat = resultSender1[0].createdat
    //   const dateString = senderCreatedat;
    //   const date = new Date(dateString);
    //   // Extract month (0-indexed, so January is 0)
    //   const monthh = date.getMonth() + 1; // Adding 1 to get 1-indexed month
    //   // Extract day
    //   const day = date.getDate();

    //   if (data.type === 'Level 1 Bonus') {
    //     levelBonus = unilevelData[0].level1

    //     if (currentUserPlanId === 'Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-USD-Monthly' || currentUserPlanId === 'Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-EUR-Monthly' || currentUserPlanId === 'Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-USD-Monthly' || currentUserPlanId === 'Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-EUR-Monthly') {

    //       if (monthh === 4 && day >= 14 && day <= 21) {
    //         levelBonus = 50
    //       }

    //     }

    //     if (monthh === 4 && day >= 22 && day <= 28) {
    //       levelBonus = 50
    //     }

    //     if (month === 2 && data.event_type === 'subscription_created') {
    //       levelBonus = 50
    //     }

    //   }

    //   if (data.type === 'Level 2 Bonus') {
    //     levelBonus = unilevelData[0].level2
    //   }

    //   payOutPer = levelBonus

    //   let bonus = (amount / 100) * levelBonus

    //   if ((senderPlanId === 'Challenge-Affiliate-PRO-FR-2x147-USD-Monthly' || senderPlanId === 'Challenge-Affiliate-PRO-FR-2x147-EUR-Monthly') && ((monthh === 4) || (monthh === 5 && day <= 10))) {
    //     if (data.type === 'Level 1 Bonus') {
    //       bonus = 50
    //       payOutPer = 0
    //     }
    //     if (data.type === 'Level 2 Bonus') {
    //       bonus = 0
    //       payOutPer = 0
    //     }
    //   }

    // start for unilevel report

    // if (data.type === 'Level 1 Bonus' || data.type === 'Level 2 Bonus') {
    //   detail = `You have received ${bonus.toFixed(2) + ' ' + currency} amount as ${data.type}.`
    // }

    // let obj = {
    //   id: x,
    //   amount: bonus.toFixed(2),
    //   username: resultSender1[0].username,
    //   type: data.type,
    //   details: detail,
    //   createdat: data.createdat,
    //   currency: currency,
    //   payOutPer: payOutPer
    // }
    // if (bonus !== 0) {
    //   dataArry.push(obj)
    // }

    // start for unilevel report

    //   if (currency === 'EUR') {
    //     totalPaymentEUR = totalPaymentEUR + bonus

    //     // for total earning (following section)
    //     if (data.type === 'Level 1 Bonus') {
    //       level1EUR = level1EUR + bonus
    //     }
    //     if (data.type === 'Level 2 Bonus') {
    //       level2EUR = level2EUR + bonus
    //     }
    //     // for total earning (following section)

    //   }

    //   if (currency === 'USD') {
    //     totalPaymentUSD = totalPaymentUSD + bonus

    //     // for total earning (following section)
    //     if (data.type === 'Level 1 Bonus') {
    //       level1USD = level1USD + bonus
    //     }
    //     if (data.type === 'Level 2 Bonus') {
    //       level2USD = level2USD + bonus
    //     }
    //     // for total earning (following section)

    //   }

    //   x = x + 1

    // }

    // end level 1 and 2

    // start deduct level 1 and 2
    // const selectTraLevelDedTPay = `SELECT * FROM transactions WHERE receiverid = ? AND (type = ? or type = ?) and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())`;
    // let resultTraLevelDedTPAY = await Qry(
    //   selectTraLevelDedTPay,
    //   [userid, "Level 1 Bonus Deducted", "Level 2 Bonus Deducted", month]
    // );

    // for (const data of resultTraLevelDedTPAY) {
    //   let senderid = data.senderid

    //   const selectUsersPkgData1122 = `SELECT * FROM new_packages WHERE userid = ? and type = ?`;
    //   let resultUserPkgData1122 = await Qry(selectUsersPkgData1122, [
    //     senderid, 'package'
    //   ]);

    //   let senderPlanId = resultUserPkgData1122[0].planid

    //   const selectSender1 = `SELECT * FROM usersdata WHERE id = ?`;
    //   let resultSender1 = await Qry(
    //     selectSender1,
    //     [senderid]
    //   );
    //   let levelBonus = 0
    //   let amount = data.paid_amount
    //   let currency = data.currency
    //   let payOutPer = 0

    //   let senderCreatedat = resultSender1[0].createdat
    //   const dateString = senderCreatedat;
    //   const date = new Date(dateString);
    //   // Extract month (0-indexed, so January is 0)
    //   const monthh = date.getMonth() + 1; // Adding 1 to get 1-indexed month
    //   // Extract day
    //   const day = date.getDate();

    //   if (data.type === 'Level 1 Bonus Deducted') {
    //     levelBonus = unilevelData[0].level1

    //     if (currentUserPlanId === 'Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-USD-Monthly' || currentUserPlanId === 'Offre-Spciale-Challenge-7-Jours-1-An-Novalya-1X297-EUR-Monthly' || currentUserPlanId === 'Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-USD-Monthly' || currentUserPlanId === 'Offre-Spciale-Challenge-7-Jours-1-An-Novalya-2X149-EUR-Monthly') {

    //       if (monthh === 4 && day >= 14 && day <= 21) {
    //         levelBonus = 50
    //       }

    //     }

    //     if (monthh === 4 && day >= 22 && day <= 28) {
    //       levelBonus = 50
    //     }

    //     if (month === 2) {
    //       levelBonus = 50
    //     }

    //   }

    //   if (data.type === 'Level 2 Bonus Deducted') {
    //     levelBonus = unilevelData[0].level2
    //   }

    //   payOutPer = levelBonus

    //   let bonus = (amount / 100) * levelBonus

    //   if ((senderPlanId === 'Challenge-Affiliate-PRO-FR-2x147-USD-Monthly' || senderPlanId === 'Challenge-Affiliate-PRO-FR-2x147-EUR-Monthly') && ((monthh === 4) || (monthh === 5 && day <= 10))) {
    //     if (data.type === 'Level 1 Bonus Deducted') {
    //       bonus = 50
    //       payOutPer = 0
    //     }
    //     if (data.type === 'Level 2 Bonus Deducted') {
    //       bonus = 0
    //       payOutPer = 0
    //     }
    //   }

    //   // start for unilevel report

    //   if (data.type === 'Level 1 Bonus Deducted' || data.type === 'Level 2 Bonus Deducted') {
    //     detail = `${bonus.toFixed(2) + ' ' + currency} has been deducted successfully as ${data.type}.`
    //   }

    //   let obj = {
    //     id: x,
    //     amount: bonus.toFixed(2),
    //     username: resultSender1[0].username,
    //     type: data.type,
    //     details: detail,
    //     createdat: data.createdat,
    //     currency: currency,
    //     payOutPer: payOutPer
    //   }
    //   if (bonus !== 0) {
    //     dataArry.push(obj)
    //   }

    //   // end for unilevel report

    //   if (currency === 'EUR') {
    //     totalPaymentEUR = totalPaymentEUR - bonus

    //     // for total earning (following section)
    //     if (data.type === 'Level 1 Bonus Deducted') {
    //       level1EUR = level1EUR - bonus
    //     }
    //     if (data.type === 'Level 2 Bonus Deducted') {
    //       level2EUR = level2EUR - bonus
    //     }
    //     // for total earning (following section)
    //   }

    //   if (currency === 'USD') {
    //     totalPaymentUSD = totalPaymentUSD - bonus

    //     // for total earning (following section)
    //     if (data.type === 'Level 1 Bonus Deducted') {
    //       level1USD = level1USD - bonus
    //     }
    //     if (data.type === 'Level 2 Bonus Deducted') {
    //       level2USD = level2USD - bonus
    //     }
    //     // for total earning (following section)

    //   }

    //   x = x + 1

    // }
    // end deduct level 1 and 2

    const selectPoolBonusUSD = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND (type = ? or type = ? or type = ?) AND status = ? AND MONTH(createdat) = ? AND YEAR(createdat) = YEAR(now())`;
    let resultPoolBonusUSD = await Qry(selectPoolBonusUSD, [
      userid,
      "Pool 1 Bonus",
      "Pool 2 Bonus",
      "Pool 3 Bonus",
      "Pending",
      month,
    ]);

    if (resultPoolBonusUSD[0].totalAmount === null) {
      resultPoolBonusUSD[0].totalAmount = 0;
    }

    let bonusUSD = resultPoolBonusUSD[0].totalAmount;

    // start condition is for monthly commission cronjob
    if (currentMonth === month) {
      totalPaymentUSD = totalPaymentUSD + bonusUSD;
    }
    // end condition is for monthly commission cronjob

    const selectBalanceAddAdminUSD = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND type = ? AND currency = ? AND MONTH(createdat) = ? AND YEAR(createdat) = YEAR(now())`;
    let resultBalanceAddAdminUSD = await Qry(selectBalanceAddAdminUSD, [
      userid,
      "Bonus Add By Admin",
      "USD",
      month,
    ]);

    if (resultBalanceAddAdminUSD[0].totalAmount === null) {
      resultBalanceAddAdminUSD[0].totalAmount = 0;
    }

    const selectBalanceDeductAdminUSD = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND type = ? AND currency = ? AND MONTH(createdat) = ? AND YEAR(createdat) = YEAR(now())`;
    let resultBalanceDeductAdminUSD = await Qry(selectBalanceDeductAdminUSD, [
      userid,
      "Bonus Deduct By Admin",
      "USD",
      month,
    ]);

    if (resultBalanceDeductAdminUSD[0].totalAmount === null) {
      resultBalanceDeductAdminUSD[0].totalAmount = 0;
    }

    const selectBalanceAddAdminEUR = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND type = ? AND currency = ? AND MONTH(createdat) = ? AND YEAR(createdat) = YEAR(now())`;
    let resultBalanceAddAdminEUR = await Qry(selectBalanceAddAdminEUR, [
      userid,
      "Bonus Add By Admin",
      "EUR",
      month,
    ]);

    if (resultBalanceAddAdminEUR[0].totalAmount === null) {
      resultBalanceAddAdminEUR[0].totalAmount = 0;
    }

    const selectBalanceDeductAdminEUR = `SELECT SUM(amount) AS totalAmount FROM transactions WHERE receiverid = ? AND type = ? AND currency = ? AND MONTH(createdat) = ? AND YEAR(createdat) = YEAR(now())`;
    let resultBalanceDeductAdminEUR = await Qry(selectBalanceDeductAdminEUR, [
      userid,
      "Bonus Deduct By Admin",
      "EUR",
      month,
    ]);

    if (resultBalanceDeductAdminEUR[0].totalAmount === null) {
      resultBalanceDeductAdminEUR[0].totalAmount = 0;
    }

    let usdOthers =
      resultBalanceAddAdminUSD[0].totalAmount -
      resultBalanceDeductAdminUSD[0].totalAmount;
    let eurOthers =
      resultBalanceAddAdminEUR[0].totalAmount -
      resultBalanceDeductAdminEUR[0].totalAmount;

    totalPaymentEUR = totalPaymentEUR + eurOthers;
    totalPaymentUSD = totalPaymentUSD + usdOthers;

    let obj = {
      totalPaymentEUR: totalPaymentEUR,
      totalPaymentUSD: totalPaymentUSD,
    };

    return obj;
  } catch (error) {
    return null;
  }
}

async function newSalesFunction(userID, month) {
  try {
    let countActiveQuery;
    let countActiveQuery11;
    if (month === 2) {
      countActiveQuery = await Qry(
        "SELECT COUNT(*) as userCount FROM transactions WHERE event_type = ? AND type = ? AND receiverid = ? AND ((MONTH(createdat) = ? AND YEAR(createdat) = YEAR(NOW())) OR (MONTH(createdat) = 1 AND DAY(createdat) >= 28 AND YEAR(createdat) = YEAR(NOW())))",
        ["subscription_created", "Level 1 Bonus", userID, month]
      );
    } else {
      countActiveQuery = await Qry(
        "SELECT COUNT(*) as userCount FROM transactions WHERE event_type = ? AND type = ? AND receiverid = ? AND ((MONTH(createdat) = ? AND YEAR(createdat) = YEAR(NOW())))",
        ["subscription_created", "Level 1 Bonus", userID, month]
      );
    }

    countActiveQuery11 = await Qry(
      "SELECT COUNT(*) as userCount FROM transactions WHERE event_type = ? AND type = ? AND receiverid = ? AND ((MONTH(createdat) = ? AND YEAR(createdat) = YEAR(NOW())))",
      ["subscription_activated", "Level 1 Bonus", userID, month]
    );

    const countActiveQuery1 = await Qry(
      `SELECT COUNT(*) as userCount, t.senderid as tid 
          FROM transactions t
          JOIN usersdata u ON t.senderid = u.id
          WHERE t.event_type = ? 
            AND t.type = ? 
            AND t.receiverid = ? 
            AND ((MONTH(t.createdat) = ? AND YEAR(t.createdat) = YEAR(NOW())))
            AND u.subscription_status = 'payment_refunded'`,
      ["payment_refunded", "Level 1 Bonus Deducted", userID, month]
    );

    let totalUser =
      countActiveQuery[0].userCount +
      countActiveQuery11[0].userCount -
      countActiveQuery1[0].userCount;

    return totalUser;
  } catch (error) {
    return null;
  }
}

async function get_dashboard_affiliate_summary(userid, userCurrency, conversionRate, checkDate = new Date()) {
  const today = checkDate instanceof Date ? checkDate : new Date();

  const getMonthYear = (offset = 0) => {
    const date = new Date(today);
    date.setUTCMonth(date.getUTCMonth() + offset);
    return [date.getUTCMonth() + 1, date.getUTCFullYear()];
  };

  const [cmonth, cyear] = getMonthYear();
  const [lastMonth, lastMonthYear] = getMonthYear(-1);
  const [twoMonthsAgo, twoMonthsAgoYear] = getMonthYear(-2);

  const getStartEndDates = (year, month) => ({
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
  });

  const { start: startOfCurrentMonth, end: endOfCurrentMonth } = getStartEndDates(cyear, cmonth);
  const { start: startOfLastMonth, end: endOfLastMonth } = getStartEndDates(lastMonthYear, lastMonth);
  const { start: startOfTwoMonthsAgo, end: endOfTwoMonthsAgo } = getStartEndDates(twoMonthsAgoYear, twoMonthsAgo);

  const coursePlans = [
    'Formation-Sonny-Novalya-Transformer-vos-leads-en-RDV-qualifies-EUR',
    'Formation-Sonny-Novalya-Transformer-vos-leads-en-RDV-qualifies-USD',
    'Formation-Leads-en-RDV-Qualifies-Basic-Plan-EUR-Monthly',
    'Formation-Leads-en-RDV-Qualifies-Basic-Plan-USD-Monthly'
  ];

  const transactionTypes = [
    {
      types: ["Level 1 Bonus", "Level 2 Bonus", "Bonus Add By Admin"],
      isDeduct: false
    },
    {
      types: ["Level 1 Bonus Deducted", "Level 2 Bonus Deducted", "Bonus Deduct By Admin"],
      isDeduct: true
    }
  ];

  const [{ userCount }] = await Qry(
    `SELECT COUNT(*) AS userCount 
     FROM usersdata 
     WHERE sponsorid = ? 
       AND subscription_status NOT IN ('payment_refunded', 'subscription_cancelled', 'payment_failed') 
       AND createdat <= ? 
       AND trial_status = ?`,
    [userid, today, "inactive"]
  );

  const [unilevel] = await Qry(
    `SELECT * FROM unilevels WHERE number_of_users <= ? ORDER BY id DESC LIMIT 1`,
    [userCount]
  );

  const nacCutoff = new Date(Date.UTC(2025, 4, 1));
  const nacEndCutoff = new Date(Date.UTC(2025, 4, 31, 23, 59, 59, 999));
  const nacCutoff1 = new Date(Date.UTC(2025, 5, 1));
  const nacEndCutoff2 = new Date(Date.UTC(2025, 5, 30, 23, 59, 59, 999)); // Fixed June 30th
  const isDuringNAC = today >= nacCutoff && today <= nacEndCutoff;
  const isAfterNAC = today > nacEndCutoff;
  const isJune = today >= nacCutoff1 && today <= nacEndCutoff2;

  const calculateCommission = async (types, isDeduct, dateStart, dateEnd, requireLockIn = 0, typef = 1) => {
    const placeholders = types.map(() => '?').join(',');
    let query = `
      SELECT paid_amount, details, type, currency
      FROM transactions
      WHERE receiverid = ?
        AND type IN (${placeholders})
        AND createdat BETWEEN ? AND ?
    `;
    const params = [userid, ...types, dateStart, dateEnd];

    if (requireLockIn === 1) {
      query += ` AND DATE_ADD(createdat, INTERVAL 30 DAY) ${isDeduct ? '<=' : '>'} ?`;
      params.push(today);
    } else if (requireLockIn === 2) {
      query += ` AND DATE_ADD(createdat, INTERVAL 30 DAY) ${isDeduct ? '>=' : '<'} ?`;
      params.push(today);
    }

    const result = await Qry(query, params);

    let totalCommission = 0;

    for (const { paid_amount, details, type, currency } of result) {
      if (!paid_amount) continue;

      let commission = 0;

      if ((isAfterNAC || (details && coursePlans.includes(details))) || (typef === 3 && isDuringNAC)) {
        commission = paid_amount * 0.4;
      } else {
        const levelBonus = type.includes("Level 1") ? (unilevel?.level1 ?? 0) :
                           type.includes("Level 2") ? (unilevel?.level2 ?? 0) : 0;
        commission = (paid_amount * levelBonus) / 100;
      }

      // Convert commission if needed
      if (userCurrency !== currency) {
        commission *= conversionRate;
      }

      totalCommission += isDeduct ? -commission : commission;
    }

    return totalCommission;
  };

  let lastMonthPayout = 0;
  let currentMonthEarning = 0;
  let pendingPayment = 0;

  for (const { types, isDeduct } of transactionTypes) {
    if (isAfterNAC) {
      if (isJune) {
        lastMonthPayout = 0;
      } else {
        lastMonthPayout += await calculateCommission(types, isDeduct, startOfTwoMonthsAgo, endOfTwoMonthsAgo, false, 1);
      }
      currentMonthEarning += await calculateCommission(types, isDeduct, startOfLastMonth, endOfLastMonth, 2, 2);
      pendingPayment += await calculateCommission(types, isDeduct, startOfLastMonth, today, 1);
    } else if (isDuringNAC) {
      lastMonthPayout += await calculateCommission(types, isDeduct, startOfLastMonth, endOfLastMonth, false, 1);
      currentMonthEarning = 0;
      pendingPayment += await calculateCommission(types, isDeduct, startOfCurrentMonth, endOfCurrentMonth, false, 3);
    } else {
      lastMonthPayout += await calculateCommission(types, isDeduct, startOfLastMonth, endOfLastMonth, false, 1);
      currentMonthEarning += await calculateCommission(types, isDeduct, startOfCurrentMonth, endOfCurrentMonth, false, 2);
    }
  }

  return {
    lastMonthPayout: +lastMonthPayout.toFixed(2),
    currentMonthEarning: +currentMonthEarning.toFixed(2),
    pendingPayment: +pendingPayment.toFixed(2),
  };
}

function formatDateTimeFromTimestamp(timestamp, timeZone = 'UTC') {
  const date = new Date(timestamp * 1000); // Convert from seconds to milliseconds

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);

  const getPart = (type) => parts.find((p) => p.type === type)?.value;

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = getPart('hour');
  const minute = getPart('minute');
  const second = getPart('second');

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

module.exports = {
  checkAuthorization,
  adminAuthorization,
  adminAuthorizationNew,
  authMiddleware,
  getAuthUser,
  randomToken,
  findAvailableSpace,
  Qry,
  settings_data,
  binary_tree_get_users,
  binary_tree_get_users_data,
  current_month_active_referrals_function,
  current_month_organization_members_function,
  current_month_organization_points_function,
  current_month_referral_points_function,
  pre_month_active_referrals_function,
  pre_month_organization_members_function,
  pre_month_organization_points_function,
  pre_month_referral_points_function,
  sendDataToRoute,
  emptyArray,
  manualLoginAuthorization,
  currentMonthFun,
  total_payment_function,
  total_payment_function1,
  Grand_total_payment_function,
  pendng_commission,
  newSalesFunction,
  createDefaultTagsAndMessages,
  total_payment_function_afcm_tbl,
  formatDateTimeFromTimestamp,
  get_dashboard_affiliate_summary,
};
