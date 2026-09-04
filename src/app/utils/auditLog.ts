import prisma from "../lib/prisma.js";

type TCreateAuditLogPayload = {
	userId?: string | null;
	action: string;
	entity: string;
	entityId: string;
	details?: Record<string, unknown> | null;
};

export const createAuditLog = async (payload: TCreateAuditLogPayload) => {
	await prisma.auditLog.create({
		data: {
			userId: payload.userId ?? null,
			action: payload.action,
			entity: payload.entity,
			entityId: payload.entityId,
			details: payload.details ?? undefined,
		},
	});
};
