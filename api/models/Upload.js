const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mimeType: { type: String, required: true },
  blob: { type: Buffer, required: true },
});

const UploadModel = mongoose.model('Upload', uploadSchema);

module.exports = UploadModel;
