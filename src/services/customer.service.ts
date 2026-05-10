import * as customerRepository from '../repositories/customer.repository';
import { MESSAGES } from '../constants/messages.constants';
import { generateCustomerCode } from '../utils/generate-code';

export const getCustomers = async (pagination: any) => {
  const { skip, limit } = pagination;
  const customers = await customerRepository.list({ skip, take: limit });
  const total = await customerRepository.count();

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
