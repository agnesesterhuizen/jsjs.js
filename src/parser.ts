import { Expression, Operator, OPERATOR_PRECEDENCE, Program, Statement } from "./ast";
import { JSToken, JSTokenType } from "./js-lexer";
import { Option, Result } from "./types";

export type ParseError = {
  type: "unexpected_token" | "not_yet_implemented";
  message?: string;
};

const unexpectedToken = (token: JSToken): ParseError => ({
  type: "unexpected_token",
  message: `unexpected token: ${token.value}`,
});

const todo = (feature: string): ParseError => ({
  type: "not_yet_implemented",
  message: `feature not implemented: ${feature}`,
});

export class Parser {
  index = 0;
  tokens: JSToken[] = [];

  expect(type: JSTokenType): Result<JSToken, ParseError> {
    const token = this.tokens[this.index];
    if (!token) return Result.err({ type: "unexpected_token", message: `expected: ${type}, got eof` });

    if (token.type !== type) return Result.err(unexpectedToken(token));

    this.index++;
    return Result.ok(token);
  }

  expectWithValue(type: JSTokenType, value: string): Result<JSToken, ParseError> {
    const tokenResult = this.expect(type);
    if (tokenResult.isErr()) return tokenResult;

    const token = tokenResult.unwrap();

    if (token.value !== value) return Result.err(unexpectedToken(token));

    return Result.ok(token);
  }

  peekNextToken(): JSToken {
    return this.tokens[this.index];
  }

  nextTokenIsType(type: JSTokenType): boolean {
    const nextToken = this.tokens[this.index];
    if (!nextToken) return false;
    return nextToken.type === type;
  }

  parseNumber(): Result<Expression, ParseError> {
    const numberTokenResult = this.expect("number");
    if (numberTokenResult.isErr()) return numberTokenResult.mapErr();

    const { value } = numberTokenResult.unwrap();

    return Result.ok({
      type: "number",
      value: parseFloat(value),
    });
  }

  parseString(): Result<Expression, ParseError> {
    const stringTokenResult = this.expect("string");
    if (stringTokenResult.isErr()) return stringTokenResult.mapErr();

    const { value } = stringTokenResult.unwrap();

    return Result.ok({
      type: "string",
      value,
    });
  }

  parseIdentifier(): Result<Expression, ParseError> {
    const identifierTokenResult = this.expect("identifier");
    if (identifierTokenResult.isErr()) return identifierTokenResult.mapErr();

    const { value } = identifierTokenResult.unwrap();

    return Result.ok({
      type: "identifier",
      value,
    });
  }

  parseBoolean(): Result<Expression, ParseError> {
    const booleanTokenResult = this.expect("keyword");
    if (booleanTokenResult.isErr()) return booleanTokenResult.mapErr();

    const { value } = booleanTokenResult.unwrap();

    if (value !== "true" && value !== "false") {
      return Result.err(unexpectedToken(booleanTokenResult.unwrap()));
    }

    return Result.ok({
      type: "boolean",
      value: value === "true",
    });
  }

  parseFunctionExpression(): Result<Expression, ParseError> {
    const keyword = this.expectWithValue("keyword", "function");
    if (keyword.isErr()) return keyword.mapErr();

    const { value } = keyword.unwrap();

    if (value !== "function") {
      return Result.err(unexpectedToken(keyword.unwrap()));
    }

    const identifier: Option<string> = Option.none();

    if (this.nextTokenIsType("identifier")) {
      const identifierToken = this.expect("identifier");
      identifier.setValue(identifierToken.unwrap().value);
    }

    const leftParenResult = this.expect("left_paren");
    if (leftParenResult.isErr()) return leftParenResult.mapErr();

    const parameters: string[] = [];

    while (!this.nextTokenIsType("right_paren")) {
      const paramResult = this.expect("identifier");
      if (paramResult.isErr()) return paramResult.mapErr();

      parameters.push(paramResult.unwrap().value);

      if (this.nextTokenIsType("comma")) this.index++;
    }

    // skip right_paren
    this.index++;

    const bodyResult = this.parseStatement();
    if (bodyResult.isErr()) return bodyResult.mapErr();

    return Result.ok({
      type: "function",
      identifier,
      parameters,
      body: bodyResult.unwrap(),
    });
  }

  parseObjectExpression(): Result<Expression, ParseError> {
    const leftBrace = this.expect("left_brace");
    if (leftBrace.isErr()) return leftBrace.mapErr();

    const properties = {};

    while (!this.nextTokenIsType("right_brace")) {
      const identifier = this.expect("identifier");
      if (identifier.isErr()) return identifier.mapErr();

      const colon = this.expect("colon");
      if (colon.isErr()) return colon.mapErr();

      const value = this.parseExpression(Option.none());
      if (value.isErr()) return value.mapErr();

      properties[identifier.unwrap().value] = value.unwrap();

      if (this.nextTokenIsType("comma")) {
        this.index++;
      }
    }

    // skip "}"
    this.index++;

    return Result.ok({
      type: "object",
      properties,
    });
  }

  parseArrayExpression(): Result<Expression, ParseError> {
    const leftBracket = this.expect("left_bracket");
    if (leftBracket.isErr()) return leftBracket.mapErr();

    const elements = [];

    while (!this.nextTokenIsType("right_bracket")) {
      const value = this.parseExpression(Option.none());
      if (value.isErr()) return value.mapErr();

      elements.push(value.unwrap());

      if (this.nextTokenIsType("comma")) {
        this.index++;
      }
    }

    // skip "]"
    this.index++;

    return Result.ok({
      type: "array",
      elements,
    });
  }

  parseKeywordExpression(): Result<Expression, ParseError> {
    const keywordTokenResult = this.expect("keyword");
    if (keywordTokenResult.isErr()) return keywordTokenResult.mapErr();

    const token = keywordTokenResult.unwrap();

    switch (token.value) {
      case "true":
      case "false":
        this.index--;
        return this.parseBoolean();
      case "function":
        this.index--;
        return this.parseFunctionExpression();
      default:
        return Result.err(unexpectedToken(token));
    }
  }

  parseExpression(left: Option<Expression>, currentPrecedence = 1): Result<Expression, ParseError> {
    console.log("\nparseExpression", this.tokens[this.index], { currentPrecedence });

    if (!left.hasValue()) {
      const token = this.tokens[this.index];
      switch (token.type) {
        case "left_paren": {
          this.index++;
          const res = this.parseExpression(Option.none());
          if (res.isErr()) return res.mapErr();

          const leftParenResult = this.expect("right_paren");
          if (leftParenResult.isErr()) return leftParenResult.mapErr();

          left.setValue(res.unwrap());
          break;
        }
        case "number": {
          const res = this.parseNumber();
          if (res.isErr()) return res.mapErr();
          left.setValue(res.unwrap());
          break;
        }
        case "string": {
          const res = this.parseString();
          if (res.isErr()) return res.mapErr();
          left.setValue(res.unwrap());
          break;
        }
        case "identifier": {
          const res = this.parseIdentifier();
          if (res.isErr()) return res.mapErr();
          left.setValue(res.unwrap());
          break;
        }
        case "keyword":
          if (token.value === "true" || token.value === "false" || token.value === "function") {
            const res = this.parseKeywordExpression();
            if (res.isErr()) return res.mapErr();
            left.setValue(res.unwrap());
            break;
          }

          return Result.err(unexpectedToken(token));

        case "left_brace": {
          const res = this.parseObjectExpression();
          if (res.isErr()) return res.mapErr();
          left.setValue(res.unwrap());
          break;
        }

        case "left_bracket": {
          const res = this.parseArrayExpression();
          if (res.isErr()) return res.mapErr();
          left.setValue(res.unwrap());
          break;
        }

        default:
          return Result.err(unexpectedToken(token));
      }
    }

    if (
      this.nextTokenIsType("semicolon") ||
      this.nextTokenIsType("right_paren") ||
      this.nextTokenIsType("right_brace") ||
      this.nextTokenIsType("right_bracket") ||
      this.nextTokenIsType("colon") ||
      this.nextTokenIsType("comma")
    ) {
      return Result.ok(left.unwrap());
    }

    if (this.nextTokenIsType("dot")) {
      this.index++;
      const rightResult = this.expect("identifier");
      if (rightResult.isErr()) return rightResult.mapErr();

      left.setValue({
        type: "member",
        object: left.unwrap(),
        property: { type: "identifier", value: rightResult.unwrap().value },
        computed: false,
      });
    }

    if (this.nextTokenIsType("left_bracket")) {
      this.index++;

      const property = this.parseExpression(Option.none());
      if (property.isErr()) return property.mapErr();

      const rightBracket = this.expect("right_bracket");
      if (rightBracket.isErr()) return rightBracket.mapErr();

      left.setValue({
        type: "member",
        object: left.unwrap(),
        property: property.unwrap(),
        computed: true,
      });
    }

    if (this.nextTokenIsType("equals")) {
      this.index++;

      const right = this.parseExpression(Option.none());
      if (right.isErr()) return right.mapErr();

      return Result.ok({
        type: "assignment",
        operator: "=",
        left: left.unwrap(),
        right: right.unwrap(),
      });
    }

    if (this.nextTokenIsType("left_paren")) {
      this.index++;

      const args = [];

      while (!this.nextTokenIsType("right_paren")) {
        const argResult = this.parseExpression(Option.none());
        if (argResult.isErr()) return argResult;

        args.push(argResult.unwrap());

        if (this.nextTokenIsType("comma")) this.index++;
      }

      const rightParenResult = this.expect("right_paren");
      if (rightParenResult.isErr()) return rightParenResult.mapErr();

      left.setValue({ type: "call", function: left.unwrap(), arguments: args });
    }

    if (this.nextTokenIsType("plus") || this.nextTokenIsType("asterisk")) {
      console.log("be, left", left);

      const operatorToken = this.tokens[this.index];

      const operator = operatorToken.value as Operator;
      const precedence = OPERATOR_PRECEDENCE[operator];
      console.log({ operator, currentPrecedence, precedence });

      if (precedence > currentPrecedence) {
        console.log("higher prec");
        this.index++;
        const right = this.parseExpression(Option.none(), precedence);
        if (right.isErr()) return right;

        console.log("right", right);

        return Result.ok({
          type: "binary",
          operator: operatorToken.value as Operator,
          left: left.unwrap(),
          right: right.unwrap(),
        });
      } else {
        console.log("lower prec");
      }
    }

    console.log("def", left);
    return Result.ok(left.unwrap());
  }

  parseVariableDeclaration(): Result<Statement, ParseError> {
    const keywordResult = this.expect("keyword");
    if (keywordResult.isErr()) return keywordResult.mapErr();

    const keywordToken = keywordResult.unwrap();

    if (keywordToken.value === "const" || keywordToken.value === "let") {
      return Result.err(todo("const and let declarations"));
    }

    if (keywordToken.value !== "var") {
      return Result.err(unexpectedToken(keywordToken));
    }

    const identifierResult = this.expect("identifier");

    if (identifierResult.isErr()) return identifierResult.mapErr();

    const identifierToken = identifierResult.unwrap();

    if (!this.nextTokenIsType("equals")) {
      return Result.ok({
        type: "variable_declaration",
        declarationType: "var",
        identifier: identifierToken.value,
        value: Option.none(),
      });
    }

    const equalsResult = this.expect("equals");
    if (equalsResult.isErr()) return equalsResult.mapErr();

    const valueResult = this.parseExpression(Option.none());
    if (valueResult.isErr()) return valueResult.mapErr();

    return Result.ok({
      type: "variable_declaration",
      declarationType: "var",
      identifier: identifierToken.value,
      value: Option.some(valueResult.unwrap()),
    });
  }

  parseBlockStatement(): Result<Statement, ParseError> {
    const leftBraceResult = this.expect("left_brace");
    if (leftBraceResult.isErr()) return leftBraceResult.mapErr();

    const body: Statement[] = [];

    while (!this.nextTokenIsType("right_brace")) {
      const result = this.parseStatement();
      if (result.isErr()) return result;
      body.push(result.unwrap());
    }

    this.index++;

    return Result.ok({
      type: "block",
      body,
    });
  }

  parseExpressionStatement(): Result<Statement, ParseError> {
    const expressionResult = this.parseExpression(Option.none());
    if (expressionResult.isErr()) return expressionResult.mapErr();

    const semicolonTokenResult = this.expect("semicolon");
    if (semicolonTokenResult.isErr()) return semicolonTokenResult.mapErr();

    return Result.ok({ type: "expression", expression: expressionResult.unwrap() });
  }

  parseFunctionDeclarationStatement(): Result<Statement, ParseError> {
    const returnResult = this.expectWithValue("keyword", "function");
    if (returnResult.isErr()) return returnResult.mapErr();

    const identifier = this.expect("identifier");
    if (identifier.isErr()) return identifier.mapErr();

    const leftParenResult = this.expect("left_paren");
    if (leftParenResult.isErr()) return leftParenResult.mapErr();

    const parameters: string[] = [];

    while (!this.nextTokenIsType("right_paren")) {
      const paramResult = this.expect("identifier");
      if (paramResult.isErr()) return paramResult.mapErr();

      parameters.push(paramResult.unwrap().value);

      if (this.nextTokenIsType("comma")) this.index++;
    }

    // skip right_paren
    this.index++;

    const bodyResult = this.parseStatement();
    if (bodyResult.isErr()) return bodyResult.mapErr();

    return Result.ok({
      type: "function_declaration",
      identifier: identifier.unwrap().value,
      parameters,
      body: bodyResult.unwrap(),
    });
  }

  parseIfStatement(): Result<Statement, ParseError> {
    const ifKeyword = this.expectWithValue("keyword", "if");
    if (ifKeyword.isErr()) return ifKeyword.mapErr();

    const leftParen = this.expect("left_paren");
    if (leftParen.isErr()) return leftParen.mapErr();

    const condition = this.parseExpression(Option.none());
    if (condition.isErr()) return condition.mapErr();

    const rightParen = this.expect("right_paren");
    if (rightParen.isErr()) return rightParen.mapErr();

    const ifBody = this.parseStatement();
    if (ifBody.isErr()) return ifBody;

    const elseBody: Option<Statement> = Option.none();

    if (this.nextTokenIsType("keyword")) {
      const keyword = this.expect("keyword");
      if (keyword.isErr()) return keyword.mapErr();

      if (keyword.unwrap().value === "else") {
        const elseStatement = this.parseStatement();
        if (elseStatement.isErr()) return elseStatement;

        elseBody.setValue(elseStatement.unwrap());
      }
    }

    return Result.ok({ type: "if", condition: condition.unwrap(), ifBody: ifBody.unwrap(), elseBody });
  }

  parseWhileStatement(): Result<Statement, ParseError> {
    const whileKeyword = this.expectWithValue("keyword", "while");
    if (whileKeyword.isErr()) return whileKeyword.mapErr();

    const leftParen = this.expect("left_paren");
    if (leftParen.isErr()) return leftParen.mapErr();

    const condition = this.parseExpression(Option.none());
    if (condition.isErr()) return condition.mapErr();

    const rightParen = this.expect("right_paren");
    if (rightParen.isErr()) return rightParen.mapErr();

    const body = this.parseStatement();
    if (body.isErr()) return body;

    return Result.ok({ type: "while", condition: condition.unwrap(), body: body.unwrap() });
  }

  parseReturnStatement(): Result<Statement, ParseError> {
    const returnResult = this.expectWithValue("keyword", "return");
    if (returnResult.isErr()) return returnResult.mapErr();

    const expressionResult = this.parseExpression(Option.none());
    if (expressionResult.isErr()) return expressionResult.mapErr();

    const semicolonTokenResult = this.expect("semicolon");
    if (semicolonTokenResult.isErr()) return semicolonTokenResult.mapErr();

    return Result.ok({ type: "return", expression: expressionResult.unwrap() });
  }

  parseStatement(): Result<Statement, ParseError> {
    const token = this.tokens[this.index];

    switch (token.type) {
      case "semicolon":
        this.index++;
        return Result.ok({ type: "empty" });
      case "number":
      case "string":
      case "identifier":
      case "left_paren":
        return this.parseExpressionStatement();
      case "keyword":
        if (token.value === "true" || token.value === "false") {
          return this.parseExpressionStatement();
        }

        if (token.value === "var") {
          const statement = this.parseVariableDeclaration();

          const semicolonTokenResult = this.expect("semicolon");
          if (semicolonTokenResult.isErr()) return semicolonTokenResult.mapErr();

          return statement;
        }

        if (token.value === "if") {
          return this.parseIfStatement();
        }

        if (token.value === "while") {
          return this.parseWhileStatement();
        }

        if (token.value === "function") {
          return this.parseFunctionDeclarationStatement();
        }

        if (token.value === "return") {
          return this.parseReturnStatement();
        }

        return Result.err(unexpectedToken(token));
      case "left_brace": {
        const result = this.parseBlockStatement();
        if (result.isErr()) return result;
        return result;
      }
      default:
        return Result.err(unexpectedToken(token));
    }
  }

  parse(tokens: JSToken[]): Result<Program, ParseError> {
    this.tokens = tokens;
    this.index = 0;

    const body: Statement[] = [];

    while (this.index < tokens.length) {
      const result = this.parseStatement();
      if (result.isErr()) return result.mapErr();
      body.push(result.unwrap());
    }

    return Result.ok({ body });
  }
}
