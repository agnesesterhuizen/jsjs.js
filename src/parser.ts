import {
  ClassMethodDeclaration,
  ClassPropertyDeclaration,
  Expression,
  getOperatorFromToken,
  OPERATOR_PRECEDENCE,
  Program,
  Statement,
  Parameter,
  TOKEN_TO_OPERATOR,
  SwitchCase,
} from "./ast.ts";
import { Token, TokenType } from "./lexer.ts";
import { Option, Result } from "./types.ts";

export type ParseError = {
  type: "syntax_error" | "unexpected_token" | "not_yet_implemented";
  message?: string;
};

const unexpectedToken = (expected: TokenType, actual: Token): ParseError => {
  const err = {
    type: "unexpected_token",
    message:
      "unexpected token: expected " +
      expected +
      ", got " +
      actual.value +
      " in " +
      `${actual.filename}:${actual.line}:${actual.col}`,
  };

  throw new Error(JSON.stringify(err));
};

const todo = (feature: string): ParseError => ({
  type: "not_yet_implemented",
  message: "feature not implemented: " + feature,
});

export class Parser {
  index = 0;
  tokens: Token[] = [];

  expect(type: TokenType): Result<Token, ParseError> {
    const token = this.tokens[this.index];
    if (!token)
      return Result.err({
        type: "unexpected_token",
        message: "expected: " + type + ", got eof",
      });

    if (token.type !== type) return Result.err(unexpectedToken(type, token));

    this.index++;
    return Result.ok(token);
  }

  expectWithValue(type: TokenType, value: string): Result<Token, ParseError> {
    const tokenResult = this.expect(type);
    if (tokenResult.isErr()) return tokenResult;

    const token = tokenResult.unwrap();

    if (token.value !== value) return Result.err(unexpectedToken(type, token));

    return Result.ok(token);
  }

  backup(level = 1) {
    this.index -= level;
  }

  nextToken(): Token {
    const token = this.tokens[this.index];
    this.index++;
    return token;
  }

  peekNextToken(level = 0): Token {
    return this.tokens[this.index + level];
  }

  nextTokenIsType(type: TokenType): boolean {
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
      return Result.err(unexpectedToken("eof", booleanTokenResult.unwrap()));
    }

    return Result.ok({
      type: "boolean",
      value: value === "true",
    });
  }

  parseArrowFunctionExpression(): Result<Expression, ParseError> {
    const leftParenResult = this.expect("left_paren");
    if (leftParenResult.isErr()) return leftParenResult.mapErr();

    const params = this.parseParams();
    if (params.isErr()) return params.mapErr();

    // arrow token
    this.expect("arrow");

    const bodyResult = this.parseStatement();
    if (bodyResult.isErr()) return bodyResult.mapErr();

    return Result.ok({
      type: "function",
      identifier: Option.none(),
      parameters: params.unwrap(),
      body: bodyResult.unwrap(),
    });
  }

  parseFunctionExpression(): Result<Expression, ParseError> {
    const keyword = this.expectWithValue("keyword", "function");
    if (keyword.isErr()) return keyword.mapErr();

    const { value } = keyword.unwrap();

    if (value !== "function") {
      return Result.err(unexpectedToken("eof", keyword.unwrap()));
    }

    const identifier: Option<string> = Option.none();

    if (this.nextTokenIsType("identifier")) {
      const identifierToken = this.expect("identifier");
      identifier.setValue(identifierToken.unwrap().value);
    }

    const leftParenResult = this.expect("left_paren");
    if (leftParenResult.isErr()) return leftParenResult.mapErr();

    const params = this.parseParams();
    if (params.isErr()) return params.mapErr();

    const bodyResult = this.parseStatement();
    if (bodyResult.isErr()) return bodyResult.mapErr();

    return Result.ok({
      type: "function",
      identifier,
      parameters: params.unwrap(),
      body: bodyResult.unwrap(),
    });
  }

  parseObjectExpression(): Result<Expression, ParseError> {
    const leftBrace = this.expect("left_brace");
    if (leftBrace.isErr()) return leftBrace.mapErr();

    const properties: Record<string, Expression> = {};

    while (!this.nextTokenIsType("right_brace")) {
      const identifier = this.expect("identifier");
      if (identifier.isErr()) return identifier.mapErr();

      const idToken = identifier.unwrap();
      const id = idToken.value as string;

      if (this.peekNextToken().type === "colon") {
        const colon = this.expect("colon");
        if (colon.isErr()) return colon.mapErr();

        const value = this.parseExpression(0);
        if (value.isErr()) return value.mapErr();

        properties[id] = value.unwrap();
      } else {
        properties[id] = { type: "identifier", value: id };
      }

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
      const value = this.parseExpression(0);
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

  // parseKeywordExpression(): Result<Expression, ParseError> {
  //   const keywordTokenResult = this.expect("keyword");
  //   if (keywordTokenResult.isErr()) return keywordTokenResult.mapErr();

  //   const token = keywordTokenResult.unwrap();

  //   switch (token.value) {
  //     case "true":
  //     case "false":
  //       this.index--;
  //       return this.parseBoolean();
  //     case "function":
  //       this.index--;
  //       return this.parseFunctionExpression();
  //     default:
  //       return Result.err(unexpectedToken("eof", token));
  //   }
  // }

  isArrowFunctionExpression() {
    const next0 = this.peekNextToken()?.type;
    const next1 = this.peekNextToken(1)?.type;
    const next2 = this.peekNextToken(2)?.type;

    if (next0 !== "left_paren") return false;

    // () => {}
    if (next1 === "right_paren") return true;
    // (a) => {}
    if (next1 === "identifier" && next2 === "right_paren") return true;
    // (a,b) => {}
    if (next1 === "identifier" && next2 === "comma") return true;
    // (...a) => {}
    if (next1 === "spread" && next2 === "identifier") return true;

    return false;
  }

  parseNotExpression(): Result<Expression, ParseError> {
    const err = this.expect("not");
    if (err.isErr()) return err.mapErr();

    const expression = this.parseExpression();
    if (expression.isErr()) return expression.mapErr();

    return Result.ok({
      type: "not",
      expression: expression.unwrap(),
    });
  }

  parsePrimary(): Result<Expression, ParseError> {
    if (this.isArrowFunctionExpression()) {
      return this.parseArrowFunctionExpression();
    }

    // if (this.peekNextToken()?.type === "spread") {
    //   this.expect("spread");
    //   return this.parseExpression();
    // }

    if (this.peekNextToken()?.type === "left_paren") {
      this.expect("left_paren");
      const expression = this.parseExpression();
      this.expect("right_paren");
      return expression;
    }

    const token = this.nextToken();

    switch (token.type) {
      case "identifier": {
        let left: Expression = { type: "identifier", value: token.value };

        // loop to consume any number of . [] () postfixes
        while (true) {
          const next = this.peekNextToken()?.type;
          if (next === "dot") {
            this.nextToken();
            const right = this.expect("identifier");
            if (right.isErr()) return right.mapErr();

            left = {
              type: "member",
              object: left,
              property: { type: "identifier", value: right.unwrap().value },
              computed: false,
            };
          } else if (next === "left_bracket") {
            this.nextToken();

            const property = this.parseExpression(0);
            if (property.isErr()) return property.mapErr();

            const rightBracket = this.expect("right_bracket");
            if (rightBracket.isErr()) return rightBracket.mapErr();

            left = {
              type: "member",
              object: left,
              property: property.unwrap(),
              computed: true,
            };
          } else if (next === "left_paren") {
            this.nextToken();
            const args: Expression[] = [];
            while (this.peekNextToken().type !== "right_paren") {
              const arg = this.parseExpression(0);
              if (arg.isErr()) return arg.mapErr();
              args.push(arg.unwrap());

              if (this.peekNextToken().type !== "right_paren") {
                this.expect("comma");
              }
            }

            this.expect("right_paren");
            left = { type: "call", func: left, arguments: args };
          } else if (next === "increment") {
            this.expect("increment");
            left = {
              type: "increment",
              expression: left,
              postfix: true,
            };
          } else if (next === "decrement") {
            this.expect("decrement");

            left = {
              type: "decrement",
              expression: left,
              postfix: true,
            };
          } else {
            break;
          }
        }

        // assignment is not postfix, so check after loop
        if (this.peekNextToken()?.type === "equals") {
          this.nextToken();

          const value = this.parseExpression();
          if (value.isErr()) return value.mapErr();

          return Result.ok({
            type: "assignment",
            operator: "=",
            left,
            right: value.unwrap(),
          });
        }

        return Result.ok(left);
      }

      case "number": {
        return Result.ok({ type: "number", value: parseFloat(token.value) });
      }

      case "string": {
        return Result.ok({ type: "string", value: token.value });
      }

      case "keyword": {
        if (token.value === "true" || token.value === "false") {
          return Result.ok({ type: "boolean", value: token.value === "true" });
        }

        if (token.value === "function") {
          let id = Option.none<string>();

          if (this.peekNextToken()?.type === "identifier") {
            let idToken = this.expect("identifier");
            if (idToken.isErr()) return idToken.mapErr();
            id = Option.some(idToken.unwrap().value);
          }

          const parameters: Parameter[] = [];

          this.expect("left_paren");

          while (this.peekNextToken()?.type !== "right_paren") {
            const param = this.expect("identifier");
            if (param.isErr()) return param.mapErr();
            parameters.push({ name: param.unwrap().value });

            if (this.peekNextToken()?.type !== "right_paren") {
              this.expect("comma");
            }
          }

          this.expect("right_paren");

          const body = this.parseBlockStatement();
          if (body.isErr()) return body.mapErr();

          return Result.ok({
            type: "function",
            identifier: id,
            parameters,
            body: body.unwrap(),
          });
        }

        if (token.value === "new") {
          const id = this.expect("identifier");
          if (id.isErr()) return id.mapErr();

          const args: Expression[] = [];

          const leftParen = this.expect("left_paren");
          if (leftParen.isErr()) return leftParen.mapErr();

          while (this.peekNextToken().type !== "right_paren") {
            const arg = this.parseExpression(0);
            if (arg.isErr()) return arg.mapErr();
            args.push(arg.unwrap());

            if (this.peekNextToken().type !== "right_paren") {
              this.expect("comma");
            }
          }

          const rightParen = this.expect("right_paren");
          if (rightParen.isErr()) return rightParen.mapErr();

          return Result.ok({
            type: "new",
            identifier: id.unwrap().value,
            arguments: args,
          });
        }

        throw new Error("unexpected token: " + token.type + ": " + token.value);
      }

      case "left_brace": {
        this.index--;
        return this.parseObjectExpression();
      }

      case "left_bracket": {
        this.index--;
        return this.parseArrayExpression();
      }

      case "right_paren": {
        this.index--;
        this.index--;
        return this.parseArrowFunctionExpression();
      }

      case "not": {
        this.index--;
        return this.parseNotExpression();
      }

      case "spread": {
        const expr = this.parseExpression();
        if (expr.isErr()) return expr;

        return Result.ok({
          type: "spread",
          expression: expr.unwrap(),
        });
      }

      case "decrement": {
        const expr = this.parseExpression();
        if (expr.isErr()) return expr;

        return Result.ok({
          type: "decrement",
          expression: expr.unwrap(),
          postfix: false,
        });
      }

      case "increment": {
        const expr = this.parseExpression();
        if (expr.isErr()) return expr;

        return Result.ok({
          type: "decrement",
          expression: expr.unwrap(),
          postfix: false,
        });
      }

      default:
        const err =
          "unexpected token: " +
          token.type +
          ": " +
          token.value +
          " in " +
          `${token.filename}:${token.line}:${token.col}`;
        throw new Error(err);
    }
  }

  isOperatorTokenType(token: Token) {
    if (!token) return false;

    return token.type in TOKEN_TO_OPERATOR;
  }

  parseExpression(precedence = 0): Result<Expression, ParseError> {
    let leftResult = this.parsePrimary();

    if (leftResult.isErr()) return leftResult.mapErr();
    let left = leftResult.unwrap();

    while (this.isOperatorTokenType(this.peekNextToken())) {
      const operatorToken = this.peekNextToken()!;
      const operator = getOperatorFromToken(operatorToken);
      const operatorPrecedence = OPERATOR_PRECEDENCE[operator];

      // Only parse next operator if its precedence is higher or equal
      if (operatorPrecedence > precedence) {
        this.nextToken(); // consume the operator
        const right = this.parseExpression(operatorPrecedence);
        if (right.isErr()) return right.mapErr();

        left = { type: "binary", operator, left, right: right.unwrap() };
      } else {
        break;
      }
    }

    return Result.ok(left);
  }

  parseVariableDeclaration(): Result<Statement, ParseError> {
    const keywordResult = this.expect("keyword");
    if (keywordResult.isErr()) return keywordResult.mapErr();

    const keywordToken = keywordResult.unwrap();

    if (!["var", "const", "let"].includes(keywordToken.value)) {
      return Result.err(unexpectedToken("eof", keywordToken));
    }

    const identifierResult = this.expect("identifier");

    if (identifierResult.isErr()) return identifierResult.mapErr();

    const identifierToken = identifierResult.unwrap();

    if (!this.nextTokenIsType("equals")) {
      if (keywordToken.value === "const")
        return Result.err({
          type: "syntax_error",
          message: "const declaration must have initial value",
        });

      return Result.ok({
        type: "variable_declaration",
        declarationType: "var",
        identifier: identifierToken.value,
        value: Option.none(),
        varType: keywordToken.value as "var" | "let",
      });
    }

    const equalsResult = this.expect("equals");
    if (equalsResult.isErr()) return equalsResult.mapErr();

    const valueResult = this.parseExpression(0);
    if (valueResult.isErr()) return valueResult.mapErr();

    return Result.ok({
      type: "variable_declaration",
      declarationType: "var",
      identifier: identifierToken.value,
      value: Option.some(valueResult.unwrap()),
      varType: keywordToken.value as "var" | "const" | "let",
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
    const expressionResult = this.parseExpression(0);
    if (expressionResult.isErr()) return expressionResult.mapErr();

    if (this.nextTokenIsType("semicolon")) {
      this.expect("semicolon");
    }

    return Result.ok({
      type: "expression",
      expression: expressionResult.unwrap(),
    });
  }

  parseFunctionDeclarationStatement(): Result<Statement, ParseError> {
    const returnResult = this.expectWithValue("keyword", "function");
    if (returnResult.isErr()) return returnResult.mapErr();

    const identifier = this.expect("identifier");
    if (identifier.isErr()) return identifier.mapErr();

    const leftParenResult = this.expect("left_paren");
    if (leftParenResult.isErr()) return leftParenResult.mapErr();

    const parameters: Parameter[] = [];

    while (!this.nextTokenIsType("right_paren")) {
      const paramResult = this.expect("identifier");
      if (paramResult.isErr()) return paramResult.mapErr();

      parameters.push({ name: paramResult.unwrap().value });

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

    const condition = this.parseExpression(0);
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
      } else {
        this.backup();
      }
    }

    return Result.ok({
      type: "if",
      condition: condition.unwrap(),
      ifBody: ifBody.unwrap(),
      elseBody,
    });
  }

  parseWhileStatement(): Result<Statement, ParseError> {
    const whileKeyword = this.expectWithValue("keyword", "while");
    if (whileKeyword.isErr()) return whileKeyword.mapErr();

    const leftParen = this.expect("left_paren");
    if (leftParen.isErr()) return leftParen.mapErr();

    const condition = this.parseExpression(0);
    if (condition.isErr()) return condition.mapErr();

    const rightParen = this.expect("right_paren");
    if (rightParen.isErr()) return rightParen.mapErr();

    const body = this.parseStatement();
    if (body.isErr()) return body;

    return Result.ok({
      type: "while",
      condition: condition.unwrap(),
      body: body.unwrap(),
    });
  }

  parseParams(): Result<Parameter[], ParseError> {
    const params: Parameter[] = [];

    while (this.peekNextToken()?.type !== "right_paren") {
      if (this.peekNextToken()?.type === "spread") {
        this.expect("spread");

        const identifier = this.expect("identifier");
        if (identifier.isErr()) return identifier.mapErr();

        params.push({ name: identifier.unwrap().value, spread: true });

        break;
      }

      const param = this.expect("identifier");
      if (param.isErr()) return param.mapErr();

      params.push({ name: param.unwrap().value });

      if (this.peekNextToken()?.type !== "right_paren") {
        this.expect("comma");
      }
    }

    this.expect("right_paren");

    return Result.ok(params);
  }

  parseClassMethodDeclaration(
    isStatic: boolean
  ): Result<ClassMethodDeclaration, ParseError> {
    const id = this.expect("identifier");
    if (id.isErr()) return id.mapErr();

    const leftParen = this.expect("left_paren");
    if (leftParen.isErr()) return leftParen.mapErr();

    const params = this.parseParams();
    if (params.isErr()) return params.mapErr();

    // get method body
    const body = this.parseBlockStatement();
    if (body.isErr()) return body.mapErr();

    return Result.ok({
      name: id.unwrap().value,
      parameters: params.unwrap(),
      body: body.unwrap(),
      static: isStatic,
    });
  }

  parseClassPropertyDeclaration(
    isStatic: boolean
  ): Result<ClassPropertyDeclaration, ParseError> {
    const id = this.expect("identifier");
    if (id.isErr()) return id.mapErr();

    // property without initial value
    if (this.peekNextToken()?.type === "semicolon") {
      this.nextToken();
      return Result.ok({
        name: id.unwrap().value,
        static: isStatic,
      });
    }

    const equals = this.expect("equals");
    if (equals.isErr()) return equals.mapErr();

    const value = this.parseExpression(0);
    if (value.isErr()) return value.mapErr();

    if (this.nextTokenIsType("semicolon")) {
      this.expect("semicolon");
    }

    return Result.ok({
      name: id.unwrap().value,
      value: value.unwrap(),
      static: isStatic,
    });
  }

  parseClassDeclarationStatement(): Result<Statement, ParseError> {
    const classKeyword = this.expectWithValue("keyword", "class");
    if (classKeyword.isErr()) return classKeyword.mapErr();

    const className = this.expect("identifier");
    if (className.isErr()) return className.mapErr();

    let superClass: string | undefined;

    if (this.peekNextToken().type === "keyword") {
      const next = this.nextToken();
      if (next.value !== "extends") {
        return Result.err(unexpectedToken("left_brace", next));
      }

      const identifier = this.expect("identifier");
      if (identifier.isErr()) return identifier.mapErr();

      superClass = identifier.unwrap().value;
    }

    const leftBrace = this.expect("left_brace");
    if (leftBrace.isErr()) return leftBrace.mapErr();

    const properties: ClassPropertyDeclaration[] = [];
    const methods: ClassMethodDeclaration[] = [];

    while (this.peekNextToken()?.type !== "right_brace") {
      let peek = this.peekNextToken();
      let isStatic = false;

      if (peek?.type === "keyword" && peek.value === "static") {
        isStatic = true;
        this.nextToken();
      }

      const id = this.expect("identifier");
      if (id.isErr()) return id.mapErr();

      peek = this.peekNextToken();

      if (
        peek?.type === "left_paren" ||
        (peek?.type === "keyword" && peek?.value === "static")
      ) {
        this.backup();
        const method = this.parseClassMethodDeclaration(isStatic);
        if (method.isErr()) return method.mapErr();
        methods.push(method.unwrap());
      } else if (peek?.type === "semicolon" || peek?.type === "equals") {
        this.backup();
        const prop = this.parseClassPropertyDeclaration(isStatic);
        if (prop.isErr()) return prop.mapErr();
        properties.push(prop.unwrap());
      } else {
        return Result.err(unexpectedToken("eof", this.tokens[this.index]));
      }
    }

    const rightBrace = this.expect("right_brace");
    if (rightBrace.isErr()) return rightBrace.mapErr();

    return Result.ok({
      type: "class_declaration",
      identifier: className.unwrap().value,
      properties,
      methods,
      superClass,
    });
  }

  parseSwitchStatement(): Result<Statement, ParseError> {
    const returnResult = this.expectWithValue("keyword", "switch");
    if (returnResult.isErr()) return returnResult.mapErr();

    const leftParen = this.expect("left_paren");
    if (leftParen.isErr()) return leftParen.mapErr();

    const condition = this.parseExpression(0);
    if (condition.isErr()) return condition.mapErr();

    const rightParen = this.expect("right_paren");
    if (rightParen.isErr()) return rightParen.mapErr();

    const leftBrace = this.expect("left_brace");
    if (leftBrace.isErr()) return leftBrace.mapErr();

    const cases: SwitchCase[] = [];

    while (
      this.peekNextToken()?.type === "keyword" &&
      this.peekNextToken()?.text === "case"
    ) {
      const c = this.expectWithValue("keyword", "case");
      if (c.isErr()) return c.mapErr();

      const test = this.parseExpression();
      if (test.isErr()) return test.mapErr();

      const colon = this.expect("colon");
      if (colon.isErr()) return colon.mapErr();

      const body = this.parseStatement();

      cases.push({
        test: test.unwrap(),
        body: body.unwrap(),
      });
    }

    let def: Option<Statement> = Option.none();

    if (
      this.peekNextToken().type === "keyword" &&
      this.peekNextToken()?.value === "default"
    ) {
      this.expectWithValue("keyword", "default");

      const colon = this.expect("colon");
      if (colon.isErr()) return colon.mapErr();

      const body = this.parseStatement();
      if (body.isErr()) return body.mapErr();

      def = Option.some(body.unwrap());
    }

    const rightBrace = this.expect("right_brace");
    if (rightBrace.isErr()) return rightBrace.mapErr();

    return Result.ok({
      type: "switch",
      condition: condition.unwrap(),
      cases,
      default: def,
    });
  }

  parseReturnStatement(): Result<Statement, ParseError> {
    const returnResult = this.expectWithValue("keyword", "return");
    if (returnResult.isErr()) return returnResult.mapErr();

    if (this.peekNextToken().type === "semicolon") {
      this.expect("semicolon");
      return Result.ok({ type: "return" });
    }

    const expressionResult = this.parseExpression(0);
    if (expressionResult.isErr()) return expressionResult.mapErr();

    const semicolonTokenResult = this.expect("semicolon");
    if (semicolonTokenResult.isErr()) return semicolonTokenResult.mapErr();

    return Result.ok({ type: "return", expression: expressionResult.unwrap() });
  }

  parseBreakStatement(): Result<Statement, ParseError> {
    const returnResult = this.expectWithValue("keyword", "break");
    if (returnResult.isErr()) return returnResult.mapErr();

    if (this.peekNextToken().type === "semicolon") {
      this.expect("semicolon");
    }

    return Result.ok({ type: "break" });
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
      case "not":
      case "decrement":
      case "increment":
      case "spread":
        return this.parseExpressionStatement();
      case "keyword":
        if (
          token.value === "true" ||
          token.value === "false" ||
          token.value === "new"
        ) {
          return this.parseExpressionStatement();
        }

        if (
          token.value === "var" ||
          token.value === "const" ||
          token.value === "let"
        ) {
          const statement = this.parseVariableDeclaration();

          if (this.peekNextToken()?.type === "semicolon") {
            this.expect("semicolon");
          }

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

        if (token.value === "class") {
          return this.parseClassDeclarationStatement();
        }

        if (token.value === "switch") {
          return this.parseSwitchStatement();
        }

        if (token.value === "break") {
          return this.parseBreakStatement();
        }

        return Result.err(unexpectedToken("eof", token));
      case "left_brace": {
        const result = this.parseBlockStatement();
        if (result.isErr()) return result;
        return result;
      }

      default:
        return Result.err(unexpectedToken("eof", token));
    }
  }

  parse(tokens: Token[]): Result<Program, ParseError> {
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
