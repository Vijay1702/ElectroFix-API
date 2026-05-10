import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../utils/response';
import { MESSAGES } from '../constants/messages.constants';

export const uploadFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw { statusCode: 400, message: 'No file uploaded' };
    }
    
    const { type } = req.params;
    const fileUrl = `/uploads/${type || 'general'}/${req.file.filename}`;
    
    return successResponse(res, { fileUrl }, MESSAGES.UPLOAD.SUCCESS);
  } catch (error) {
    next(error);
  }
};
