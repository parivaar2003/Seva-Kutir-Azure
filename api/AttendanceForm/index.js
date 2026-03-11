const { BlobServiceClient } = require("@azure/storage-blob");
const multipart = require("parse-multipart-data");
const { randomUUID } = require("crypto");

module.exports = async function (context, req) {

  context.log("Kutir Attendance submission started");

  try {

    /* ---------------- PARSE MULTIPART FORM ---------------- */

    const contentType = req.headers["content-type"];

    if (!contentType) {
      throw new Error("Missing content-type header");
    }

    const boundary = multipart.getBoundary(contentType);

    let bodyBuffer;
    
    if (Buffer.isBuffer(req.body)) {
      bodyBuffer = req.body;
    }
    else if (typeof req.body === "string") {
      bodyBuffer = Buffer.from(req.body);
    }
    else if (req.rawBody) {
      bodyBuffer = Buffer.from(req.rawBody);
    }
    else {
      throw new Error("Unable to read multipart body");
    }
    
    const parts = multipart.parse(bodyBuffer, boundary);

    const fields = {};
    const uploadedPhotos = []; 

    for (const part of parts) {
      if (part.filename) {
        // Collect all uploaded photos into an array
        uploadedPhotos.push({
          data: part.data,
          filename: part.filename,
          fieldName: part.name 
        });
      } else {
        fields[part.name] = part.data.toString();
      }
    }

    /* ---------------- VALIDATION ---------------- */

    const requiredFields = [
      "email",
      "teacherName",
      "teacherPhone",
      "shift",
      "attendanceCount",
      "state",
      "district",
      "cluster",
      "kutirName",
      "kutirType"
    ];

    for (const field of requiredFields) {
      if (!fields[field]) {
        throw new Error(`Missing field: ${field}`);
      }
    }

    // Ensure the mandatory first photo exists
    const hasFirstPhoto = uploadedPhotos.some(p => p.fieldName === "studentPhoto");
    if (!hasFirstPhoto) {
      throw new Error("Student photo 1 is missing");
    }

    /* ---------------- BLOB UPLOAD ---------------- */

    const connection = process.env.ParivaarStorageConnectionString;

    const blobServiceClient = BlobServiceClient.fromConnectionString(connection);

    const containerClient = blobServiceClient.getContainerClient("kutir-student-photos");

    await containerClient.createIfNotExists();

    const submissionId = randomUUID();
    const photoUrls = {};

    // Loop through all found photos and upload them
    for (const photo of uploadedPhotos) {
      // Append fieldName (studentPhoto, studentPhoto2, etc.) to keep filenames unique
      const blobName = `${submissionId}-${photo.fieldName}-${photo.filename}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.uploadData(photo.data);
      
      // Store the resulting URL in our mapping object
      photoUrls[photo.fieldName] = blockBlobClient.url;
      context.log(`Uploaded ${photo.fieldName}:`, blockBlobClient.url);
    }

    /* ---------------- PREPARE PAYLOAD ---------------- */

    const finalPayload = {
      id: submissionId,
      ...fields,
      ...photoUrls // Includes studentPhoto, and optionally studentPhoto2/3
    };

    /* ---------------- QUEUE OUTPUT BINDING ---------------- */

    context.bindings.outputQueueItem = JSON.stringify(finalPayload);

    /* ---------------- TABLE OUTPUT BINDING ---------------- */

    context.bindings.outputBackupTable = {
      partitionKey: fields.state,
      rowKey: submissionId,
      ...finalPayload
    };

    context.log("Queue + Table bindings prepared with multiple photos");

    /* ---------------- RESPONSE ---------------- */

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        message: "Attendance submitted successfully",
        id: submissionId
      }
    };

  } catch (err) {

    context.log("ERROR:", err);

    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: {
        error: err.message
      }
    };
  }
};
