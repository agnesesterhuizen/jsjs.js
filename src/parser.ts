import {
  AssignmentOperator,
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
  VariableDeclarator,
  WithLocation,
  UnaryOperator,
} from "./ast.ts";
import { Token, TokenType } from "./lexer.ts";

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

const syntaxError = (message: string, token: Token) => {
  const err = {
    type: "syntax_error",
    message: message + " in " + `${token.filename}:${token.line}:${token.col}`,
  };

  throw new Error(JSON.stringify(err));
};

const decodeTemplateChunk = (raw: string): string => {
  let result = "";

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];

    if (char === "\\") {
      const next = raw[i + 1];

      switch (next) {
        case "`":
          result += "`";
          i++;
          continue;
        case "$":
          result += "$";
          i++;
          continue;
        case "\\":
          result += "\\";
          i++;
          continue;
        case "n":
          result += "\n";
          i++;
          continue;
        case "r":
          result += "\r";
          i++;
          continue;
        case "t":
          result += "\t";
          i++;
          continue;
        case "0":
          result += "\0";
          i++;
          continue;
        default:
          if (next !== undefined) {
            result += next;
            i++;
            continue;
          }
      }
    }

    result += char;
  }

  return result;
};

function withLocation<T extends { type: string }>(
  node: T,
  token: Token
): WithLocation<T> {
  return {
    ...node,
    location: {
      file: token.filename,
      line: token.line,
      column: token.col,
    },
  };
}

const ASSIGNMENT_TOKEN_TO_OPERATOR: Partial<
  Record<TokenType, AssignmentOperator>
> = {
  equals: "=",
  plus_equals: "+=",
  minus_equals: "-=",
  multiply_equals: "*=",
  divide_equals: "/=",
};

export class Parser {
  index = 0;
  tokens: Token[] = [];

  expect(type: TokenType): Token {
    const token = this.tokens[this.index];
    if (!token) {
      unexpectedToken("eof", token);
    }

    if (token.type !== type) {
      unexpectedToken(type, token);
    }

    this.index++;
    return token;
  }

  expectWithValue(type: TokenType, value: string): Token {
    const token = this.expect(type);
    if (token.value !== value) {
      unexpectedToken(type, token);
    }

    return token;
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

  parseNumber(): Expression {
    const token = this.expect("number");

    return withLocation(
      {
        type: "number",
        value: parseFloat(token.value),
      },
      token
    );
  }

  parseString(): Expression {
    const token = this.expect("string");

    return withLocation(
      {
        type: "string",
        value: token.value,
      },
      token
    );
  }

  parseIdentifier(): Expression {
    const token = this.expect("identifier");

    return withLocation(
      {
        type: "identifier",
        value: token.value,
      },
      token
    );
  }

  parseBoolean(): Expression {
    const token = this.expect("keyword");

    if (token.value !== "true" && token.value !== "false") {
      unexpectedToken("eof", token);
    }

    return withLocation(
      {
        type: "boolean",
        value: token.value === "true",
      },
      token
    );
  }

  parseArrowFunctionExpression(): Expression {
    const token = this.expect("left_paren");

    const parameters = this.parseParams(true);

    // right paren?

    this.expect("arrow");

    const body = this.parseStatement();

    return withLocation(
      {
        type: "function",
        parameters,
        body,
      },
      token
    );
  }

  parseFunctionExpression(): Expression {
    const token = this.expectWithValue("keyword", "function");

    let identifier: string;

    if (this.nextTokenIsType("identifier")) {
      const identifierToken = this.expect("identifier");
      identifier = identifierToken.value;
    }

    this.expect("left_paren");

    const parameters = this.parseParams(true);

    // right paren?

    const body = this.parseStatement();

    return withLocation(
      {
        type: "function",
        identifier,
        parameters,
        body,
      },
      token
    );
  }

  parseObjectExpression(): Expression {
    const token = this.expect("left_brace");

    const properties: Record<string, Expression> = {};

    while (!this.nextTokenIsType("right_brace")) {
      const identifier = this.expect("identifier");

      if (this.peekNextToken().type === "colon") {
        this.expect("colon");
        properties[identifier.value] = this.parseExpression(0);
      } else {
        properties[identifier.value] = withLocation(
          {
            type: "identifier",
            value: identifier.value,
          },
          identifier
        );
      }

      if (this.nextTokenIsType("comma")) {
        this.index++;
      }
    }

    this.index++;

    return withLocation(
      {
        type: "object",
        properties,
      },
      token
    );
  }

  parseArrayExpression(): Expression {
    const token = this.expect("left_bracket");

    const elements = [];

    while (!this.nextTokenIsType("right_bracket")) {
      elements.push(this.parseExpression(0));

      if (this.nextTokenIsType("comma")) {
        this.index++;
      }
    }

    this.index++;

    return withLocation(
      {
        type: "array",
        elements,
      },
      token
    );
  }

  parseTemplateLiteral(startToken: Token): Expression {
    const quasis: string[] = [];
    const expressions: Expression[] = [];

    while (true) {
      let chunk = "";
      if (this.nextTokenIsType("template_chunk")) {
        const chunkToken = this.expect("template_chunk");
        chunk = decodeTemplateChunk(chunkToken.value);
      }
      quasis.push(chunk);

      if (this.nextTokenIsType("template_end")) {
        this.expect("template_end");
        break;
      }

      this.expect("template_expr_start");
      expressions.push(this.parseExpression(0));
      this.expect("template_expr_end");
    }

    return withLocation(
      {
        type: "template_literal",
        quasis,
        expressions,
      },
      startToken
    );
  }

  isArrowFunctionExpression() {
    const next0 = this.peekNextToken()?.type;
    const next1 = this.peekNextToken(1)?.type;
    const next2 = this.peekNextToken(2)?.type;

    if (next0 !== "left_paren") return false;

    // () => {}
    if (next1 === "right_paren") return true;
    // (a) => {}
    if (next1 === "identifier" && next2 === "right_paren") return true;
    // (a=b) => {}
    if (next1 === "identifier" && next2 === "equals") return true;
    // (a,b) => {}
    if (next1 === "identifier" && next2 === "comma") return true;
    // (...a) => {}
    if (next1 === "spread" && next2 === "identifier") return true;

    return false;
  }

  parseUnaryExpression(): Expression {
    const token = this.tokens[this.index];

    let operator: UnaryOperator;

    if (token.type === "keyword" && token.value === "typeof") {
      operator = "typeof";
    } else if (token.type === "not") {
      operator = "!";
    } else {
      throw syntaxError(`${token.value} is not an operator`, token);
    }

    this.index++;

    const expression = this.parseExpression(15);

    return withLocation(
      {
        type: "unary",
        operator,
        expression,
      },
      token
    );
  }

  parsePrimary(): Expression {
    if (this.isArrowFunctionExpression()) {
      return this.parseArrowFunctionExpression();
    }

    if (this.peekNextToken()?.type === "left_paren") {
      this.expect("left_paren");
      const expression = this.parseExpression();
      this.expect("right_paren");
      return expression;
    }

    const token = this.nextToken();

    let left: Expression;

    switch (token.type) {
      case "identifier": {
        left = withLocation({ type: "identifier", value: token.value }, token);
        break;
      }

      case "number": {
        left = withLocation(
          { type: "number", value: parseFloat(token.value) },
          token
        );
        break;
      }

      case "string": {
        left = withLocation({ type: "string", value: token.value }, token);
        break;
      }

      case "template_start": {
        left = this.parseTemplateLiteral(token);
        break;
      }

      case "keyword": {
        if (token.value === "true" || token.value === "false") {
          left = withLocation(
            { type: "boolean", value: token.value === "true" },
            token
          );
          break;
        }

        if (token.value === "null") {
          left = withLocation({ type: "null" }, token);
          break;
        }

        if (token.value === "typeof") {
          this.backup();
          left = this.parseUnaryExpression();
          break;
        }

        if (token.value === "function") {
          let identifier: string;

          if (this.peekNextToken()?.type === "identifier") {
            identifier = this.expect("identifier").value;
          }

          const parameters: Parameter[] = [];

          this.expect("left_paren");

          while (this.peekNextToken()?.type !== "right_paren") {
            const param = this.expect("identifier");
            parameters.push({ name: param.value });

            if (this.peekNextToken()?.type !== "right_paren") {
              this.expect("comma");
            }
          }

          this.expect("right_paren");

          const body = this.parseBlockStatement();

          left = withLocation(
            {
              type: "function",
              identifier: identifier,
              parameters,
              body,
            },
            token
          );
          break;
        }

        if (token.value === "new") {
          const identifier = this.expect("identifier");

          const args: Expression[] = [];

          this.expect("left_paren");

          while (this.peekNextToken().type !== "right_paren") {
            args.push(this.parseExpression(0));

            if (this.peekNextToken().type !== "right_paren") {
              this.expect("comma");
            }
          }

          this.expect("right_paren");

          left = withLocation(
            {
              type: "new",
              identifier: identifier.value,
              arguments: args,
            },
            token
          );
          break;
        }

        if (token.value === "super") {
          if (this.peekNextToken()?.type === "left_paren") {
            // super() call
            this.expect("left_paren");

            const args: Expression[] = [];
            while (this.peekNextToken()?.type !== "right_paren") {
              args.push(this.parseExpression(0));
              if (this.peekNextToken()?.type !== "right_paren") {
                this.expect("comma");
              }
            }

            this.expect("right_paren");

            left = withLocation(
              {
                type: "super_call",
                arguments: args,
              },
              token
            );
            break;
          } else if (this.peekNextToken()?.type === "dot") {
            // super.method
            this.expect("dot");
            const property = this.expect("identifier");

            left = withLocation(
              {
                type: "super_member",
                property: property.value,
              },
              token
            );
            break;
          } else {
            throw syntaxError(`invalid use of super`, token);
          }
        }

        throw new Error("unexpected token: " + token.type + ": " + token.value);
      }

      case "left_brace": {
        this.index--;
        left = this.parseObjectExpression();
        break;
      }

      case "left_bracket": {
        this.index--;
        left = this.parseArrayExpression();
        break;
      }

      case "right_paren": {
        this.index--;
        this.index--;
        left = this.parseArrowFunctionExpression();
        break;
      }

      case "not": {
        this.index--;
        left = this.parseUnaryExpression();
        break;
      }

      case "spread": {
        left = withLocation(
          {
            type: "spread",
            expression: this.parseExpression(),
          },
          token
        );
        break;
      }

      case "decrement": {
        left = withLocation(
          {
            type: "decrement",
            expression: this.parseExpression(),
            postfix: false,
          },
          token
        );
        break;
      }

      case "increment": {
        left = withLocation(
          {
            type: "increment",
            expression: this.parseExpression(),
            postfix: false,
          },
          token
        );
        break;
      }

      default:
        unexpectedToken("eof", token);
    }

    while (true) {
      const next = this.peekNextToken();
      if (next?.type === "dot") {
        this.nextToken();
        const right = this.expect("identifier");

        left = withLocation(
          {
            type: "member",
            object: left,
            property: withLocation(
              { type: "identifier", value: right.value },
              right
            ),
            computed: false,
          },
          token
        );
      } else if (next?.type === "left_bracket") {
        this.nextToken();

        const property = this.parseExpression(0);

        this.expect("right_bracket");

        left = withLocation(
          {
            type: "member",
            object: left,
            property: property,
            computed: true,
          },
          token
        );
      } else if (next?.type === "left_paren") {
        this.nextToken();
        const args: Expression[] = [];
        while (this.peekNextToken().type !== "right_paren") {
          args.push(this.parseExpression(0));

          if (this.peekNextToken().type !== "right_paren") {
            this.expect("comma");
          }
        }

        this.expect("right_paren");
        left = withLocation(
          { type: "call", func: left, arguments: args },
          next
        );
      } else if (next?.type === "increment") {
        this.expect("increment");
        left = withLocation(
          {
            type: "increment",
            expression: left,
            postfix: true,
          },
          token
        );
      } else if (next?.type === "decrement") {
        this.expect("decrement");

        left = withLocation(
          {
            type: "decrement",
            expression: left,
            postfix: true,
          },
          token
        );
      } else {
        break;
      }
    }

    const assignmentToken = this.peekNextToken();

    if (assignmentToken) {
      const operator = ASSIGNMENT_TOKEN_TO_OPERATOR[assignmentToken.type];
      if (operator) {
        this.nextToken();

        const value = this.parseExpression();

        return withLocation(
          {
            type: "assignment",
            operator,
            left,
            right: value,
          },
          token
        );
      }
    }

    return left;
  }

  isOperatorTokenType(token: Token) {
    if (!token) return false;

    return token.type in TOKEN_TO_OPERATOR;
  }

  parseExpression(precedence = 0): Expression {
    let left = this.parsePrimary();

    while (this.isOperatorTokenType(this.peekNextToken())) {
      const operatorToken = this.peekNextToken()!;
      const operator = getOperatorFromToken(operatorToken);

      const operatorPrecedence = OPERATOR_PRECEDENCE[operator];

      // Only parse next operator if its precedence is higher or equal
      if (operatorPrecedence > precedence) {
        this.nextToken(); // consume the operator
        const right = this.parseExpression(operatorPrecedence);

        left = withLocation(
          {
            type: "binary",
            operator,
            left,
            right,
          },
          operatorToken
        );
      } else {
        break;
      }
    }

    const conditionalPrecedence = OPERATOR_PRECEDENCE["||"] - 1;

    while (
      this.peekNextToken()?.type === "question_mark" &&
      precedence <= conditionalPrecedence
    ) {
      const testExpression = left;
      this.expect("question_mark");
      const consequent = this.parseExpression(0);
      this.expect("colon");
      const alternate = this.parseExpression(precedence);

      left = {
        type: "conditional",
        test: testExpression,
        consequent,
        alternate,
        location: testExpression.location,
      };
    }

    return left;
  }

  parseVariableDeclaration(): Statement {
    const keywordToken = this.expect("keyword");

    if (!["var", "const", "let"].includes(keywordToken.value)) {
      unexpectedToken("eof", keywordToken);
    }

    const declarations: VariableDeclarator[] = [];

    while (true) {
      const identifierToken = this.expect("identifier");

      let value: Expression | undefined;

      if (this.nextTokenIsType("equals")) {
        this.expect("equals");
        value = this.parseExpression(0);
      } else if (keywordToken.value === "const") {
        syntaxError("const declaration must have initial value", keywordToken);
      }

      declarations.push({ identifier: identifierToken.value, value });

      if (!this.nextTokenIsType("comma")) {
        break;
      }

      this.expect("comma");
    }

    return withLocation(
      {
        type: "variable_declaration",
        declarationType: "var",
        declarations,
        varType: keywordToken.value as "var" | "const" | "let",
      },
      keywordToken
    );
  }

  parseBlockStatement(): Statement {
    const token = this.expect("left_brace");

    const body: Statement[] = [];

    while (!this.nextTokenIsType("right_brace")) {
      body.push(this.parseStatement());
    }

    this.index++;

    return withLocation(
      {
        type: "block",
        body,
      },
      token
    );
  }

  parseExpressionStatement(): Statement {
    const token = this.tokens[this.index];

    const expression = this.parseExpression(0);

    if (this.nextTokenIsType("semicolon")) {
      this.expect("semicolon");
    }

    return withLocation(
      {
        type: "expression",
        expression,
      },
      token
    );
  }

  parseFunctionDeclarationStatement(): Statement {
    const token = this.expectWithValue("keyword", "function");

    const identifier = this.expect("identifier");

    this.expect("left_paren");

    const parameters = this.parseParams(true);

    const body = this.parseStatement();

    return withLocation(
      {
        type: "function_declaration",
        identifier: identifier.value,
        parameters,
        body,
      },
      token
    );
  }

  parseIfStatement(): Statement {
    const token = this.expectWithValue("keyword", "if");

    this.expect("left_paren");

    const condition = this.parseExpression(0);

    this.expect("right_paren");

    const ifBody = this.parseStatement();

    let elseBody: Statement;

    if (this.nextTokenIsType("keyword")) {
      const keyword = this.expect("keyword");

      if (keyword.value === "else") {
        elseBody = this.parseStatement();
      } else {
        this.backup();
      }
    }

    return withLocation(
      {
        type: "if",
        condition,
        ifBody,
        elseBody,
      },
      token
    );
  }

  parseWhileStatement(): Statement {
    const token = this.expectWithValue("keyword", "while");

    this.expect("left_paren");

    const condition = this.parseExpression(0);

    this.expect("right_paren");

    const body = this.parseStatement();

    return withLocation(
      {
        type: "while",
        condition,
        body,
      },
      token
    );
  }

  parseForStatement(): Statement {
    const token = this.expectWithValue("keyword", "for");

    this.expect("left_paren");

    const init = this.parseStatement();

    let test: Expression | undefined;
    if (!this.nextTokenIsType("semicolon")) {
      test = this.parseExpression(0);
    }

    this.expect("semicolon");

    let update: Expression | undefined;
    if (!this.nextTokenIsType("right_paren")) {
      update = this.parseExpression(0);
    }

    this.expect("right_paren");

    const body = this.parseStatement();

    return withLocation(
      {
        type: "for",
        init,
        test,
        update,
        body,
      },
      token
    );
  }

  parseParams(allowDefaults = false): Parameter[] {
    const params: Parameter[] = [];
    let consumedSpread = false;

    while (this.peekNextToken()?.type !== "right_paren") {
      if (this.peekNextToken()?.type === "spread") {
        this.expect("spread");

        const identifier = this.expect("identifier");
        params.push({ name: identifier.value, spread: true });
        consumedSpread = true;
        break;
      }

      const identifierToken = this.expect("identifier");
      let defaultValue: Expression | undefined;

      if (allowDefaults && this.peekNextToken()?.type === "equals") {
        this.expect("equals");
        defaultValue = this.parseExpression(0);
      }

      params.push({ name: identifierToken.value, defaultValue });

      if (this.peekNextToken()?.type !== "right_paren") {
        this.expect("comma");
      }
    }

    this.expect("right_paren");

    if (consumedSpread && this.peekNextToken()?.type === "comma") {
      unexpectedToken("right_paren", this.peekNextToken());
    }

    return params;
  }

  parseClassMethodDeclaration(isStatic: boolean): ClassMethodDeclaration {
    const id = this.expect("identifier");

    this.expect("left_paren");

    const params = this.parseParams(true);

    const body = this.parseBlockStatement();

    return {
      name: id.value,
      parameters: params,
      body: body,
      static: isStatic,
    };
  }

  parseClassPropertyDeclaration(isStatic: boolean): ClassPropertyDeclaration {
    const id = this.expect("identifier");

    // property without initial value
    if (this.peekNextToken()?.type === "semicolon") {
      this.nextToken();
      return {
        name: id.value,
        static: isStatic,
      };
    }

    this.expect("equals");

    const value = this.parseExpression(0);

    if (this.nextTokenIsType("semicolon")) {
      this.expect("semicolon");
    }

    return {
      name: id.value,
      value: value,
      static: isStatic,
    };
  }

  parseClassDeclarationStatement(): Statement {
    const token = this.expectWithValue("keyword", "class");

    const className = this.expect("identifier");

    let superClass: string | undefined;

    if (this.peekNextToken().type === "keyword") {
      const next = this.nextToken();
      if (next.value !== "extends") {
        unexpectedToken("left_brace", next);
      }

      const identifier = this.expect("identifier");

      superClass = identifier.value;
    }

    this.expect("left_brace");

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

      peek = this.peekNextToken();

      if (
        peek?.type === "left_paren" ||
        (peek?.type === "keyword" && peek?.value === "static")
      ) {
        this.backup();
        methods.push(this.parseClassMethodDeclaration(isStatic));
      } else if (peek?.type === "semicolon" || peek?.type === "equals") {
        this.backup();
        properties.push(this.parseClassPropertyDeclaration(isStatic));
      } else {
        unexpectedToken("eof", this.tokens[this.index]);
      }
    }

    this.expect("right_brace");

    return withLocation(
      {
        type: "class_declaration",
        identifier: className.value,
        properties,
        methods,
        superClass,
      },
      token
    );
  }

  parseSwitchStatement(): Statement {
    const token = this.expectWithValue("keyword", "switch");

    this.expect("left_paren");

    const condition = this.parseExpression(0);

    this.expect("right_paren");

    this.expect("left_brace");

    const cases: SwitchCase[] = [];

    let defaultCase: Statement | undefined;

    while (!this.nextTokenIsType("right_brace")) {
      const next = this.peekNextToken();

      if (next?.type === "keyword" && next.value === "case") {
        this.expectWithValue("keyword", "case");

        const test = this.parseExpression(0);

        this.expect("colon");

        const body: Statement[] = [];

        while (
          !this.nextTokenIsType("right_brace") &&
          !(
            this.peekNextToken()?.type === "keyword" &&
            (this.peekNextToken()?.value === "case" ||
              this.peekNextToken()?.value === "default")
          )
        ) {
          body.push(this.parseStatement());
        }

        cases.push({
          test,
          body,
        });

        continue;
      }

      if (next?.type === "keyword" && next.value === "default") {
        if (defaultCase) {
          syntaxError("duplicate default clause in switch statement", next);
        }

        const defaultToken = this.expectWithValue("keyword", "default");

        this.expect("colon");

        const body: Statement[] = [];

        while (
          !this.nextTokenIsType("right_brace") &&
          !(
            this.peekNextToken()?.type === "keyword" &&
            this.peekNextToken()?.value === "case"
          )
        ) {
          body.push(this.parseStatement());
        }

        if (body.length === 0) {
          defaultCase = withLocation({ type: "block", body: [] }, defaultToken);
        } else if (body.length === 1) {
          defaultCase = body[0];
        } else {
          defaultCase = withLocation({ type: "block", body }, defaultToken);
        }

        continue;
      }

      if (next) {
        syntaxError("unexpected token in switch statement", next);
      } else {
        unexpectedToken("right_brace", this.tokens[this.index - 1]);
      }
    }

    this.expect("right_brace");

    return withLocation(
      {
        type: "switch",
        condition,
        cases,
        default: defaultCase,
      },
      token
    );
  }

  parseReturnStatement(): Statement {
    const token = this.expectWithValue("keyword", "return");

    if (this.peekNextToken().type === "semicolon") {
      this.expect("semicolon");
      return withLocation({ type: "return" }, token);
    }

    const expressionResult = this.parseExpression(0);

    this.expect("semicolon");

    return withLocation(
      { type: "return", expression: expressionResult },
      token
    );
  }

  parseBreakStatement(): Statement {
    const token = this.expectWithValue("keyword", "break");

    if (this.peekNextToken().type === "semicolon") {
      this.expect("semicolon");
    }

    return withLocation({ type: "break" }, token);
  }

  parseStatement(): Statement {
    const token = this.tokens[this.index];

    switch (token.type) {
      case "semicolon":
        this.index++;
        return withLocation({ type: "empty" }, token);
      case "number":
      case "string":
      case "identifier":
      case "left_paren":
      case "left_bracket":
      case "template_start":
      case "not":
      case "decrement":
      case "increment":
      case "spread":
        return this.parseExpressionStatement();
      case "keyword":
        if (
          token.value === "true" ||
          token.value === "false" ||
          token.value === "new" ||
          token.value === "null" ||
          token.value === "super" ||
          token.value === "typeof"
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

        if (token.value === "for") {
          return this.parseForStatement();
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

        unexpectedToken("eof", token);
        break;

      case "left_brace": {
        return this.parseBlockStatement();
      }

      default:
        unexpectedToken("eof", token);
    }
  }

  parse(tokens: Token[]): Program {
    this.tokens = tokens;
    this.index = 0;

    const body: Statement[] = [];

    while (this.index < tokens.length) {
      body.push(this.parseStatement());
    }

    return { type: "program", body };
  }
}
