import * as repairRepository from '../repositories/repair.repository';
import { MESSAGES } from '../constants/messages.constants';
import { REPAIR_STATUS } from '../constants/repair-status.constants';
import { generateJobNumber } from '../utils/generate-code';
import * as notificationService from './notification.service';

export const getRepairJobs = async (pagination: any, filters: { search?: string, status?: string }, currentUser: any) => {
  const { skip, limit } = pagination;
  const { search, status } = filters;

  const where: any = {};

  // Role-based filtering
  if (currentUser && currentUser.role === 'TECHNICIAN') {
    where.technicianId = currentUser.id;
  } else if (currentUser && currentUser.role !== 'ADMIN') {
    // Fallback for any other non-admin role
    where.technicianId = currentUser.id;
  }

  if (status) {
    where.status = status;
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

  const repairs = await repairRepository.list({ skip, take: limit, where });
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
  const jobNumber = await generateJobNumber();
  
  const { receivedDate, expectedDeliveryDate, ...rest } = payload;

  const repair = await repairRepository.create({
    ...rest,
    receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
    expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
    jobNumber,
    status: REPAIR_STATUS.NOT_STARTED,
  });

  // Add initial status history
  await repairRepository.addStatusHistory({
    repairJob: { connect: { id: repair.id } },
    oldStatus: '',
    newStatus: REPAIR_STATUS.NOT_STARTED,
    user: { connect: { id: creatorId } },
    notes: 'Repair job created',
  });

  // Notify technician if assigned
  if (repair.technicianId) {
    await notificationService.createNotification(
      repair.technicianId,
      'New Repair Assignment',
      `You have been assigned a new repair job: ${repair.jobNumber} (${repair.brand} ${repair.model})`,
      'assignment'
    );
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

  const updatedRepair = await repairRepository.update(id, updateData);

  // If status changed, record it in history
  if (status && status !== repair.status && userId) {
    await repairRepository.addStatusHistory({
      repairJob: { connect: { id } },
      oldStatus: repair.status,
      newStatus: status,
      user: { connect: { id: userId } },
      notes: `Status updated via job edit`,
    });
  }

  // If technician was changed or newly assigned, notify them
  if (updateData.technicianId && updateData.technicianId !== repair.technicianId) {
    await notificationService.createNotification(
      updateData.technicianId,
      'New Repair Assignment',
      `You have been assigned a new repair job: ${updatedRepair.jobNumber} (${updatedRepair.brand} ${updatedRepair.model})`,
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
