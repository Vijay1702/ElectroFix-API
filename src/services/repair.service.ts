import * as repairRepository from '../repositories/repair.repository';
import { MESSAGES } from '../constants/messages.constants';
import { REPAIR_STATUS } from '../constants/repair-status.constants';
import { generateJobNumber } from '../utils/generate-code';

export const getRepairJobs = async (pagination: any) => {
  const { skip, limit } = pagination;
  const repairs = await repairRepository.list({ skip, take: limit });
  const total = await repairRepository.count();

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
  
  const repair = await repairRepository.create({
    ...payload,
    jobNumber,
    status: REPAIR_STATUS.RECEIVED,
  });

  // Add initial status history
  await repairRepository.addStatusHistory({
    repairJob: { connect: { id: repair.id } },
    oldStatus: '',
    newStatus: REPAIR_STATUS.RECEIVED,
    user: { connect: { id: creatorId } },
    notes: 'Repair job created',
  });

  return repair;
};

export const updateRepairJob = async (id: string, payload: any) => {
  const repair = await repairRepository.findById(id);
  if (!repair) {
    throw { statusCode: 404, message: MESSAGES.REPAIR.NOT_FOUND };
  }

  return repairRepository.update(id, payload);
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
