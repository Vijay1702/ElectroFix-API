import * as callLogRepository from '../repositories/call-log.repository';
import prisma from '../config/prisma.config';
import { MESSAGES } from '../constants/messages.constants';

export const createCallLog = async (
  repairJobId: string,
  outcome: string,
  notes: string | undefined,
  createdById: string
) => {
  const repair = await prisma.repairJob.findUnique({
    where: { id: repairJobId }
  });

  if (!repair) {
    throw { statusCode: 404, message: "Repair job not found" };
  }

  let callStatus = repair.callStatus;
  let newStatus = repair.status;

  if (outcome === 'informed_fault') {
    callStatus = 'informed';
  } else if (outcome === 'declined_repair') {
    callStatus = 'declined_by_client';
    newStatus = 'declined';
  } else if (outcome === 'no_response') {
    callStatus = 'no_response';
  }

  await prisma.repairJob.update({
    where: { id: repairJobId },
    data: {
      callStatus,
      status: newStatus
    }
  });

  if (newStatus !== repair.status) {
    await prisma.repairStatusHistory.create({
      data: {
        repairJobId,
        oldStatus: repair.status,
        newStatus,
        changedBy: createdById,
        notes: notes || 'Status updated automatically to declined based on customer call response.',
      }
    });
  }

  return callLogRepository.create({
    repairJobId,
    outcome,
    notes,
    createdById,
  });
};

export const getCallLogs = async (repairJobId: string) => {
  const repair = await prisma.repairJob.findUnique({
    where: { id: repairJobId }
  });

  if (!repair) {
    throw { statusCode: 404, message: "Repair job not found" };
  }

  return callLogRepository.list(repairJobId);
};
