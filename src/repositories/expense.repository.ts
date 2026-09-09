import prisma from '../config/prisma.config';

export const list = async (options: any = {}) => {
  return await prisma.expense.findMany({
    ...options,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      }
    }
  });
};

export const count = async (where: any = {}) => {
  return await prisma.expense.count({ where });
};

export const findById = async (id: string) => {
  return await prisma.expense.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      }
    }
  });
};

export const create = async (data: any) => {
  const expenseData = {
    ...data,
    expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date()
  };

  return await prisma.expense.create({
    data: expenseData,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      }
    }
  });
};

export const update = async (id: string, data: any) => {
  const expenseData = {
    ...data
  };

  if (data.expenseDate) {
    expenseData.expenseDate = new Date(data.expenseDate);
  }

  return await prisma.expense.update({
    where: { id },
    data: expenseData,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      }
    }
  });
};

export const remove = async (id: string) => {
  return await prisma.expense.delete({
    where: { id }
  });
};

export const getExpensesByDateRange = async (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return await prisma.expense.findMany({
    where: {
      expenseDate: {
        gte: start,
        lte: end
      }
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      }
    },
    orderBy: {
      expenseDate: 'desc'
    }
  });
};
