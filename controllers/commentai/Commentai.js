const axios = require("axios");

const apiKey = "";
const chosenModel = "gpt-4o-mini";
global.length = "";
global.fbContent = "";
global.style = "";
global.prompt = "";
global.diff = "";
global.language = ""; // Set to 'Auto detect' by default
global.tone = ""; // Added missing tone variable
global.writing = ""; // Corrected typo
global.opinion = "";
global.gender = "";
global.post_gender = "";

global.size = "";
global.emoji = "";
global.repPrompt = "";
global.emoji_add = "";
global.postContent = "";
global.preContent = "";
global.frenchGuide = "";
global.frenchguidetu = "";
global.frenchguidevous = "";

const commentGenerate = async (request, res) => {
  const user_id = request.authUser;
  const { temp, text } = request.body;

  global.tone = temp.tone ? temp.tone.join(",") : "Agreed";
  writing = temp.writing ? temp.writing.join(",") : "Academic"; // Corrected typo
  opinion = temp.opinion || "Funny";
  gender = temp.gender || "MALE";
  post_gender = temp.post_gender || "MALE";
  size = temp.size || "Short";
  language = temp.language || "Auto detect"; // Set to 'Auto detect' by default
  fbContent = text;
  emoji = temp.emoji || "No";
  length = size;
  postContent = "";
  if (emoji === "Yes") {
    emoji_add =
      "EMOJI: ADD EMOJI/EMOJIES IN BETWEEN RESPONSE OR RANDOMLY BASED ON THE TONE";
  } else {
    emoji_add = "DO NOT USE EMOJIES IN RESPONSE ommiting the label or prefix.";
  }

  if (language === "Auto detect") {
    const detectLanguagePrompt = `
        Detect the language of content below:

        Content: "${fbContent}"

        Output just the language.
        `;

    const languageDetectedResponse = await generateResponse(
      detectLanguagePrompt
    );
    language = languageDetectedResponse.toLowerCase();
  }

  opinion = opinion;
  tone = tone;
  style = writing;

  // Added missing lowerCount and upperCount variables
  let lowerCount, upperCount;
  if (length.toLowerCase() === "short") {
    lowerCount = 50;
    upperCount = 110;
  } else if (length.toLowerCase() === "medium") {
    lowerCount = 120;
    upperCount = 200;
  } else if (length.toLowerCase() === "long") {
    lowerCount = 400;
    upperCount = 500;
  }

  prompt = `
    Generate a thoughtful and respectful comment with the Writing Style: ${style} that reflects a ${opinion} sentiment towards the following description text: ${fbContent}. The comment should be informative, concise, and engaging, with a tone ${tone} and aligned with the context of the description text.  ${emoji_add} to complement the sentiment and make the comment more relatable. 
    strictly ensure to maintain the comment  MUST be MORE than ${lowerCount} characters and LESS than ${upperCount} characters, with correct grammar and clear sentence structure. 
    The goal is to create a comment that adds value to the conversation and encourages further discussion. Please respond in ${language.toUpperCase()}
    DO NOT Include a call to action
    !!! Do NOT REPEATE THE Facebook POST itself, GENERATE A DIFFERENT REPLY FOR IT INSTEAD !!!
    `;

  frenchguide = `
    *Instructions for ChatGPT: Using "You" Pronoun in French*
  
    It's essential to correctly use the French pronouns "Tu" or "Vous" based on the level of formality and the number of people addressed. Here are some examples to guide you:
  
    1. *Tu (singular, informal):*
      - Example: Tu viens ce soir ? (Are you coming tonight?)
  
    2. *Vous (singular or plural, formal or plural):
      - Example (singular, formal): Vous avez une réservation. (You have a reservation.
      - Example (plural, formal or informal): Vous êtes tous invités. (You are all invited.)
  
    Please ensure that the generated comments align with the pronouns, considering factors like formality, number, and the relationships between the users on Facebook.
  `;

  frenchguidetu = `
  *Instructions for ChatGPT: Using "You" Pronoun in French*

  It's essential to correctly use the French pronoun "Tu" based on the level of formality and the number of people addressed. Here are some examples to guide you:

  1. *Tu (singular, informal):*
    - Example: Tu viens ce soir ? (Are you coming tonight?)

  Please ensure that the generated comments align with this pronoun, considering factors like formality, number, and the relationships between the users on Facebook.

`;

  frenchguidevous = ` *Instructions for ChatGPT: Using "You" Pronoun in French*
It's essential to correctly use the French pronoun "Vous" based on the level of formality and the number of people addressed. Here are some examples to guide you:

1. *Vous (singular or plural, formal or plural):
  - Example (singular, formal): Vous avez une réservation. (You have a reservation.
  - Example (plural, formal or informal): Vous êtes tous invités. (You are all invited.)

Please ensure that the generated comments align with this pronoun, considering factors like formality, number, and the relationships between the users on Facebook. 
`;

  if (language.toLowerCase() === "french") {
    prompt = frenchGuide + prompt;
  } else if (language.toLowerCase() === "french(tu)") {
    prompt = frenchguidetu + prompt;
  } else if (language.toLowerCase() === "french(vous)") {
    prompt = frenchguidevous + prompt;
  }
  preContent = await generateResponse(prompt);

  // repPrompt = `
  //   Previous response:

  //   ${preContent}
  //   ${emoji_add}

  //   In ${language} rewrite and just \`\`\`${diff} the LENGTH  in characters \`\`\`, make it APPROXIMATELY ${lowerCount} to ${upperCount} in characters length.  
  //   ### Print just the response.

  //   ### Caution: Keep the LANGUAGE, Style and Other features SAME from the previous response. ###
  //   `;

  // repPrompt = `Previous response:

  // ${preContent}

  // In ${language} rewrite and just \`\`\`${diff} the LENGTH SLIGHTLY in characters , make it APPROXIMATELY """, str(lower_count) ,""" to """, str(upper_count) ,""" in characters length.  \n ### Print just the response.

  // ###Caution: Keep the LANGUAGE, Style and Other features SAME from previous response. ###
  // `;

  // if (length.toLowerCase() === "short") {
  //   if (preContent.length < 50) {
  //     postContent = await repeatedResponse(
  //       length,
  //       preContent,
  //       repPrompt,
  //       "INCREASE"
  //     );
  //     //res.status(200).json({ status: 'success', data: postContent });
  //   } else if (preContent.length > 150) {
  //     postContent = await repeatedResponse(
  //       length,
  //       preContent,
  //       repPrompt,
  //       "DECREASE"
  //     );
  //     //res.status(200).json({ status: 'success', data: postContent });
  //   } else {
  //     //res.status(200).json({ status: 'success', data: preContent });
  //   }
  // } else if (length.toLowerCase() === "medium") {
  //   if (preContent.length < 175) {
  //     postContent = await repeatedResponse(
  //       length,
  //       preContent,
  //       repPrompt,
  //       "INCREASE"
  //     );
  //     //res.status(200).json({ status: 'success', data: postContent });
  //   } else if (preContent.length > 325) {
  //     postContent = await repeatedResponse(
  //       length,
  //       preContent,
  //       repPrompt,
  //       "DECREASE"
  //     );
  //     //res.status(200).json({ status: 'success', data: postContent });
  //   } else {
  //     //res.status(200).json({ status: 'success', data: preContent });
  //   }
  // } else if (length.toLowerCase() === "long") {
  //   if (preContent.length < 350) {
  //     postContent = await repeatedResponse(
  //       length,
  //       preContent,
  //       repPrompt,
  //       "INCREASE"
  //     );
  //     // res.status(200).json({ status: 'success', data: postContent });
  //   } else if (preContent.length > 550) {
  //     postContent = await repeatedResponse(
  //       length,
  //       preContent,
  //       repPrompt,
  //       "DECREASE"
  //     );
  //     // res.status(200).json({ status: 'success', data: postContent });
  //   } else {
  //     // res.status(200).json({ status: 'success', data: preContent });
  //   }
  // }

  if (postContent.length != 0) {
    preContent = postContent;
  }
  if (preContent.includes("#")) {
    preContent = await hashTagRemover(preContent);
  }
  res.status(200).json({ status: "success", data: preContent });
};

async function hashTagRemover(commentWithHash) {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: chosenModel,
      messages: [
        {
          role: "system",
          content:
            "Remove the hashtags with words from the content and print the rest.",
        },
        { role: "user", content: commentWithHash },
      ],
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  return response.data.choices[0].message.content;
}
async function generateResponse(prompt) {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: chosenModel,
      messages: [{ role: "system", content: prompt }],
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  return response.data.choices[0].message.content;
}

// async function repeatedResponse(length, preContent, repPrompt, diff) {
//   if (length.toLowerCase() === "short") {
//     lowerCount = 50;
//     upperCount = 150;
//   } else if (length.toLowerCase() === "medium") {
//     lowerCount = 175;
//     upperCount = 300;
//   } else if (length.toLowerCase() === "long") {
//     lowerCount = 400;
//     upperCount = 500;
//   }
//   let content;
//   repPrompt = `
// Previous response:

// ${preContent}

// In ${language} rewrite and just \`\`\`${diff} the LENGTH  in characters \`\`\`, make it APPROXIMATELY ${lowerCount} to ${upperCount} in characters length.  
// ### Print just the response.

// ### Caution: Keep the LANGUAGE, Style and Other features SAME from the previous response. ###
// `;

//   while (true) {
//     const response = await axios.post(
//       "https://api.openai.com/v1/chat/completions",
//       {
//         model: chosenModel,
//         messages: [{ role: "system", content: repPrompt }],
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${apiKey}`,
//         },
//       }
//     );

//     content = response.data.choices[0].message.content;

//     if (
//       length.toLowerCase() === "short" &&
//       content.length > 50 &&
//       content.length < 150
//     ) {
//       break;
//     } else if (
//       length.toLowerCase() === "medium" &&
//       content.length > 175 &&
//       content.length < 325
//     ) {
//       break;
//     } else if (
//       length.toLowerCase() === "long" &&
//       content.length > 350 &&
//       content.length < 550
//     ) {
//       break;
//     }

//   }

//   return content;
// }

module.exports = { commentGenerate };
