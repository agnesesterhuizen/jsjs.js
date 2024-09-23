import { expect, describe, test } from "vitest";
import { Expression, Program, Statement } from "./ast";
import { JSJS } from "./jsjs";
import { Option } from "./types";

const expectObjectsToMatch = (a: object, b: object) => {
  const aString = JSON.stringify(a, null, 2);
  const bString = JSON.stringify(b, null, 2);
  expect(aString).toBe(bString);
};

const textExpression = (source: string, expression: Expression) => {
  const p = new JSJS();
  const ast = p.parse(source);

  if (ast.isErr()) {
    console.error(ast.error());
  }

  expect(ast.isErr()).toBe(false);

  const { body } = ast.unwrap() as Program;
  expect(body.length).toBe(1);

  const expected: Statement = { type: "expression", expression };

  expectObjectsToMatch(body[0], expected);
};

const testStatement = (source: string, statement: Statement) => {
  const p = new JSJS();
  const ast = p.parse(source);

  if (ast.isErr()) {
    console.error(ast.error());
  }

  expect(ast.isErr()).toBe(false);

  const { body } = ast.unwrap() as Program;
  expect(body.length).toBe(1);

  expectObjectsToMatch(body[0], statement);
};

describe("parser", () => {
  // #region expression tests
  test("parses expression in parens", () => textExpression("(123);", { type: "number", value: 123 }));
  test("parses number literal", () => textExpression("123;", { type: "number", value: 123 }));
  test("parses empty string literal", () => textExpression('"";', { type: "string", value: "" }));
  test("parses string literal", () => textExpression('"hello";', { type: "string", value: "hello" }));
  test("parses boolean literal: true", () => textExpression("true;", { type: "boolean", value: true }));
  test("parses boolean literal: false", () => textExpression("false;", { type: "boolean", value: false }));
  test("parses identifier literal: false", () => textExpression("test;", { type: "identifier", value: "test" }));
  test("parses object literal - empty", () => textExpression("({});", { type: "object", properties: {} }));
  test("parses object literal", () =>
    textExpression('({a: 123, b: "test"});', {
      type: "object",
      properties: { a: { type: "number", value: 123 }, b: { type: "string", value: "test" } },
    }));
  test("parses array literal - empty", () => textExpression("([]);", { type: "array", elements: [] }));
  test("parses array literal", () =>
    textExpression('([123, "test"]);', {
      type: "array",
      elements: [
        { type: "number", value: 123 },
        { type: "string", value: "test" },
      ],
    }));
  test("parses variable declaration with no initial value", () => {
    testStatement("var x;", {
      type: "variable_declaration",
      declarationType: "var",
      identifier: "x",
      value: Option.none(),
    });
  });
  test("parses variable declaration", () => {
    testStatement("var x = 1;", {
      type: "variable_declaration",
      declarationType: "var",
      identifier: "x",
      value: Option.some({ type: "number", value: 1 }),
    });
  });
  test("parses assignment expression - identifier", () =>
    textExpression("x = 123;", {
      type: "assignment",
      operator: "=",
      left: { type: "identifier", value: "x" },
      right: { type: "number", value: 123 },
    }));
  test("parses assignment expression - member", () =>
    textExpression("x.y = 123;", {
      type: "assignment",
      operator: "=",
      left: {
        type: "member",
        object: { type: "identifier", value: "x" },
        property: { type: "identifier", value: "y" },
        computed: false,
      },
      right: { type: "number", value: 123 },
    }));
  test("parses assignment expression - computed member", () =>
    textExpression("x[y] = 123;", {
      type: "assignment",
      operator: "=",
      left: {
        type: "member",
        object: { type: "identifier", value: "x" },
        property: { type: "identifier", value: "y" },
        computed: true,
      },
      right: { type: "number", value: 123 },
    }));
  test("parses member expression", () =>
    textExpression("a.b;", {
      type: "member",
      object: { type: "identifier", value: "a" },
      property: { type: "identifier", value: "b" },
      computed: false,
    }));
  test("parses computer member expression", () =>
    textExpression("a[0];", {
      type: "member",
      object: { type: "identifier", value: "a" },
      property: { type: "number", value: 0 },
      computed: true,
    }));
  test("parses call expression - no args", () =>
    textExpression("a();", {
      type: "call",
      function: { type: "identifier", value: "a" },
      arguments: [],
    }));
  test("parses call expression", () =>
    textExpression('a(1,b,"test");', {
      type: "call",
      function: { type: "identifier", value: "a" },
      arguments: [
        { type: "number", value: 1 },
        { type: "identifier", value: "b" },
        { type: "string", value: "test" },
      ],
    }));
  test("parses call member expression", () =>
    textExpression("a.b();", {
      type: "call",
      function: {
        type: "member",
        object: { type: "identifier", value: "a" },
        property: { type: "identifier", value: "b" },
        computed: false,
      },
      arguments: [],
    }));
  test("parses basic function expression", () =>
    textExpression("(function(){});", {
      type: "function",
      identifier: Option.none(),
      parameters: [],
      body: {
        type: "block",
        body: [],
      },
    }));
  test("parses named function expression", () =>
    textExpression("(function test(){});", {
      type: "function",
      identifier: Option.some("test"),
      parameters: [],
      body: {
        type: "block",
        body: [],
      },
    }));
  test("parses function expression with single parameter", () =>
    textExpression("(function(a){});", {
      type: "function",
      identifier: Option.none(),
      parameters: ["a"],
      body: {
        type: "block",
        body: [],
      },
    }));
  test("parses function expression with parameters", () =>
    textExpression("(function(a,b,c){});", {
      type: "function",
      identifier: Option.none(),
      parameters: ["a", "b", "c"],
      body: {
        type: "block",
        body: [],
      },
    }));
  test("parses function expression with body - single statement", () =>
    textExpression("(function(){ 123; });", {
      type: "function",
      identifier: Option.none(),
      parameters: [],
      body: {
        type: "block",
        body: [{ type: "expression", expression: { type: "number", value: 123 } }],
      },
    }));
  test("parses function expression with body", () =>
    textExpression('(function(){ 123; test; "hello"; });', {
      type: "function",
      identifier: Option.none(),
      parameters: [],
      body: {
        type: "block",
        body: [
          { type: "expression", expression: { type: "number", value: 123 } },
          { type: "expression", expression: { type: "identifier", value: "test" } },
          { type: "expression", expression: { type: "string", value: "hello" } },
        ],
      },
    }));
  test("parses function expression", () =>
    textExpression('(function(a,b,c){ 123; test; "hello";});', {
      type: "function",
      identifier: Option.none(),
      parameters: ["a", "b", "c"],
      body: {
        type: "block",
        body: [
          { type: "expression", expression: { type: "number", value: 123 } },
          { type: "expression", expression: { type: "identifier", value: "test" } },
          { type: "expression", expression: { type: "string", value: "hello" } },
        ],
      },
    }));
  test("parses binary expression", () =>
    textExpression("1+2;", {
      type: "binary",
      operator: "+",
      left: { type: "number", value: 1 },
      right: { type: "number", value: 2 },
    }));
  // #endregion
  // #region statement tests
  test("parses return statement", () => {
    testStatement("return 123;", {
      type: "return",
      expression: { type: "number", value: 123 },
    });
  });
  test("parses basic function declaration statement", () => {
    testStatement("function x() {}", {
      type: "function_declaration",
      identifier: "x",
      parameters: [],
      body: {
        type: "block",
        body: [],
      },
    });
  });
  test("parses function declaration statement", () => {
    testStatement("function x(a,b,c) { 123; }", {
      type: "function_declaration",
      identifier: "x",
      parameters: ["a", "b", "c"],
      body: {
        type: "block",
        body: [
          {
            type: "expression",
            expression: {
              type: "number",
              value: 123,
            },
          },
        ],
      },
    });
  });
  test("parses if statement", () => {
    testStatement("if (true) { 123; }", {
      type: "if",
      condition: { type: "boolean", value: true },
      ifBody: {
        type: "block",
        body: [
          {
            type: "expression",
            expression: { type: "number", value: 123 },
          },
        ],
      },
      elseBody: Option.none(),
    });
  });
  test("parses if/else statement", () => {
    testStatement("if (true) { 123; } else { 234; }", {
      type: "if",
      condition: { type: "boolean", value: true },
      ifBody: {
        type: "block",
        body: [
          {
            type: "expression",
            expression: { type: "number", value: 123 },
          },
        ],
      },
      elseBody: Option.some({
        type: "block",
        body: [
          {
            type: "expression",
            expression: { type: "number", value: 234 },
          },
        ],
      }),
    });
  });
  test("parses if/else if statement", () => {
    testStatement("if (true) { 123; } else if(false) { 234; }", {
      type: "if",
      condition: { type: "boolean", value: true },
      ifBody: {
        type: "block",
        body: [
          {
            type: "expression",
            expression: { type: "number", value: 123 },
          },
        ],
      },
      elseBody: Option.some<Statement>({
        type: "if",
        condition: { type: "boolean", value: false },
        ifBody: {
          type: "block",
          body: [
            {
              type: "expression",
              expression: { type: "number", value: 234 },
            },
          ],
        },
        elseBody: Option.none(),
      }),
    });
  });
  test("parses while statement", () => {
    testStatement("while (true) { 123; }", {
      type: "while",
      condition: { type: "boolean", value: true },
      body: {
        type: "block",
        body: [
          {
            type: "expression",
            expression: { type: "number", value: 123 },
          },
        ],
      },
    });
  });
  // #endregion
  // 1+2*3 => 1+(2*3)
  test("parses binary expression with mixed precedence", () =>
    textExpression("1+2*3;", {
      type: "binary",
      operator: "+",
      left: { type: "number", value: 1 },
      right: {
        type: "binary",
        operator: "*",
        left: { type: "number", value: 2 },
        right: { type: "number", value: 3 },
      },
    }));
  // 1*2+3 => (1*2)+3
  test("parses binary expression with mixed precedence", () =>
    textExpression("1*2+3;", {
      type: "binary",
      operator: "+",
      left: {
        type: "binary",
        operator: "*",
        left: { type: "number", value: 1 },
        right: { type: "number", value: 2 },
      },
      right: { type: "number", value: 3 },
    }));
  test("parses binary expression with same precedence", () =>
    textExpression("1+2+3;", {
      type: "binary",
      operator: "+",
      left: {
        type: "binary",
        operator: "+",
        left: { type: "number", value: 1 },
        right: { type: "number", value: 2 },
      },
      right: { type: "number", value: 3 },
    }));
});
