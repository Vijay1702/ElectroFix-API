import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { errorResponse } from '../utils/response';
import { MESSAGES } from '../constants/messages.constants';

export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return errorResponse(
          res,
          MESSAGES.GENERAL.VALIDATION_ERROR,
          400,
          error.issues.map((e: any) => ({
            path: e.path.join('.'),
            message: e.message,
          }))
        );
      }
      next(error);
    }
  };
};
