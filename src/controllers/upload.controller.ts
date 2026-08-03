import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { successResponse } from '../utils/response';
import { MESSAGES } from '../constants/messages.constants';
import { matchesFileSignature } from '../utils/file-signature';
import { safeUploadType } from '../middlewares/upload.middleware';

export const uploadFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw { statusCode: 400, message: 'No file uploaded' };
    }

    const buffer = fs.readFileSync(req.file.path);
    if (!matchesFileSignature(buffer, req.file.mimetype)) {
      fs.unlink(req.file.path, () => {});
      throw { statusCode: 400, message: MESSAGES.UPLOAD.INVALID_TYPE };
    }

    const fileUrl = `/uploads/${safeUploadType(req)}/${req.file.filename}`;

    return successResponse(res, { fileUrl }, MESSAGES.UPLOAD.SUCCESS);
  } catch (error) {
    next(error);
  }
};
