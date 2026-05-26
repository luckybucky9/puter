import { PuterError } from "@lucky9/puter-core";

export type Args = Record<string, string | boolean | string[]>;

export interface SplitCommand {
  args: Args;
  command: string[];
}

export function parseArgs(values: string[]): Args {
  const out: Args = {};
  for (let i = 0; i < values.length; i += 1) {
    const token = values[i];
    if (!token?.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = values[i + 1];
    const value = !next || next.startsWith("--") ? true : next;
    if (value !== true) {
      i += 1;
    }
    if (out[key] === undefined) {
      out[key] = value;
    } else if (Array.isArray(out[key])) {
      (out[key] as string[]).push(String(value));
    } else {
      out[key] = [String(out[key]), String(value)];
    }
  }
  return out;
}

export function splitCommand(values: string[]): SplitCommand {
  const separator = values.indexOf("--");
  if (separator === -1) {
    return { args: parseArgs(values), command: [] };
  }
  return {
    args: parseArgs(values.slice(0, separator)),
    command: values.slice(separator + 1)
  };
}

export function stringArg(args: Args, name: string): string | undefined {
  const value = args[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return typeof value === "string" ? value : undefined;
}

export function booleanArg(args: Args, name: string): boolean {
  const value = args[name];
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value === true || value === "true" || value === "1";
}

export function listArg(args: Args, name: string): string[] {
  const value = args[name];
  if (Array.isArray(value)) {
    return value.flatMap((item) => item.split(",")).map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

export function numberArg(args: Args, name: string): number | undefined {
  const value = stringArg(args, name);
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function required(args: Args, name: string): string {
  const value = stringArg(args, name);
  if (!value) {
    throw new PuterError(1, "missing_arg", `Missing --${name}`);
  }
  return value;
}
