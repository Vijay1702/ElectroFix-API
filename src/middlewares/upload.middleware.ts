import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request } from 'express';
import { MESSAGES } from '../constants/messages.constants';

const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

// req.params.type comes straight from the URL (e.g. POST /uploads/:type) — sanitize
// it to a safe directory name so it can't be used to write outside UPLOADS_ROOT.
// Exported so controllers build the response URL from the same sanitized value
// the file was actually written under.
export const safeUploadType = (req: Request): string => {
  const type = String((req.params as any).type || 'misc').replace(/[^a-zA-Z0-9_-]/g, '');
  return type || 'misc';
};

// The stored filename's extension must come from this fixed map, not from the
// client-supplied original filename — otherwise a name like "x.pngexe" (which
// passes the unanchored-looking checks below via substring match) would end up
// persisted with an attacker-chosen extension on disk.
const EXTENSION_BY_MIMETYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
};

const storage = multer.diskStorage({
  destination: (req: Request, _file, cb) => {
    const dir = path.join(UPLOADS_ROOT, safeUploadType(req));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = EXTENSION_BY_MIMETYPE[file.mimetype] || '.bin';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = /^\.(jpe?g|png|pdf)$/;
  const allowedMimetypes = /^image\/(jpe?g|png)$|^application\/pdf$/;
  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedMimetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error(MESSAGES.UPLOAD.INVALID_TYPE));
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
});
