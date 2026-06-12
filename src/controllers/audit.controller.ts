import { Request, Response, NextFunction } from 'express';
import * as auditService from '../services/audit.service';

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filters = {
      menuName: req.query.menuName as string,
      action: req.query.action as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };

    const { logs, total } = await auditService.getAuditLogs({ skip, take: limit }, filters);

    res.json({
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};
