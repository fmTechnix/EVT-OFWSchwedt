import type { Request } from "express";
import type { InsertAuditLog } from "@shared/schema";
import { storage } from "./storage";

/**
 * Helper function to log audit events with request context
 * @param req - Express request object (provides actor info)
 * @param details - Event details (action, entity, metadata, etc.)
 */
export async function logAuditEvent(
  req: Request,
  details: {
    action: string;
    entity_type?: string;
    entity_id?: string;
    severity?: "info" | "warning" | "error";
    metadata?: Record<string, any>;
    source?: string;
  }
): Promise<void> {
  try {
    const log: InsertAuditLog = {
      actor_id: req.session?.userId || null,
      actor_role: (req.session as any)?.role || null,
      actor_ip: (req.ip || req.socket.remoteAddress || "unknown").replace("::ffff:", ""),
      actor_agent: req.get("user-agent") || null,
      action: details.action,
      entity_type: details.entity_type || null,
      entity_id: details.entity_id || null,
      severity: details.severity || "info",
      metadata: details.metadata ? JSON.parse(JSON.stringify(details.metadata)) : null,
      request_id: req.get("x-request-id") || null,
      source: details.source || "api",
    };

    await storage.createAuditLog(log);
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error("Audit logging failed:", error);
  }
}
