import prisma from '../config/prisma.config';

const getStartOfDay = (dateInput: string | Date) => {
  const date = new Date(dateInput);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

export const getAttendance = async (filters: { date?: string; employeeId?: string; month?: number; year?: number }) => {
  const { date, employeeId, month, year } = filters;
  const where: any = {};

  if (date) {
    where.attendanceDate = getStartOfDay(date);
  } else if (month && year) {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));
    where.attendanceDate = {
      gte: startDate,
      lt: endDate,
    };
  }

  if (employeeId) {
    where.employeeId = employeeId;
  }

  return prisma.attendance.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: { select: { name: true } },
        },
      },
    },
    orderBy: { attendanceDate: 'desc' },
  });
};

export const saveAttendanceBulk = async (date: string, records: { employeeId: string; status: string }[], createdBy: string) => {
  const normalizedDate = getStartOfDay(date);
  
  const savedRecords = [];
  for (const record of records) {
    // Validate employee exists and is active
    const employee = await prisma.user.findUnique({
      where: { id: record.employeeId },
    });
    if (!employee) continue;

    const upserted = await prisma.attendance.upsert({
      where: {
        employeeId_attendanceDate: {
          employeeId: record.employeeId,
          attendanceDate: normalizedDate,
        },
      },
      update: {
        status: record.status,
        createdBy,
      },
      create: {
        employeeId: record.employeeId,
        attendanceDate: normalizedDate,
        status: record.status,
        createdBy,
      },
    });
    savedRecords.push(upserted);
  }
  return savedRecords;
};

export const getPayroll = async (month: number, year: number) => {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));

  // Get all technicians (or employees with daily salary set)
  const employees = await prisma.user.findMany({
    where: {
      role: { name: 'TECHNICIAN' },
      // Include historical users (even Inactive ones, so historical payroll matches)
    },
    include: {
      role: { select: { name: true } },
    },
  });

  const payrollList = [];
  let totalPayrollCost = 0;

  for (const emp of employees) {
    // Get present count
    const presentCount = await prisma.attendance.count({
      where: {
        employeeId: emp.id,
        attendanceDate: {
          gte: startDate,
          lt: endDate,
        },
        status: 'Present',
      },
    });

    // Get absent count
    const absentCount = await prisma.attendance.count({
      where: {
        employeeId: emp.id,
        attendanceDate: {
          gte: startDate,
          lt: endDate,
        },
        status: 'Absent',
      },
    });

    const perDaySalary = Number(emp.perDaySalary) || 0;
    const totalSalary = presentCount * perDaySalary;
    totalPayrollCost += totalSalary;

    payrollList.push({
      employeeId: emp.id,
      fullName: emp.fullName,
      email: emp.email,
      role: emp.role?.name || 'TECHNICIAN',
      perDaySalary,
      presentDays: presentCount,
      absentDays: absentCount,
      totalSalary,
      operationalStatus: emp.operationalStatus,
    });
  }

  return {
    month,
    year,
    employeesCount: employees.length,
    totalPayrollCost,
    payroll: payrollList,
  };
};
