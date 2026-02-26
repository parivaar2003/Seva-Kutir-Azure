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
    let imageBuffer = null;
    let imageName = null;

    for (const part of parts) {

      if (part.filename) {
        imageBuffer = part.data;
        imageName = part.filename;
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
      "kutirType"
    ];

    for (const field of requiredFields) {
      if (!fields[field]) {
        throw new Error(`Missing field: ${field}`);
      }
    }

    if (!imageBuffer) {
      throw new Error("Student photo missing");
    }

    /* ---------------- BLOB UPLOAD ---------------- */

    const connection =
      process.env.ParivaarStorageConnectionString;

    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connection);

    const containerClient =
      blobServiceClient.getContainerClient("kutir-student-photos");

    await containerClient.createIfNotExists();

    const submissionId = randomUUID();

    const blobName = `${submissionId}-${imageName}`;

    const blockBlobClient =
      containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(imageBuffer);

    const imageUrl = blockBlobClient.url;

    context.log("Image uploaded:", imageUrl);

    /* ---------------- QUEUE OUTPUT BINDING ---------------- */

    const queuePayload = {
      id: submissionId,
      ...fields,
      imageUrl
    };

    context.bindings.outputQueueItem =
      JSON.stringify(queuePayload);

    /* ---------------- TABLE OUTPUT BINDING ---------------- */

    context.bindings.outputBackupTable = {
      partitionKey: fields.state,
      rowKey: submissionId,

      ...fields,
      imageUrl
    };

    context.log("Queue + Table bindings prepared");

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
