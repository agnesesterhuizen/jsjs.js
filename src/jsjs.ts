import { Program } from "./ast.ts";
import { Interpreter, InterpreterError } from "./interpreter.ts";
import { JSValue } from "./js-types.ts";
import { Lexer } from "./lexer.ts";
import { ParseError, Parser } from "./parser.ts";
import { Result } from "./types.ts";

type JSJSError = ParseError | InterpreterError;

export class JSJS {
  lexer = new Lexer();
  parser = new Parser();
  interpreter = new Interpreter();

  parse(filename: string, source: string): Result<Program, JSJSError> {
    const tokens = this.lexer.run(filename, source);

    return this.parser.parse(tokens);
  }

  run(filename: string, source: string): Result<JSValue, JSJSError> {
    const parseResult = this.parse(filename, source);
    if (parseResult.isErr()) return parseResult.mapErr();

    const ast = parseResult.unwrap();

    console.log({ ast });

    return this.interpreter.run(ast);
  }
}
