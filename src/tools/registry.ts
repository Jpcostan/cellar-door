import Ajv from "ajv";
import type { ValidateFunction } from "ajv";
import { ToolDefinition } from "../protocol/types.js";

export interface ToolRegistry {
  list(): ToolDefinition[];
  get(name: string): ToolDefinition | undefined;
  validateInput(name: string, input: Record<string, unknown>): boolean;
  validateOutput(name: string, output: Record<string, unknown>): boolean;
}

export class InMemoryToolRegistry implements ToolRegistry {
  private readonly tools: Map<string, ToolDefinition>;
  private readonly ajv: { compile: (schema: object) => ValidateFunction };
  private readonly inputValidators: Map<string, ValidateFunction>;
  private readonly outputValidators: Map<string, ValidateFunction>;

  constructor(definitions: ToolDefinition[]) {
    this.tools = new Map(definitions.map((tool) => [tool.name, tool]));
    const AjvCtor = Ajv as unknown as new (opts: object) => { compile: (schema: object) => ValidateFunction };
    this.ajv = new AjvCtor({ allErrors: true, strict: false });
    this.inputValidators = new Map();
    this.outputValidators = new Map();
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  validateInput(name: string, input: Record<string, unknown>): boolean {
    const tool = this.tools.get(name);
    if (!tool) {
      return false;
    }
    const validator = this.getInputValidator(tool);
    return Boolean(validator(input));
  }

  validateOutput(name: string, output: Record<string, unknown>): boolean {
    const tool = this.tools.get(name);
    if (!tool) {
      return false;
    }
    const validator = this.getOutputValidator(tool);
    return Boolean(validator(output));
  }

  private getInputValidator(tool: ToolDefinition): ValidateFunction {
    const existing = this.inputValidators.get(tool.name);
    if (existing) {
      return existing;
    }
    const validator = this.ajv.compile(tool.inputSchema);
    this.inputValidators.set(tool.name, validator);
    return validator;
  }

  private getOutputValidator(tool: ToolDefinition): ValidateFunction {
    const existing = this.outputValidators.get(tool.name);
    if (existing) {
      return existing;
    }
    const validator = this.ajv.compile(tool.outputSchema);
    this.outputValidators.set(tool.name, validator);
    return validator;
  }
}
