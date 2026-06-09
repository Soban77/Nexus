import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.resolve(__dirname, '../../uploads');
const documentsPath = path.join(uploadsRoot, 'documents');
const signaturesPath = path.join(uploadsRoot, 'signatures');

const createFolder = (folderPath) => {
  fs.mkdirSync(folderPath, { recursive: true });
};

const hasS3Config = Boolean(
  process.env.AWS_S3_BUCKET_NAME &&
  process.env.AWS_REGION &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY
);

const storage = hasS3Config
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const folder = file.fieldname === 'signature' ? signaturesPath : documentsPath;
        createFolder(folder);
        cb(null, folder);
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const sanitized = file.originalname.replace(/\s+/g, '_');
        cb(null, `${timestamp}-${sanitized}`);
      }
    });

const MAX_UPLOAD_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || '26214400', 10); // 25 MB

export const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_SIZE }
});

export const localUploadRoot = uploadsRoot;
export const localDocumentDir = documentsPath;
export const localSignatureDir = signaturesPath;
