import { Program } from "../parser/ast.ts";
import { Runtime } from "./runtime.ts";

// deno-lint-ignore no-explicit-any
export type Logger = (...data: any[]) => void;

export class Engine {
  logger: Logger = console.log;

  runtime: Runtime;

  constructor(logger: Logger = console.log) {
    this.logger = logger;
    this.runtime = new Runtime(logger);
  }

  run(program: Program) {
    this.runtime.run(program);
  }
}
