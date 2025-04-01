const AWS = require('aws-sdk');
const { Sequelize, Novadata } = require("../Models");
const Op = Sequelize.Op;

const s3 = new AWS.S3({
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1'
})

// const ProcessBase64ImageDataFunc = async (limit) => {
//     try {
//         const novadataRecords = await Novadata.findAll({
//             where: {
//                 // user_id: userIds,
//                 image: {
//                     [Op.like]: `%data:image/%`
//                 }
//             },
//             limit: limit
//         });

//         for (const novadataRecord of novadataRecords) {
//             const imageExtension = novadataRecord.image.match(/^data:image\/([a-z]+);base64,/)?.[1] || 'jpg';
//             const imageBuffer = Buffer.from(novadataRecord.image.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');

//             const uploadParams = {
//                 Bucket: 'novalya-assets',
//                 Key: `images/facebook/${novadataRecord.id}.${imageExtension}`,
//                 Body: imageBuffer
//             };
      
//             const uploadResult = await s3.upload(uploadParams).promise();
//             novadataRecord.image = uploadResult.Location;
//             await novadataRecord.save();
//         }
//     } catch (error) {
//         console.error('Error processing image data:', error);
//     }
// }
const ProcessBase64ImageDataFunc = async (limit) => {
    const BASE64_REGEX = /^data:(image|text)\/([a-zA-Z]+);base64,/; // Fixed regex
    const BUCKET_NAME = 'novalya-assets';
    const IMAGE_PATH = 'images/facebook/';

    try {
        const novadataRecords = await Novadata.findAll({
            where: {
                [Op.or]: [
                    { image: { [Op.like]: `%data:image/%` } },
                    { image: { [Op.like]: `%data:text/%` } }
                ]
            },
            limit: limit
        });

        if (novadataRecords.length === 0) {
            console.log('No records found for processing.');
            return;
        }

        await Promise.all(
            novadataRecords.map(async (novadataRecord) => {
                try {
                    const match = novadataRecord.image.match(BASE64_REGEX);
                    if (!match) {
                        console.log(`Skipping record ID ${novadataRecord.id}: Not a valid Base64 format.`);
                        return;
                    }

                    const fileType = match[1]; // 'image' or 'text'
                    const fileExtension = match[2] || (fileType === 'image' ? 'jpg' : 'txt'); // Default to jpg/txt

                    // Convert base64 data to Buffer
                    const imageBuffer = Buffer.from(
                        novadataRecord.image.replace(BASE64_REGEX, ''),
                        'base64'
                    );

                    // Upload parameters
                    const uploadParams = {
                        Bucket: BUCKET_NAME,
                        Key: `${IMAGE_PATH}${novadataRecord.id}.${fileExtension}`,
                        Body: imageBuffer
                    };

                    // Upload to S3
                    const uploadResult = await s3.upload(uploadParams).promise();

                    // Update record with the S3 image location
                    novadataRecord.image = uploadResult.Location;
                    await novadataRecord.save();

                    console.log(`Successfully processed record ID ${novadataRecord.id}`);

                } catch (recordError) {
                    console.error(`Error processing record ID ${novadataRecord.id}:`, recordError);
                }
            })
        );

    } catch (error) {
        console.error('Error processing image data:', error);
    }
};



module.exports = ProcessBase64ImageDataFunc;