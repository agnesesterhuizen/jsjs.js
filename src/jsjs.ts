import { Program } from "./ast";
import { Interpreter, InterpreterError } from "./interpreter";
import { JSValue } from "./js-types";
import { Lexer } from "./lexer";
import { ParseError, Parser } from "./parser";
import { Result } from "./types";

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
