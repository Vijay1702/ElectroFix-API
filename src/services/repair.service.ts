import * as repairRepository from '../repositories/repair.repository';
import { MESSAGES } from '../constants/messages.constants';
import { REPAIR_STATUS } from '../constants/repair-status.constants';
import { generateJobNumber } from '../utils/generate-code';
import * as notificationService from './notification.service';
import * as invoiceService from './invoice.service';
import prisma from '../config/prisma.config';

export const getRepairJobs = async (pagination: any, filters: { search?: string, status?: string, startDate?: string, endDate?: string }, currentUser: any) => {
  const { skip, limit, all } = pagination;
  const { search, status, startDate, endDate } = filters;

  const where: any = {};
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
       const end = new Date(endDate);
       end.setHours(23, 59, 59, 999);
       where.createdAt.lte = end;
    }
  }

  // Role-based filtering
  if (currentUser && currentUser.role === 'TECHNICIAN') {
    where.technicianId = currentUser.id;
  } else if (currentUser && currentUser.role !== 'ADMIN' && currentUser.role !== 'MONITOR') {
    // Fallback for any other non-admin role
    where.technicianId = currentUser.id;
  }

  if (status) {
    const statusArray = status.split(',').map(s => s.trim().toLowerCase());
    const mappedStatuses = statusArray.map(s => {
      if (s === 'completed') return 'pending_to_deliver';
      return s;
    });
    
    if (mappedStatuses.length > 1) {
      where.status = { in: mappedStatuses };
    } else {
      where.status = mappedStatuses[0];
    }
  }

  if (search) {
    where.OR = [
      { jobNumber: { contains: search, mode: 'insensitive' } },
      { deviceType: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
      { customer: { fullName: { contains: search, mode: 'insensitive' } } },
      { customer: { phoneNumber: { contains: search, mode: 'insensitive' } } },
      { technician: { fullName: { contains: search, mode: 'insensitive' } } },
      { problemDescription: { contains: search, mode: 'insensitive' } },
    ];
  }

  const repairs = await repairRepository.list({
    ...(all ? {} : { skip, take: limit }),
    where
  });
  const total = await repairRepository.count(where);

  return { repairs, total };
};

export const getRepairJobById = async (id: string) => {
  const repair = await repairRepository.findById(id);

  if (!repair) {
    throw { statusCode: 404, message: MESSAGES.REPAIR.NOT_FOUND };
  }

  return repair;
};

export const createRepairJob = async (payload: any, creatorId: string) => {
  const { jobNumber, receivedDate, expectedDeliveryDate, ...rest } = payload;
  
  if (!jobNumber) {
    throw { statusCode: 400, message: "Job Number is required." };
  }

  const existingJob = await prisma.repairJob.findUnique({ where: { jobNumber } });
  if (existingJob) {
    throw { statusCode: 400, message: "A repair job with this Job Number already exists." };
  }

  const isFullyPaidAdvance = rest.advanceAmount && rest.estimatedCost &&
    Number(rest.advanceAmount) === Number(rest.estimatedCost) && Number(rest.advanceAmount) > 0;
  const initialStatus = isFullyPaidAdvance ? REPAIR_STATUS.BILL_PAYMENTED : REPAIR_STATUS.NOT_STARTED;

  const repair = await repairRepository.create({
    ...rest,
    receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
    expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
    jobNumber,
    status: initialStatus,
  });

  // Add initial status history
  await repairRepository.addStatusHistory({
    repairJob: { connect: { id: repair.id } },
    oldStatus: '',
    newStatus: initialStatus,
    user: { connect: { id: creatorId } },
    notes: 'Repair job created',
  });

  // Notify technician if assigned
  if (repair.technicianId) {
    await notificationService.createNotification(
      repair.technicianId,
      'New Repair Assignment',
      `You have been assigned a new repair job: ${repair.jobNumber}${repair.brand || repair.model ? ` (${[repair.brand, repair.model].filter(Boolean).join(' ')})` : ''}`,
      'assignment'
    );
  }

  // Create invoice automatically if advanceAmount is provided
  if (repair.advanceAmount && Number(repair.advanceAmount) > 0) {
    const invoicePayload = {
      customerId: repair.customerId,
      repairJobId: repair.id,
      subtotal: Number(repair.estimatedCost),
      discount: 0,
      tax: 0,
      grandTotal: Number(repair.estimatedCost),
      paidAmount: Number(repair.advanceAmount),
      items: [
        {
          itemName: `Advance Payment for Repair Job #${repair.jobNumber} (${repair.deviceType}${repair.brand ? ' - ' + repair.brand : ''}${repair.model ? ' - ' + repair.model : ''})`,
          itemType: 'SERVICE',
          quantity: 1,
          unitPrice: Number(repair.estimatedCost),
          totalPrice: Number(repair.estimatedCost),
        }
      ]
    };
    await invoiceService.createInvoice(invoicePayload, creatorId);
  }

  return repair;
};

export const updateRepairJob = async (id: string, payload: any, userId?: string) => {
  const repair = await repairRepository.findById(id);
  if (!repair) {
    throw { statusCode: 404, message: MESSAGES.REPAIR.NOT_FOUND };
  }

  const { expectedDeliveryDate, deliveredDate, status, ...rest } = payload;
  const updateData: any = { ...rest };

  if (expectedDeliveryDate) updateData.expectedDeliveryDate = new Date(expectedDeliveryDate);
  if (deliveredDate) updateData.deliveredDate = new Date(deliveredDate);
  if (status) updateData.status = status;

  // Auto-flip to "Bill Paymented" once the advance covers the full estimated cost,
  // unless the job is already delivered/bill-paymented or the caller set status explicitly.
  const effectiveAdvance = rest.advanceAmount !== undefined ? rest.advanceAmount : repair.advanceAmount;
  const effectiveCost = rest.estimatedCost !== undefined ? rest.estimatedCost : repair.estimatedCost;
  const isFullyPaidAdvance = effectiveAdvance && effectiveCost &&
    Number(effectiveAdvance) === Number(effectiveCost) && Number(effectiveAdvance) > 0;
  if (
    isFullyPaidAdvance &&
    !status &&
    repair.status !== REPAIR_STATUS.DELIVERED &&
    repair.status !== REPAIR_STATUS.BILL_PAYMENTED
  ) {
    updateData.status = REPAIR_STATUS.BILL_PAYMENTED;
  }

  const updatedRepair = await repairRepository.update(id, updateData);

  // If status changed, record it in history
  if (updateData.status && updateData.status !== repair.status && userId) {
    await repairRepository.addStatusHistory({
      repairJob: { connect: { id } },
      oldStatus: repair.status,
      newStatus: updateData.status,
      user: { connect: { id: userId } },
      notes: status ? `Status updated via job edit` : `Status updated to Bill Paymented automatically as advance payment equals estimated cost.`,
    });
  }

  // If technician was changed or newly assigned, notify them
  if (updateData.technicianId && updateData.technicianId !== repair.technicianId) {
    await notificationService.createNotification(
      updateData.technicianId,
      'New Repair Assignment',
      `You have been assigned a new repair job: ${updatedRepair.jobNumber}${updatedRepair.brand || updatedRepair.model ? ` (${[updatedRepair.brand, updatedRepair.model].filter(Boolean).join(' ')})` : ''}`,
      'assignment'
    );
  }

  return updatedRepair;
};

export const updateRepairStatus = async (id: string, payload: any, userId: string) => {
  const repair = await repairRepository.findById(id);
  if (!repair) {
    throw { statusCode: 404, message: MESSAGES.REPAIR.NOT_FOUND };
  }

  const { status, notes } = payload;
  const oldStatus = repair.status;

  if (oldStatus === status) {
    return repair;
  }

  const updatedRepair = await repairRepository.update(id, { status });

  await repairRepository.addStatusHistory({
    repairJob: { connect: { id } },
    oldStatus,
    newStatus: status,
    user: { connect: { id: userId } },
    notes: notes || `Status changed from ${oldStatus} to ${status}`,
  });

  return updatedRepair;
};

export const deleteRepairJob = async (id: string) => {
  const repair = await repairRepository.findById(id);
  if (!repair) {
    throw { statusCode: 404, message: MESSAGES.REPAIR.NOT_FOUND };
  }

  return repairRepository.remove(id);
};

export const getRepairTimeline = async (id: string) => {
  const timeline = await repairRepository.getTimeline(id);
  return timeline;
};
