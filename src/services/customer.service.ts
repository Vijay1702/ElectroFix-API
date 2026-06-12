import * as customerRepository from '../repositories/customer.repository';
import { MESSAGES } from '../constants/messages.constants';
import { generateCustomerCode } from '../utils/generate-code';
import prisma from '../config/prisma.config';

export const getCustomers = async (pagination: any, search?: string, startDate?: string, endDate?: string) => {
  const { skip, limit, all } = pagination;
  
  const where: any = {};
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { phoneNumber: { contains: search, mode: 'insensitive' } },
      { customerCode: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
       const end = new Date(endDate);
       end.setHours(23, 59, 59, 999);
       where.createdAt.lte = end;
    }
  }

  const customers = await customerRepository.list({
    ...(all ? {} : { skip, take: limit }),
    where
  });
  const total = await customerRepository.count(where);

  return { customers, total };
};

export const getCustomerById = async (id: string) => {
  const customer = await customerRepository.findById(id);

  if (!customer) {
    throw { statusCode: 404, message: MESSAGES.CUSTOMER.NOT_FOUND };
  }

  return customer;
};

export const createCustomer = async (payload: any) => {
  if (payload.phoneNumber) {
    const existing = await prisma.customer.findUnique({
      where: { phoneNumber: payload.phoneNumber }
    });
    if (existing) {
      throw { statusCode: 400, message: "A customer with this phone number already exists." };
    }
  }

  const customerCode = await generateCustomerCode();
  
  return customerRepository.create({
    ...payload,
    customerCode,
  });
};

export const updateCustomer = async (id: string, payload: any) => {
  const customer = await customerRepository.findById(id);
  if (!customer) {
    throw { statusCode: 404, message: MESSAGES.CUSTOMER.NOT_FOUND };
  }

  if (payload.phoneNumber && payload.phoneNumber !== customer.phoneNumber) {
    const existing = await prisma.customer.findUnique({
      where: { phoneNumber: payload.phoneNumber }
    });
    if (existing && existing.id !== id) {
      throw { statusCode: 400, message: "A customer with this phone number already exists." };
    }
  }

  return customerRepository.update(id, payload);
};

export const deleteCustomer = async (id: string) => {
  const customer = await customerRepository.findById(id);
  if (!customer) {
    throw { statusCode: 404, message: MESSAGES.CUSTOMER.NOT_FOUND };
  }

  return customerRepository.remove(id);
};

export const getCustomerHistory = async (id: string) => {
  const history = await customerRepository.getHistory(id);
  if (!history) {
    throw { statusCode: 404, message: MESSAGES.CUSTOMER.NOT_FOUND };
  }

  return history;
};
