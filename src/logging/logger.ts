export type LogLevel = "info" | "warn" | "error";

export interface Logger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

interface LoggerOptions {
  json: boolean;
}

function emitJson(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    message,
  };
  if (data && Object.keys(data).length > 0) {
    payload.data = data;
  }
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function emitText(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  const prefix = level.toUpperCase();
  const suffix = data && Object.keys(data).length > 0 ? ` ${JSON.stringify(data)}` : "";
  process.stdout.write(`${prefix}: ${message}${suffix}\n`);
}

export function createLogger(options: LoggerOptions): Logger {
  return {
    info(message, data) {
      if (options.json) {
        emitJson("info", message, data);
      } else {
        emitText("info", message, data);
      }
    },
    warn(message, data) {
      if (options.json) {
        emitJson("warn", message, data);
      } else {
        emitText("warn", message, data);
      }
    },
    error(message, data) {
      if (options.json) {
        emitJson("error", message, data);
      } else {
        emitText("error", message, data);
      }
    },
  };
}
