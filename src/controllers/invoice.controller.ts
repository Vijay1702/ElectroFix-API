import { Request, Response, NextFunction } from 'express';
import * as invoiceService from '../services/invoice.service';
import { successResponse, paginatedResponse } from '../utils/response';
import { MESSAGES } from '../constants/messages.constants';
import { parsePagination } from '../utils/pagination';
import { AuthRequest } from '../types/express.d';

export const getInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pagination = parsePagination(req);
    const { search, status } = req.query;
    const { invoices, total } = await invoiceService.getInvoices(pagination, {
      search: search as string,
      status: status as string
    });
    return paginatedResponse(res, invoices, total, pagination.page, pagination.limit, MESSAGES.INVOICE.FETCHED);
  } catch (error) {
    next(error);
  }
};

export const getInvoiceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.id as string);
    return successResponse(res, invoice, MESSAGES.INVOICE.FETCHED_ONE);
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const invoice = await invoiceService.createInvoice(req.body, userId);
    return successResponse(res, invoice, MESSAGES.INVOICE.CREATED, 201);
  } catch (error) {
    next(error);
  }
};

export const updateInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await invoiceService.updateInvoice(req.params.id as string, req.body);
    return successResponse(res, invoice, MESSAGES.INVOICE.UPDATED);
  } catch (error) {
    next(error);
  }
};

export const deleteInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await invoiceService.deleteInvoice(req.params.id as string);
    return successResponse(res, null, MESSAGES.INVOICE.DELETED);
  } catch (error) {
    next(error);
  }
};

export const generateInvoicePDF = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.id as string);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    // Sanitize filename to avoid browser confusion with slashes or special chars
    const safeInvNumber = (invoice.invoiceNumber || 'Invoice').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `ElectroFix_${safeInvNumber}.pdf`;

    const buffer = await invoiceService.generateInvoiceBuffer(invoice);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    
    return res.send(buffer);
  } catch (error) {
    console.error("CRITICAL PDF GENERATION ERROR:", error);
    next(error);
  }
};
