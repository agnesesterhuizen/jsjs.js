import { Program } from "./parser/ast.ts";
import { Runtime } from "./engine/runtime.ts";
import { Lexer } from "./parser/lexer.ts";
import { Parser } from "./parser/parser.ts";

export class JSJS {
  lexer = new Lexer();
  parser = new Parser();
  runtime: Runtime = new Runtime();

  tokens(filename: string, source: string) {
    return this.lexer.run(filename, source);
  }

  parse(filename: string, source: string): Program {
    const tokens = this.tokens(filename, source);
    return this.parser.parse(tokens);
  }

  run(filename: string, source: string) {
    const ast = this.parse(filename, source);
    return this.runtime.run(ast);
  }
}
