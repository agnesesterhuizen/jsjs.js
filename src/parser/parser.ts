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
  SwitchCase,
  VariableDeclarator,
  WithLocation,
  UnaryOperator,
  ImportSpecifier,
  ExportSpecifier,
  Location,
  CatchClause,
  Pattern,
  ObjectPatternProperty,
  isOperatorToken,
} from "./ast.ts";
import { Token, TokenType } from "../parser/lexer.ts";

const formatLocation = (t?: Token) => {
  if (!t) return "";

  return ` at ${t.filename}:${t.line}:${t.col}`;
};

const unexpectedToken = (expected: TokenType, actual: Token) => {
  const err = {
    type: "unexpected_token",
    message:
      "unexpected token: expected " +
      expected +
      ", got " +
      actual.value +
      formatLocation(actual),
  };

  return new Error(JSON.stringify(err));
};

const syntaxError = (message: string, token: Token) => {
  const err = {
    type: "syntax_error",
    message: message + formatLocation(token),
  };

  return new Error(JSON.stringify(err));
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
  source: Token | Location
): WithLocation<T> {
  if ("filename" in source) {
    const token = source;
    return {
      ...node,
      location: {
        file: token.filename,
        line: token.line,
        column: token.col,
      },
    };
  }

  return {
    ...node,
    location: source,
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
      throw unexpectedToken("eof", token);
    }

    if (token.type !== type) {
      throw unexpectedToken(type, token);
    }

    this.index++;
    return token;
  }

  expectWithValue(type: TokenType, value: string): Token {
    const token = this.expect(type);
    if (token.value !== value) {
      throw unexpectedToken(type, token);
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

  expectIdentifierName(): Token {
    const token = this.nextToken();

    if (token.type !== "identifier" && token.type !== "keyword") {
      throw unexpectedToken("identifier", token);
    }

    return token;
  }

  expectContextualKeyword(value: string): Token {
    const token = this.nextToken();

    if (
      (token.type !== "identifier" && token.type !== "keyword") ||
      token.value !== value
    ) {
      throw unexpectedToken("identifier", token);
    }

    return token;
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
      throw unexpectedToken("eof", token);
    }

    return withLocation(
      {
        type: "boolean",
        value: token.value === "true",
      },
      token
    );
  }

  parseArrowFunctionExpression(allowComma = true): Expression {
    const token = this.expect("left_paren");

    const parameters = this.parseParams(true);

    // right paren?

    this.expect("arrow");

    const body = this.parseStatement(allowComma);

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

    let identifier: string | undefined;

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
      let propertyName: string;
      const propertyToken = this.peekNextToken();

      if (!propertyToken) {
        throw unexpectedToken("eof", token);
      }

      if (propertyToken.type === "identifier") {
        const identifier = this.expect("identifier");
        propertyName = identifier.value;
      } else if (propertyToken.type === "string") {
        const stringToken = this.expect("string");
        propertyName = stringToken.value;
      } else if (propertyToken.type === "number") {
        const numberToken = this.expect("number");
        propertyName = numberToken.value;
      } else if (propertyToken.type === "keyword") {
        const keywordToken = this.expect("keyword");
        propertyName = keywordToken.value;
      } else {
        const identifier = this.expect("identifier");
        propertyName = identifier.value;
      }

      if (this.peekNextToken().type === "colon") {
        this.expect("colon");
        properties[propertyName] = this.parseExpression(0, false);
      } else if (this.peekNextToken().type === "left_paren") {
        // method shorthand syntax: propertyName() { ... }
        this.expect("left_paren");
        const parameters = this.parseParams(true);
        const body = this.parseStatement(false);

        properties[propertyName] = withLocation(
          {
            type: "function",
            parameters,
            body,
          },
          propertyToken
        );
      } else {
        properties[propertyName] = withLocation(
          {
            type: "identifier",
            value: propertyName,
          },
          propertyToken
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
      elements.push(this.parseExpression(0, false));

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

  parseImportDeclaration(): Statement {
    const importToken = this.expectWithValue("keyword", "import");

    const specifiers: ImportSpecifier[] = [];

    if (this.nextTokenIsType("string")) {
      const sourceToken = this.expect("string");

      if (this.nextTokenIsType("semicolon")) {
        this.expect("semicolon");
      }

      return withLocation(
        {
          type: "import_declaration",
          source: sourceToken.value,
          specifiers,
        },
        importToken
      );
    }

    if (this.nextTokenIsType("identifier")) {
      const defaultToken = this.expect("identifier");
      specifiers.push({ type: "import_default", local: defaultToken.value });

      if (this.nextTokenIsType("comma")) {
        this.expect("comma");
      }
    }

    if (this.nextTokenIsType("multiply")) {
      this.expect("multiply");
      this.expectContextualKeyword("as");
      const namespaceToken = this.expectIdentifierName();
      specifiers.push({
        type: "import_namespace",
        local: namespaceToken.value,
      });
    } else if (this.nextTokenIsType("left_brace")) {
      this.expect("left_brace");

      while (!this.nextTokenIsType("right_brace")) {
        const importedToken = this.expectIdentifierName();
        const importedName = importedToken.value;
        let localName = importedName;

        const next = this.peekNextToken();
        if (
          next &&
          (next.type === "identifier" || next.type === "keyword") &&
          next.value === "as"
        ) {
          this.expectIdentifierName();
          const localToken = this.expectIdentifierName();
          localName = localToken.value;
        }

        specifiers.push({
          type: "import_named",
          imported: importedName,
          local: localName,
        });

        if (this.nextTokenIsType("comma")) {
          this.expect("comma");
        } else {
          break;
        }
      }

      this.expect("right_brace");
    }

    this.expectContextualKeyword("from");
    const sourceToken = this.expect("string");

    if (this.nextTokenIsType("semicolon")) {
      this.expect("semicolon");
    }

    return withLocation(
      {
        type: "import_declaration",
        source: sourceToken.value,
        specifiers,
      },
      importToken
    );
  }

  parseExportDeclaration(): Statement {
    const exportToken = this.expectWithValue("keyword", "export");

    if (
      this.peekNextToken()?.type === "keyword" &&
      this.peekNextToken()?.value === "default"
    ) {
      this.expectWithValue("keyword", "default");

      const next = this.peekNextToken();

      if (next?.type === "keyword" && next.value === "function") {
        const declaration = this.parseFunctionDeclarationStatement();

        if (this.nextTokenIsType("semicolon")) {
          this.expect("semicolon");
        }

        return withLocation(
          {
            type: "export_declaration",
            exportKind: "default",
            declaration,
          },
          exportToken
        );
      }

      if (next?.type === "keyword" && next.value === "class") {
        const declaration = this.parseClassDeclarationStatement();

        if (this.nextTokenIsType("semicolon")) {
          this.expect("semicolon");
        }

        return withLocation(
          {
            type: "export_declaration",
            exportKind: "default",
            declaration,
          },
          exportToken
        );
      }

      const declaration = this.parseExpression(0);

      if (this.nextTokenIsType("semicolon")) {
        this.expect("semicolon");
      }

      return withLocation(
        {
          type: "export_declaration",
          exportKind: "default",
          declaration,
        },
        exportToken
      );
    }

    if (this.nextTokenIsType("left_brace")) {
      this.expect("left_brace");
      const specifiers: ExportSpecifier[] = [];

      while (!this.nextTokenIsType("right_brace")) {
        const localToken = this.expectIdentifierName();
        const localName = localToken.value;
        let exportedName = localName;

        const next = this.peekNextToken();
        if (
          next &&
          (next.type === "identifier" || next.type === "keyword") &&
          next.value === "as"
        ) {
          this.expectIdentifierName();
          const exportedToken = this.expectIdentifierName();
          exportedName = exportedToken.value;
        }

        specifiers.push({
          type: "export_named",
          local: localName,
          exported: exportedName,
        });

        if (this.nextTokenIsType("comma")) {
          this.expect("comma");
        } else {
          break;
        }
      }

      this.expect("right_brace");

      let source: string | undefined;
      const next = this.peekNextToken();
      if (
        next &&
        (next.type === "identifier" || next.type === "keyword") &&
        next.value === "from"
      ) {
        this.expectContextualKeyword("from");
        source = this.expect("string").value;
      }

      if (this.nextTokenIsType("semicolon")) {
        this.expect("semicolon");
      }

      return withLocation(
        {
          type: "export_declaration",
          exportKind: "named",
          specifiers,
          source,
        },
        exportToken
      );
    }

    if (this.nextTokenIsType("multiply")) {
      this.expect("multiply");

      let exportedName: string | undefined;
      const next = this.peekNextToken();
      if (
        next &&
        (next.type === "identifier" || next.type === "keyword") &&
        next.value === "as"
      ) {
        this.expectContextualKeyword("as");
        exportedName = this.expectIdentifierName().value;
      }

      this.expectContextualKeyword("from");
      const sourceToken = this.expect("string");

      if (this.nextTokenIsType("semicolon")) {
        this.expect("semicolon");
      }

      const specifiers: ExportSpecifier[] = exportedName
        ? [{ type: "export_namespace", exported: exportedName }]
        : [];

      return withLocation(
        {
          type: "export_declaration",
          exportKind: "all",
          source: sourceToken.value,
          specifiers,
        },
        exportToken
      );
    }

    const declaration = this.parseStatement();

    return withLocation(
      {
        type: "export_declaration",
        exportKind: "named",
        declaration,
      },
      exportToken
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
    const start = this.peekNextToken();
    if (!start || start.type !== "left_paren") {
      return false;
    }

    let depth = 0;
    for (let cursor = this.index; cursor < this.tokens.length; cursor++) {
      const token = this.tokens[cursor];

      if (token.type === "left_paren") {
        depth++;
        continue;
      }

      if (token.type === "right_paren") {
        depth--;

        if (depth === 0) {
          const after = this.tokens[cursor + 1];
          return after?.type === "arrow";
        }

        continue;
      }
    }

    return false;
  }

  parseUnaryExpression(): Expression {
    const token = this.tokens[this.index];

    let operator: UnaryOperator;

    if (token.type === "keyword") {
      if (token.value === "typeof") {
        operator = "typeof";
      } else if (token.value === "void") {
        operator = "void";
      }
    } else if (token.type === "not") {
      operator = "!";
    } else if (token.type === "plus") {
      operator = "+";
    } else if (token.type === "minus") {
      operator = "-";
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

  parsePrimary(allowComma = true): Expression {
    if (this.isArrowFunctionExpression()) {
      return this.parseArrowFunctionExpression(allowComma);
    }

    const expressionStartIndex = this.index;
    let left: Expression;
    let locationSource: Token | Location;

    if (this.peekNextToken()?.type === "left_paren") {
      this.expect("left_paren");
      left = this.parseExpression();
      this.expect("right_paren");
      locationSource = left.location;
    } else {
      const token = this.nextToken();

      switch (token.type) {
        case "identifier": {
          left = withLocation(
            { type: "identifier", value: token.value },
            token
          );
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

        case "regex": {
          const pattern = token.value;
          const flags =
            (token as Token & { regexFlags?: string }).regexFlags ?? "";
          left = withLocation({ type: "regex", pattern, flags }, token);
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

          if (token.value === "typeof" || token.value === "void") {
            this.backup();
            left = this.parseUnaryExpression();
            break;
          }

          if (token.value === "function") {
            this.backup();
            left = this.parseFunctionExpression();
            break;
          }

          if (token.value === "class") {
            this.backup();
            left = this.parseClassExpression();
            break;
          }

          if (token.value === "new") {
            const identifier = this.expect("identifier");

            const args: Expression[] = [];

            this.expect("left_paren");

            while (this.peekNextToken().type !== "right_paren") {
              args.push(this.parseExpression(0, false));

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
                args.push(this.parseExpression(0, false));
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

          throw unexpectedToken("keyword", token);
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
          left = this.parseArrowFunctionExpression(allowComma);
          break;
        }

        case "not":
        case "plus":
        case "minus": {
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
          throw unexpectedToken("eof", token);
      }

      locationSource = token;
    }

    while (true) {
      let next = this.peekNextToken();

      let optional = false;

      if (
        next?.type === "question_mark" &&
        this.peekNextToken(1)?.type === "dot"
      ) {
        this.expect("question_mark");
        optional = true;
        next = this.peekNextToken();
      }

      if (next?.type === "dot") {
        this.nextToken();
        if (this.peekNextToken()?.type === "identifier") {
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
              optional,
            },
            locationSource
          );
        } else if (this.peekNextToken()?.type === "keyword") {
          const keywordToken = this.expect("keyword");

          left = withLocation(
            {
              type: "member",
              object: left,
              property: withLocation(
                { type: "identifier", value: keywordToken.value },
                keywordToken
              ),
              computed: false,
              optional,
            },
            locationSource
          );
        } else {
          throw unexpectedToken("identifier", this.peekNextToken());
        }
      } else if (next?.type === "left_bracket") {
        this.nextToken();

        const property = this.parseExpression(0, false);

        this.expect("right_bracket");

        left = withLocation(
          {
            type: "member",
            object: left,
            property: property,
            computed: true,
            optional,
          },
          locationSource
        );
      } else if (next?.type === "left_paren") {
        this.nextToken();
        const args: Expression[] = [];
        while (this.peekNextToken().type !== "right_paren") {
          args.push(this.parseExpression(0, false));

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
          locationSource
        );
      } else if (next?.type === "decrement") {
        this.expect("decrement");

        left = withLocation(
          {
            type: "decrement",
            expression: left,
            postfix: true,
          },
          locationSource
        );
      } else {
        break;
      }
    }

    const assignmentToken = this.peekNextToken();

    if (assignmentToken) {
      const operator = ASSIGNMENT_TOKEN_TO_OPERATOR[assignmentToken.type];
      if (operator) {
        const leftEndIndex = this.index;
        const savedIndex = this.index;
        this.index = expressionStartIndex;
        const assignmentTarget = this.parseAssignmentTarget();
        if (this.index !== leftEndIndex) {
          throw syntaxError(
            "invalid left-hand side in assignment",
            assignmentToken
          );
        }
        this.index = savedIndex;

        if (operator !== "=" && assignmentTarget.type === "pattern_object") {
          throw syntaxError(
            "Destructuring assignments must use '=' operator",
            assignmentToken
          );
        }

        this.nextToken();

        const value = this.parseExpression(0, false);

        return withLocation(
          {
            type: "assignment",
            operator,
            left: assignmentTarget,
            right: value,
          },
          locationSource
        );
      }
    }

    return left;
  }

  parseExpression(
    precedence = 0,
    allowComma = true,
    excludeIn = false
  ): Expression {
    let left = this.parsePrimary(allowComma);

    while (isOperatorToken(this.peekNextToken())) {
      const operatorToken = this.peekNextToken()!;

      // for for-in loop
      if (
        excludeIn &&
        operatorToken.type === "keyword" &&
        operatorToken.value === "in"
      ) {
        break;
      }

      const operator = getOperatorFromToken(operatorToken);

      const operatorPrecedence = OPERATOR_PRECEDENCE[operator];

      // Only parse next operator if its precedence is higher or equal
      if (operatorPrecedence > precedence) {
        this.nextToken(); // consume the operator
        const right = this.parseExpression(
          operatorPrecedence,
          allowComma,
          excludeIn
        );

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
      const consequent = this.parseExpression(0, allowComma, excludeIn);
      this.expect("colon");
      const alternate = this.parseExpression(precedence, allowComma, excludeIn);

      left = {
        type: "conditional",
        test: testExpression,
        consequent,
        alternate,
        location: testExpression.location,
      };
    }

    if (
      allowComma &&
      precedence <= 0 &&
      this.peekNextToken()?.type === "comma"
    ) {
      const expressions: Expression[] = [left];
      const location = left.location;

      while (this.peekNextToken()?.type === "comma") {
        this.expect("comma");
        expressions.push(this.parseExpression(0, false, excludeIn));
      }

      return {
        type: "comma",
        expressions,
        location,
      };
    }

    return left;
  }

  parseVariableDeclaration(): Statement {
    const keywordToken = this.expect("keyword");

    if (!["var", "const", "let"].includes(keywordToken.value)) {
      throw unexpectedToken("eof", keywordToken);
    }

    const declarations: VariableDeclarator[] = [];

    while (true) {
      const pattern = this.parseBindingPattern();

      let value: Expression | undefined;

      if (this.nextTokenIsType("equals")) {
        this.expect("equals");
        value = this.parseExpression(0, false);
      } else if (
        keywordToken.value === "const" &&
        !this.isForInOrOfLookahead()
      ) {
        throw syntaxError(
          "const declaration must have initial value",
          keywordToken
        );
      }

      declarations.push({ id: pattern, value });

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

  isForInOrOfLookahead(): boolean {
    const next = this.peekNextToken();
    if (!next) return false;
    if (next.type !== "keyword" && next.type !== "identifier") {
      return false;
    }
    return next.value === "in" || next.value === "of";
  }

  parseBindingPattern(): Pattern {
    const next = this.peekNextToken();

    if (!next) {
      throw unexpectedToken("identifier", next);
    }

    if (next.type === "left_brace") {
      return this.parseObjectPattern("binding");
    }

    if (next.type === "identifier") {
      const token = this.expect("identifier");
      return withLocation(
        { type: "pattern_identifier", name: token.value },
        token
      );
    }

    throw unexpectedToken("identifier", next);
  }

  parseAssignmentPattern(): Pattern {
    return this.parseAssignmentTarget();
  }

  parseObjectPattern(kind: "binding" | "assignment"): Pattern {
    const startToken = this.expect("left_brace");

    const properties: ObjectPatternProperty[] = [];
    let sawRest = false;

    while (!this.nextTokenIsType("right_brace")) {
      if (this.peekNextToken()?.type === "spread") {
        const spreadToken = this.expect("spread");
        if (sawRest) {
          throw syntaxError(
            "Multiple rest properties in object pattern",
            spreadToken
          );
        }

        const argument =
          kind === "binding"
            ? this.parseBindingPattern()
            : this.parseAssignmentPattern();

        if (argument.type !== "pattern_identifier") {
          throw syntaxError("Rest element must be an identifier", spreadToken);
        }

        properties.push(
          withLocation(
            {
              type: "pattern_rest",
              argument,
            },
            spreadToken
          )
        );
        sawRest = true;

        if (!this.nextTokenIsType("right_brace")) {
          throw syntaxError(
            "Rest element must be the last property",
            spreadToken
          );
        }
        break;
      }

      const keyToken = this.nextToken();
      let key: string;

      if (keyToken.type === "identifier" || keyToken.type === "keyword") {
        key = keyToken.value;
      } else if (keyToken.type === "string" || keyToken.type === "number") {
        key = keyToken.value;
      } else {
        throw unexpectedToken("identifier", keyToken);
      }

      let valuePattern: Pattern;
      let defaultValue: Expression | undefined;

      if (this.peekNextToken()?.type === "colon") {
        this.expect("colon");
        valuePattern =
          kind === "binding"
            ? this.parseBindingPattern()
            : this.parseAssignmentPattern();
      } else {
        if (keyToken.type !== "identifier") {
          throw unexpectedToken("identifier", keyToken);
        }
        valuePattern = withLocation(
          { type: "pattern_identifier", name: key },
          keyToken
        );
      }

      if (this.peekNextToken()?.type === "equals") {
        this.expect("equals");
        defaultValue = this.parseExpression(0, false);
      }

      properties.push(
        withLocation(
          {
            type: "pattern_property",
            key,
            value: valuePattern,
            defaultValue,
          },
          keyToken
        )
      );

      if (this.nextTokenIsType("comma")) {
        this.expect("comma");
        if (this.nextTokenIsType("right_brace")) {
          break;
        }
      } else {
        break;
      }
    }

    this.expect("right_brace");

    return withLocation(
      {
        type: "pattern_object",
        properties,
      },
      startToken
    );
  }

  parseAssignmentTarget(): Pattern {
    const next = this.peekNextToken();

    if (!next) {
      throw unexpectedToken("identifier", next);
    }

    if (next.type === "left_paren") {
      this.expect("left_paren");
      const target = this.parseAssignmentTarget();
      this.expect("right_paren");
      return target;
    }

    if (next.type === "left_brace") {
      return this.parseObjectPattern("assignment");
    }

    if (next.type === "identifier") {
      const identifierToken = this.expect("identifier");
      let expression: Expression = withLocation(
        { type: "identifier", value: identifierToken.value },
        identifierToken
      ) as Extract<Expression, { type: "identifier" }>;

      while (true) {
        const peek = this.peekNextToken();
        if (!peek) break;

        if (peek.type === "dot") {
          this.expect("dot");
          const propertyToken = this.expect("identifier");
          const propertyExpression = withLocation(
            { type: "identifier", value: propertyToken.value },
            propertyToken
          ) as Extract<Expression, { type: "identifier" }>;
          expression = withLocation(
            {
              type: "member",
              object: expression,
              property: propertyExpression,
              computed: false,
            },
            expression.location
          ) as Extract<Expression, { type: "member" }>;
          continue;
        }

        if (peek.type === "left_bracket") {
          this.expect("left_bracket");
          const propertyExpression = this.parseExpression(0, false);
          this.expect("right_bracket");
          expression = withLocation(
            {
              type: "member",
              object: expression,
              property: propertyExpression,
              computed: true,
            },
            expression.location
          ) as Extract<Expression, { type: "member" }>;
          continue;
        }

        break;
      }

      return this.expressionToPattern(expression);
    }

    throw unexpectedToken("identifier", next);
  }

  expressionToPattern(expression: Expression): Pattern {
    if (expression.type === "identifier") {
      return withLocation(
        {
          type: "pattern_identifier",
          name: expression.value,
        },
        expression.location
      );
    }

    if (expression.type === "member") {
      return withLocation(
        {
          type: "pattern_member",
          object: expression.object,
          property: expression.property,
          computed: expression.computed,
        },
        expression.location
      );
    }

    const token = this.tokens[this.index - 1] ?? this.peekNextToken();
    throw syntaxError(
      "Invalid assignment target",
      token ?? this.tokens[this.index]
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

  parseExpressionStatement(allowComma = true): Statement {
    const token = this.tokens[this.index];

    const expression = this.parseExpression(0, allowComma);

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

    let isForInOrOf = false;
    let isForIn = false;

    let parenDepth = 0;
    let cursor = this.index;

    while (cursor < this.tokens.length) {
      const currentToken = this.tokens[cursor];

      if (currentToken.type === "left_paren") {
        parenDepth++;
      } else if (currentToken.type === "right_paren") {
        parenDepth--;
        if (parenDepth < 0) break;
      } else if (
        parenDepth === 0 &&
        (currentToken.type === "keyword" || currentToken.type === "identifier")
      ) {
        if (currentToken.value === "in") {
          isForInOrOf = true;
          isForIn = true;
          break;
        } else if (currentToken.value === "of") {
          isForInOrOf = true;
          isForIn = false;
          break;
        }
      } else if (parenDepth === 0 && currentToken.type === "semicolon") {
        break;
      }

      cursor++;
    }

    if (isForInOrOf) {
      // Parse for-in/of loop

      // Parse the left-hand side (could be a variable declaration or expression)
      let left: Statement | Expression;

      if (
        this.peekNextToken()?.type === "keyword" &&
        ["var", "let", "const"].includes(this.peekNextToken()?.value || "")
      ) {
        const varDecl = this.parseVariableDeclaration();

        if (
          varDecl.type === "variable_declaration" &&
          varDecl.declarations.length !== 1
        ) {
          throw syntaxError(
            `for-${
              isForIn ? "in" : "of"
            } declarations must have exactly one binding`,
            this.tokens[this.index]
          );
        }

        if (varDecl.type === "variable_declaration") {
          const declarator = varDecl.declarations[0];
          if (declarator.value !== undefined) {
            throw syntaxError(
              `for-${
                isForIn ? "in" : "of"
              } declarations may not include an initializer`,
              this.tokens[this.index]
            );
          }
        }

        left = varDecl;
      } else {
        left = this.parseExpression(0, false, true);
      }

      const inOfToken = this.nextToken();
      if (inOfToken.value !== (isForIn ? "in" : "of")) {
        throw unexpectedToken("keyword", inOfToken);
      }

      const right = this.parseExpression(0);

      this.expect("right_paren");

      const body = this.parseStatement();

      return withLocation(
        {
          type: isForIn ? "for_in" : "for_of",
          left,
          right,
          body,
        },
        token
      );
    } else {
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
  }

  parseParams(allowDefaults = false): Parameter[] {
    const params: Parameter[] = [];
    let consumedSpread = false;

    while (this.peekNextToken()?.type !== "right_paren") {
      if (this.peekNextToken()?.type === "spread") {
        this.expect("spread");

        const pattern = this.parseBindingPattern();
        if (pattern.type !== "pattern_identifier") {
          throw syntaxError(
            "Rest parameter must be an identifier",
            this.tokens[this.index - 1]
          );
        }

        const param: Parameter = { pattern, spread: true };
        if (pattern.type === "pattern_identifier") {
          param.name = pattern.name;
        }

        params.push(param);
        consumedSpread = true;
        break;
      }

      const pattern = this.parseBindingPattern();
      let defaultValue: Expression | undefined;

      if (allowDefaults && this.peekNextToken()?.type === "equals") {
        this.expect("equals");
        defaultValue = this.parseExpression(0, false);
      }

      const param: Parameter = { pattern, defaultValue };
      if (pattern.type === "pattern_identifier") {
        param.name = pattern.name;
      }

      params.push(param);

      if (this.peekNextToken()?.type !== "right_paren") {
        this.expect("comma");
      }
    }

    this.expect("right_paren");

    if (consumedSpread && this.peekNextToken()?.type === "comma") {
      throw unexpectedToken("right_paren", this.peekNextToken());
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

    const value = this.parseExpression(0, false);

    if (this.nextTokenIsType("semicolon")) {
      this.expect("semicolon");
    }

    return {
      name: id.value,
      value: value,
      static: isStatic,
    };
  }

  parseClassBody(): {
    properties: ClassPropertyDeclaration[];
    methods: ClassMethodDeclaration[];
  } {
    const properties: ClassPropertyDeclaration[] = [];
    const methods: ClassMethodDeclaration[] = [];

    while (this.peekNextToken()?.type !== "right_brace") {
      let peek = this.peekNextToken();
      let isStatic = false;

      if (peek?.type === "keyword" && peek.value === "static") {
        isStatic = true;
        this.nextToken();
      }

      this.expect("identifier");

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
        throw unexpectedToken("eof", this.tokens[this.index]);
      }
    }

    this.expect("right_brace");

    return { properties, methods };
  }

  parseClass(requireIdentifier: boolean) {
    const token = this.expectWithValue("keyword", "class");

    let identifier: string | undefined;
    const next = this.peekNextToken();
    if (next?.type === "identifier") {
      identifier = this.expect("identifier").value;
    } else if (requireIdentifier) {
      throw unexpectedToken("identifier", next);
    }

    let superClass: string | undefined;
    const maybeExtends = this.peekNextToken();
    if (maybeExtends?.type === "keyword" && maybeExtends.value === "extends") {
      this.expectWithValue("keyword", "extends");
      const identifierToken = this.expect("identifier");
      superClass = identifierToken.value;
    }

    this.expect("left_brace");
    const { properties, methods } = this.parseClassBody();

    return { token, identifier, properties, methods, superClass };
  }

  parseClassDeclarationStatement(): Statement {
    const { token, identifier, properties, methods, superClass } =
      this.parseClass(true);

    return withLocation(
      {
        type: "class_declaration",
        identifier: identifier!,
        properties,
        methods,
        superClass,
      },
      token
    );
  }

  parseClassExpression(): Expression {
    const { token, identifier, properties, methods, superClass } =
      this.parseClass(false);

    return withLocation(
      {
        type: "class_expression",
        identifier,
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
          throw syntaxError(
            "duplicate default clause in switch statement",
            next
          );
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
        throw syntaxError("unexpected token in switch statement", next);
      } else {
        throw unexpectedToken("right_brace", this.tokens[this.index - 1]);
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

  parseThrowStatement(): Statement {
    const token = this.expectWithValue("keyword", "throw");

    const expression = this.parseExpression(0);

    if (this.peekNextToken()?.type === "semicolon") {
      this.expect("semicolon");
    }

    return withLocation(
      {
        type: "throw",
        expression,
      },
      token
    );
  }

  parseTryStatement(): Statement {
    const token = this.expectWithValue("keyword", "try");

    const block = this.parseBlockStatement();

    let handler: CatchClause | undefined;
    let finalizer: Statement | undefined;

    if (
      this.peekNextToken()?.type === "keyword" &&
      this.peekNextToken()?.value === "catch"
    ) {
      this.expectWithValue("keyword", "catch");

      this.expect("left_paren");
      let param: string | undefined;
      if (!this.nextTokenIsType("right_paren")) {
        const identifier = this.expect("identifier");
        param = identifier.value;
      }
      this.expect("right_paren");

      const body = this.parseBlockStatement();

      handler = {
        param,
        body,
      };
    }

    if (
      this.peekNextToken()?.type === "keyword" &&
      this.peekNextToken()?.value === "finally"
    ) {
      this.expectWithValue("keyword", "finally");
      finalizer = this.parseBlockStatement();
    }

    if (!handler && !finalizer) {
      throw syntaxError(
        "try statement must have catch or finally clause",
        token
      );
    }

    return withLocation(
      {
        type: "try",
        block,
        handler,
        finalizer,
      },
      token
    );
  }

  parseStatement(allowComma = true): Statement {
    const token = this.tokens[this.index];

    switch (token.type) {
      case "semicolon":
        this.index++;
        return withLocation({ type: "empty" }, token);
      case "number":
      case "string":
      case "identifier":
      case "regex":
      case "left_paren":
      case "left_bracket":
      case "template_start":
      case "not":
      case "decrement":
      case "increment":
      case "spread":
        return this.parseExpressionStatement(allowComma);
      case "keyword":
        if (token.value === "import") {
          return this.parseImportDeclaration();
        }

        if (token.value === "export") {
          return this.parseExportDeclaration();
        }

        if (
          token.value === "true" ||
          token.value === "false" ||
          token.value === "new" ||
          token.value === "null" ||
          token.value === "super" ||
          token.value === "typeof" ||
          token.value === "void"
        ) {
          return this.parseExpressionStatement(allowComma);
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

        if (token.value === "try") {
          return this.parseTryStatement();
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

        if (token.value === "throw") {
          return this.parseThrowStatement();
        }

        throw unexpectedToken("eof", token);

      case "left_brace": {
        return this.parseBlockStatement();
      }

      default:
        throw unexpectedToken("eof", token);
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
