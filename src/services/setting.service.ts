import prisma from '../config/prisma.config';
import { MESSAGES } from '../constants/messages.constants';

export const getSettings = async () => {
  return prisma.setting.findMany();
};

export const updateSetting = async (key: string, value: string) => {
  const setting = await prisma.setting.findUnique({
    where: { settingKey: key },
  });

  if (!setting) {
    throw { statusCode: 404, message: MESSAGES.SETTING.FETCHED };
  }

  return prisma.setting.update({
    where: { settingKey: key },
    data: { settingValue: value },
  });
};

export const getSettingByKey = async (key: string) => {
  return prisma.setting.findUnique({
    where: { settingKey: key },
  });
};
