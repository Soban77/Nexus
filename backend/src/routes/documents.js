import express from 'express';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { authenticate } from '../middleware/auth.js';
import Document from '../models/Document.js';
import CollaborationRequest from '../models/CollaborationRequest.js';
import { upload, localUploadRoot, localDocumentDir, localSignatureDir } from '../config/storage.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const hasS3Config = Boolean(
  process.env.AWS_S3_BUCKET_NAME &&
  process.env.AWS_REGION &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY
);

const getS3Client = () => {
  if (!hasS3Config) return null;
  return new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
};

const s3Client = getS3Client();
const bucketName = process.env.AWS_S3_BUCKET_NAME;

const getLocalUrl = (filePath) => {
  const relativePath = path.relative(path.resolve(__dirname, '../../'), filePath).replace(/\\/g, '/');
  return `/${relativePath}`;
};

const uploadS3 = async ({ buffer, key, contentType }) => {
  if (!s3Client || !bucketName) {
    throw new Error('AWS S3 configuration is missing');
  }

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType
    })
  );

  return key;
};

const getSignedS3Url = async (key) => {
  if (!s3Client || !bucketName) {
    throw new Error('AWS S3 configuration is missing');
  }
  const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
};

const generateKey = (userId, originalName, folder) => {
  const timestamp = Date.now();
  const sanitized = originalName.replace(/\s+/g, '_');
  return `${folder}/${userId}/${timestamp}-${sanitized}`;
};

const serializeDocument = (doc, req) => {
  const docObject = doc.toObject({ getters: true });
  if (docObject.storageProvider === 'local' && docObject.localPath) {
    docObject.previewUrl = `${req.protocol}://${req.get('host')}${docObject.url}`;
  } else if (docObject.storageProvider === 's3' && docObject.s3Key) {
    docObject.previewUrl = docObject.url;
  }
  return docObject;
};

router.get('/', authenticate, async (req, res) => {
  try {
    const documents = await Document.find({ uploadedBy: req.user._id }).sort({ createdAt: -1 });
    return res.json({ documents: documents.map((doc) => serializeDocument(doc, req)) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load documents', message: error.message });
  }
});

router.get('/user/:userId', authenticate, async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  try {
    const isOwner = req.user._id.equals(userId);
    let canView = isOwner;

    if (!canView && req.user.role === 'investor') {
      const accepted = await CollaborationRequest.findOne({
        investor: req.user._id,
        entrepreneur: userId,
        status: 'accepted'
      });
      canView = Boolean(accepted);
    }

    if (!canView) {
      return res.json({ documents: [], access: 'restricted' });
    }

    const documents = await Document.find({ uploadedBy: userId }).sort({ createdAt: -1 });
    return res.json({ documents: documents.map((doc) => serializeDocument(doc, req)), access: 'granted' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load documents', message: error.message });
  }
});

router.post('/upload', authenticate, upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Document file is required' });
  }

  try {
    const { description, status, version } = req.body;
    let storageProvider = 'local';
    let url = req.file.path ? getLocalUrl(req.file.path) : '';
    let localPath = req.file.path;
    let s3Key;

    if (hasS3Config) {
      const key = generateKey(req.user._id, req.file.originalname, 'documents');
      await uploadS3({ buffer: req.file.buffer, key, contentType: req.file.mimetype });
      storageProvider = 's3';
      s3Key = key;
      url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      localPath = undefined;
    }

    const document = new Document({
      fileName: req.file.originalname,
      contentType: req.file.mimetype,
      size: req.file.size,
      description,
      version: Number(version) || 1,
      status: status || 'draft',
      storageProvider,
      url,
      s3Key,
      localPath,
      uploadedBy: req.user._id
    });

    await document.save();
    return res.status(201).json({ document: serializeDocument(document, req) });
  } catch (error) {
    return res.status(500).json({ error: 'Document upload failed', message: error.message });
  }
});

router.post('/:id/signature', authenticate, upload.single('signature'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Signature image is required' });
  }

  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    let signatureStorageProvider = 'local';
    let signatureUrl = req.file.path ? getLocalUrl(req.file.path) : '';
    let signatureFileKey;

    if (hasS3Config) {
      const signatureKey = generateKey(req.user._id, req.file.originalname, 'signatures');
      await uploadS3({ buffer: req.file.buffer, key: signatureKey, contentType: req.file.mimetype });
      signatureStorageProvider = 's3';
      signatureFileKey = signatureKey;
      signatureUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${signatureKey}`;
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }

    document.signatureUrl = signatureUrl;
    document.signatureStorageProvider = signatureStorageProvider;
    document.signatureFileKey = signatureFileKey;
    document.signatureUploadedBy = req.user._id;
    document.signatureUploadedAt = new Date();
    await document.save();

    return res.json({ document: serializeDocument(document, req) });
  } catch (error) {
    return res.status(500).json({ error: 'Signature upload failed', message: error.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const allowedFields = ['description', 'status', 'version'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    const document = await Document.findOneAndUpdate(
      { _id: req.params.id, uploadedBy: req.user._id },
      updates,
      { new: true, runValidators: true }
    );

    if (!document) {
      return res.status(404).json({ error: 'Document not found or access denied' });
    }

    return res.json({ document: serializeDocument(document, req) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update document', message: error.message });
  }
});

router.get('/:id/preview', authenticate, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!document.uploadedBy.equals(req.user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (document.storageProvider === 's3' && document.s3Key) {
      const previewUrl = await getSignedS3Url(document.s3Key);
      return res.json({ previewUrl });
    }

    return res.json({ previewUrl: `${req.protocol}://${req.get('host')}${document.url}` });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate preview', message: error.message });
  }
});

export default router;
