import crypto from "node:crypto";

export function createTraceId(): string {
  return crypto.randomUUID();
}

export function createToolCallId(): string {
  return crypto.randomUUID();
}
