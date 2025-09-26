import { Program } from "./ast.ts";
import { Runtime } from "./engine/runtime.ts";
import { Lexer } from "./lexer.ts";
import { Parser } from "./parser.ts";

export class JSJS {
  lexer = new Lexer();
  parser = new Parser();
  runtime: Runtime = new Runtime();

  parse(filename: string, source: string): Program {
    const tokens = this.lexer.run(filename, source);
    return this.parser.parse(tokens);
  }

  run(filename: string, source: string) {
    const ast = this.parse(filename, source);
    return this.runtime.run(ast);
  }
}
