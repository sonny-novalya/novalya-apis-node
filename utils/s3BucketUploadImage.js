const AWS = require('aws-sdk');

const s3 = new AWS.S3({
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1'
})

const UploadImageOnS3Bucket = async (imageData, folder, imageId) => {
    try {
            const imageExtension = imageData.match(/^data:image\/([a-z]+);base64,/)?.[1] || 'jpg';
            const imageBuffer = Buffer.from(imageData.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');

            const uploadParams = {
                Bucket: 'novalya-assets',
                Key: `images/${folder}/${imageId}.${imageExtension}`,
                Body: imageBuffer
            };
      
            const uploadResult = await s3.upload(uploadParams).promise();
            return uploadResult.Location;
    } catch (error) {
        console.error('Error processing image data:', error);
    }
}

module.exports = UploadImageOnS3Bucket;