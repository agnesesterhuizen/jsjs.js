import { Program } from "./ast";
import { Interpreter, InterpreterError } from "./interpreter";
import { newJSLexer } from "./js-lexer";
import { JSValue } from "./js-types";
import { ParseError, Parser } from "./Parser";
import { Result } from "./types";

type JSJSError = ParseError | InterpreterError;

export class JSJS {
  lexer = newJSLexer();
  parser = new Parser();
  interpreter = new Interpreter();

  parse(source: string): Result<Program, JSJSError> {
    const tokensResult = this.lexer.getTokens(source);
    if (tokensResult.isErr()) {
      return Result.err(tokensResult.error());
    }

    return this.parser.parse(tokensResult.unwrap());
  }

  run(source: string): Result<JSValue, JSJSError> {
    const parseResult = this.parse(source);
    if (parseResult.isErr()) return parseResult.mapErr();

    const ast = parseResult.unwrap();

    console.log({ ast });

    return this.interpreter.run(ast);
  }
}
