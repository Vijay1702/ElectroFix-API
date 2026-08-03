import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../utils/response';
import { MESSAGES } from '../constants/messages.constants';

export const uploadFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw { statusCode: 400, message: 'No file uploaded' };
    }
    
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const fileUrl = `data:${req.file.mimetype};base64,${b64}`;
    
    return successResponse(res, { fileUrl }, MESSAGES.UPLOAD.SUCCESS);
  } catch (error) {
    next(error);
  }
};
