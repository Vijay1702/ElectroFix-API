import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express.d';
import * as attendanceService from '../services/attendance.service';
import { successResponse } from '../utils/response';

export const getAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { date, employeeId, month, year } = req.query;
    const userRole = req.user?.role;
    const resolvedEmployeeId = userRole === 'ADMIN' ? (employeeId as string) : req.user?.id;

    const records = await attendanceService.getAttendance({
      date: date as string,
      employeeId: resolvedEmployeeId,
      month: month ? parseInt(month as string, 10) : undefined,
      year: year ? parseInt(year as string, 10) : undefined,
    });
    return successResponse(res, records, 'Attendance logs retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const saveAttendanceBulk = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { date, records } = req.body;
    const adminId = req.user?.id;
    if (!adminId) {
      throw { statusCode: 401, message: 'Unauthorized action' };
    }
    const result = await attendanceService.saveAttendanceBulk(date, records, adminId);
    return successResponse(res, result, 'Attendance marked successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getPayroll = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month ? parseInt(month as string, 10) : new Date().getUTCMonth() + 1;
    const currentYear = year ? parseInt(year as string, 10) : new Date().getUTCFullYear();

    const payroll = await attendanceService.getPayroll(currentMonth, currentYear);
    return successResponse(res, payroll, 'Payroll and salaries calculated successfully');
  } catch (error) {
    next(error);
  }
};
