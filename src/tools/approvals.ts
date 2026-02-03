import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { ToolCall, ToolDefinition } from "../protocol/types.js";

export interface ApprovalRequest {
  tool: ToolDefinition;
  call: ToolCall;
  reason: string;
}

export interface ApprovalProvider {
  requestApproval(request: ApprovalRequest): Promise<boolean>;
}

export class CliApprovalProvider implements ApprovalProvider {
  async requestApproval(request: ApprovalRequest): Promise<boolean> {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      return false;
    }
    const rl = readline.createInterface({ input, output });
    try {
      const prompt = `Approve tool ${request.tool.name} (${request.tool.sideEffectClass})? ${request.reason} (y/N) `;
      const answer = await rl.question(prompt);
      return answer.trim().toLowerCase().startsWith("y");
    } finally {
      rl.close();
    }
  }
}
