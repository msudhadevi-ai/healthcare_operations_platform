import { prisma } from "@/lib/prisma";
import type { AuditAction } from "@/types";

interface AuditParams {
  clinicId: string;
  userId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>; // Only non-PHI metadata
}

/**
 * Write an audit log entry.
 * HIPAA requirement: log every PHI access/create/update/delete.
 * IMPORTANT: Never store raw PHI (names, DOB, etc.) in the details field.
 */
export async function writeAuditLog(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        clinicId: params.clinicId,
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        details: params.details ? JSON.stringify(params.details) : undefined,
      },
    });
  } catch (error) {
    // Audit log failures should not crash the main request
    // but should be monitored in production
    console.error("[AUDIT] Failed to write audit log:", error);
  }
}

export function getRequestMeta(request: Request) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  };
}
