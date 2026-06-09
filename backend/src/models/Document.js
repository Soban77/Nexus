import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  contentType: { type: String, required: true },
  size: { type: Number, required: true },
  description: { type: String },
  version: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'approved', 'archived'],
    default: 'draft'
  },
  storageProvider: {
    type: String,
    enum: ['local', 's3'],
    required: true
  },
  url: { type: String, required: true },
  s3Key: { type: String },
  localPath: { type: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  signatureUrl: { type: String },
  signatureStorageProvider: { type: String, enum: ['local', 's3'] },
  signatureFileKey: { type: String },
  signatureUploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  signatureUploadedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

documentSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const Document = mongoose.model('Document', documentSchema);
export default Document;
