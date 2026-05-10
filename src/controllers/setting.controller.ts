import { Request, Response, NextFunction } from 'express';
import * as settingService from '../services/setting.service';
import { successResponse } from '../utils/response';
import { MESSAGES } from '../constants/messages.constants';

export const getSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await settingService.getSettings();
    return successResponse(res, settings, MESSAGES.SETTING.FETCHED);
  } catch (error) {
    next(error);
  }
};

export const updateSetting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key, value } = req.body;
    const setting = await settingService.updateSetting(key, value);
    return successResponse(res, setting, MESSAGES.SETTING.UPDATED);
  } catch (error) {
    next(error);
  }
};
