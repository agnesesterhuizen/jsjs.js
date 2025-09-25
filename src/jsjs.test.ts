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
  const ast = p.parse("TEST", source);

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
  const ast = p.parse("TEST", source);

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
  test("parses string literal, single quotes", () => textExpression("'hello';", { type: "string", value: "hello" }));
  // test("parses string literal, backticks", () => textExpression("`hello`;", { type: "string", value: "hello" }));
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
      varType: "var",
    });
  });
  test("parses variable declaration", () => {
    testStatement("var x = 1;", {
      type: "variable_declaration",
      declarationType: "var",
      identifier: "x",
      value: Option.some({ type: "number", value: 1 }),
      varType: "var",
    });
  });
  test("parses const declaration", () => {
    testStatement("const x = 1;", {
      type: "variable_declaration",
      declarationType: "var",
      identifier: "x",
      value: Option.some({ type: "number", value: 1 }),
      varType: "const",
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
  test("parses member expression - nested", () =>
    textExpression("a.b.c;", {
      type: "member",
      object: {
        type: "member",
        object: { type: "identifier", value: "a" },
        property: { type: "identifier", value: "b" },
        computed: false,
      },
      property: { type: "identifier", value: "c" },
      computed: false,
    }));
  test("parses computed member expression", () =>
    textExpression("a[0];", {
      type: "member",
      object: { type: "identifier", value: "a" },
      property: { type: "number", value: 0 },
      computed: true,
    }));
  test("parses computed member expression - object property as key", () =>
    textExpression("this.a[b.c];", {
      type: "member",
      object: {
        type: "member",
        object: {
          type: "identifier",
          value: "this",
        },
        property: {
          type: "identifier",
          value: "a",
        },
        computed: false,
      },
      property: {
        type: "member",
        object: { type: "identifier", value: "b" },
        property: { type: "identifier", value: "c" },
        computed: false,
      },
      computed: true,
    }));

  test("parses object expression", () =>
    textExpression("({});", {
      type: "object",
      properties: {},
    }));

  test("parses object expression - with properties", () =>
    textExpression('({ a: 1, b: "test" });', {
      type: "object",
      properties: {
        a: {
          type: "number",
          value: 1,
        },
        b: {
          type: "string",
          value: "test",
        },
      },
    }));

  test("parses call expression - no args", () =>
    textExpression("a();", {
      type: "call",
      func: { type: "identifier", value: "a" },
      arguments: [],
    }));
  test("parses call expression", () =>
    textExpression('a(1,b,"test");', {
      type: "call",
      func: { type: "identifier", value: "a" },
      arguments: [
        { type: "number", value: 1 },
        { type: "identifier", value: "b" },
        { type: "string", value: "test" },
      ],
    }));
  test("parses call member expression", () =>
    textExpression("a.b();", {
      type: "call",
      func: {
        type: "member",
        object: { type: "identifier", value: "a" },
        property: { type: "identifier", value: "b" },
        computed: false,
      },
      arguments: [],
    }));
  describe("function expression", () => {
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
        parameters: [{ name: "a" }],
        body: {
          type: "block",
          body: [],
        },
      }));
    test("parses function expression with parameters", () =>
      textExpression("(function(a,b,c){});", {
        type: "function",
        identifier: Option.none(),
        parameters: ["a", "b", "c"].map((name) => ({ name })),
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
        parameters: ["a", "b", "c"].map((name) => ({ name })),
        body: {
          type: "block",
          body: [
            { type: "expression", expression: { type: "number", value: 123 } },
            { type: "expression", expression: { type: "identifier", value: "test" } },
            { type: "expression", expression: { type: "string", value: "hello" } },
          ],
        },
      }));
  });
  describe("arrow function expression", () => {
    test("parses basic function expression", () =>
      textExpression("(() => {});", {
        type: "function",
        identifier: Option.none(),
        parameters: [],
        body: {
          type: "block",
          body: [],
        },
      }));
    test("parses arrow function expression with basic expression return", () =>
      textExpression("(() => (1));", {
        type: "function",
        identifier: Option.none(),
        parameters: [],
        body: {
          type: "expression",
          expression: {
            type: "number",
            value: 1,
          },
        },
      }));
    test("parses arrow function expression with spread parameters", () =>
      textExpression("((...a) => {});", {
        type: "function",
        identifier: Option.none(),
        parameters: [
          {
            name: "a",
            spread: true,
          },
        ],
        body: {
          type: "block",
          body: [],
        },
      }));
    test("parses arrow function expression with object expression return", () =>
      textExpression("(() => ({ a: 1 }));", {
        type: "function",
        identifier: Option.none(),
        parameters: [],
        body: {
          type: "expression",
          expression: {
            type: "object",
            properties: {
              a: {
                type: "number",
                value: 1,
              },
            },
          },
        },
      }));
    test("parses function expression with single parameter", () =>
      textExpression("((a) => {});", {
        type: "function",
        identifier: Option.none(),
        parameters: ["a"].map((name) => ({ name })),
        body: {
          type: "block",
          body: [],
        },
      }));
    test("parses function expression with parameters", () =>
      textExpression("((a,b,c) => {});", {
        type: "function",
        identifier: Option.none(),
        parameters: ["a", "b", "c"].map((name) => ({ name })),
        body: {
          type: "block",
          body: [],
        },
      }));
    test("parses function expression with body - single statement", () =>
      textExpression("(() => { 123; });", {
        type: "function",
        identifier: Option.none(),
        parameters: [],
        body: {
          type: "block",
          body: [{ type: "expression", expression: { type: "number", value: 123 } }],
        },
      }));
    test("parses function expression with body", () =>
      textExpression('(() => { 123; test; "hello"; });', {
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
      textExpression('((a,b,c) => { 123; test; "hello";});', {
        type: "function",
        identifier: Option.none(),
        parameters: ["a", "b", "c"].map((name) => ({ name })),
        body: {
          type: "block",
          body: [
            { type: "expression", expression: { type: "number", value: 123 } },
            { type: "expression", expression: { type: "identifier", value: "test" } },
            { type: "expression", expression: { type: "string", value: "hello" } },
          ],
        },
      }));
  });

  test("parses not expression", () =>
    textExpression("!1;", {
      type: "not",
      expression: { type: "number", value: 1 },
    }));
  // #endregion
  // #region statement tests
  test("parses return statement", () => {
    testStatement("return 123;", {
      type: "return",
      expression: { type: "number", value: 123 },
    });
  });
  test("parses return statement without expression", () => {
    testStatement("return;", {
      type: "return",
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
      parameters: ["a", "b", "c"].map((name) => ({ name })),
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
  test("parses while statement with expression", () => {
    testStatement("while (i >= 1) { 123; }", {
      type: "while",
      condition: {
        type: "binary",
        operator: ">=",
        left: {
          type: "identifier",
          value: "i",
        },
        right: {
          type: "number",
          value: 1,
        },
      },
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

  // test("switch statement", () => {
  //   testStatement(
  //     `switch(x) {
  //       case "a": break;
  //       case "b":
  //         return 123;
  //       default:
  //         return;
  //     }`,
  //     {
  //       type: "switch",
  //       condition: {
  //         type: "identifier",
  //         value: "x",
  //       },
  //       cases: [
  //         {
  //           test: {
  //             type: "string",
  //             value: "a",
  //           },
  //           body: {
  //             type: "break",
  //           },
  //         },
  //         {
  //           test: {
  //             type: "string",
  //             value: "b",
  //           },
  //           body: {
  //             type: "return",
  //             expression: {
  //               type: "number",
  //               value: 123,
  //             },
  //           },
  //         },
  //       ],
  //       default: Option.some({
  //         type: "return",
  //       }),
  //     }
  //   );
  // });

  test("switch statement inside method", () => {
    testStatement(
      `class X {
        y(expression) {
          if (this.debug) {}
          switch (expression.type) {
            case "z":
              return 1;
          }
        }
      }`,
      {
        type: "class_declaration",
        identifier: "X",
        properties: [],
        methods: [
          {
            name: "y",
            parameters: [{ name: "expression" }],
            body: {
              type: "block",
              body: [
                {
                  type: "if",
                  condition: {
                    type: "member",
                    object: {
                      type: "identifier",
                      value: "this",
                    },
                    property: {
                      type: "identifier",
                      value: "debug",
                    },
                    computed: false,
                  },
                  ifBody: {
                    type: "block",
                    body: [],
                  },
                  elseBody: Option.none(),
                },
                {
                  type: "switch",
                  condition: {
                    type: "member",
                    object: {
                      type: "identifier",
                      value: "expression",
                    },
                    property: {
                      type: "identifier",
                      value: "type",
                    },
                    computed: false,
                  },
                  cases: [
                    {
                      test: {
                        type: "string",
                        value: "z",
                      },
                      body: {
                        type: "return",
                        expression: {
                          type: "number",
                          value: 1,
                        },
                      },
                    },
                  ],
                  default: Option.none(),
                },
              ],
            },
            static: false,
          },
        ],
      }
    );
  });

  test("spread expression", () => {
    textExpression("...a;", {
      type: "spread",
      expression: { type: "identifier", value: "a" },
    });
  });

  describe("binary expression", () => {
    test("parses binary expression", () =>
      textExpression("1+2;", {
        type: "binary",
        operator: "+",
        left: { type: "number", value: 1 },
        right: { type: "number", value: 2 },
      }));

    test("parses binary comparison expression", () =>
      textExpression("1 !== 2;", {
        type: "binary",
        operator: "!==",
        left: { type: "number", value: 1 },
        right: { type: "number", value: 2 },
      }));

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

  test("parses basic class declaration", () => {
    testStatement("class X {}", {
      type: "class_declaration",
      identifier: "X",
      properties: [],
      methods: [],
    });
  });
  test("parses class declaration with super class", () => {
    testStatement("class X extends Y {}", {
      type: "class_declaration",
      identifier: "X",
      properties: [],
      methods: [],
      superClass: "Y",
    });
  });
  test("parses class declaration with constructor", () => {
    testStatement("class X { constructor() {} }", {
      type: "class_declaration",
      identifier: "X",
      properties: [],
      methods: [
        {
          name: "constructor",
          parameters: [],
          body: {
            type: "block",
            body: [],
          },
          static: false,
        },
      ],
    });
  });
  test("parses class property without initial value", () => {
    testStatement("class X { x; }", {
      type: "class_declaration",
      identifier: "X",
      properties: [{ name: "x", static: false }],
      methods: [],
    });
  });
  test("parses class property with initial value: number", () => {
    testStatement("class X { x = 123; }", {
      type: "class_declaration",
      identifier: "X",
      properties: [{ name: "x", value: { type: "number", value: 123 }, static: false }],
      methods: [],
    });
  });
  test("parses class property with initial value: string", () => {
    testStatement(`class X { x = "test"; }`, {
      type: "class_declaration",
      identifier: "X",
      properties: [{ name: "x", value: { type: "string", value: "test" }, static: false }],
      methods: [],
    });
  });
  test("parses static class property", () => {
    testStatement(`class X { static x = "test"; }`, {
      type: "class_declaration",
      identifier: "X",
      properties: [{ name: "x", value: { type: "string", value: "test" }, static: true }],
      methods: [],
    });
  });
  test("parses class property with initial value: expression", () => {
    testStatement("class X { x = 1 + a; }", {
      type: "class_declaration",
      identifier: "X",
      properties: [
        {
          name: "x",
          value: {
            type: "binary",
            operator: "+",
            left: {
              type: "number",
              value: 1,
            },
            right: {
              type: "identifier",
              value: "a",
            },
          },
          static: false,
        },
      ],
      methods: [],
    });
  });
  test("parses class with mixed properties", () => {
    testStatement(`class X { x = 1; y = "hi"; z; expr = 1 + a; }`, {
      type: "class_declaration",
      identifier: "X",
      properties: [
        {
          name: "x",
          value: {
            type: "number",
            value: 1,
          },
          static: false,
        },
        {
          name: "y",
          value: {
            type: "string",
            value: "hi",
          },
          static: false,
        },
        {
          name: "z",
          value: undefined,
          static: false,
        },
        {
          name: "expr",
          value: {
            type: "binary",
            operator: "+",
            left: {
              type: "number",
              value: 1,
            },
            right: {
              type: "identifier",
              value: "a",
            },
          },
          static: false,
        },
      ],
      methods: [],
    });
  });
  test("parses class method", () => {
    testStatement("class X { y() {} }", {
      type: "class_declaration",
      identifier: "X",
      properties: [],
      methods: [
        {
          name: "y",
          parameters: [],
          body: {
            type: "block",
            body: [],
          },
          static: false,
        },
      ],
    });
  });
  test("parses class method with parameters", () => {
    testStatement("class X { y(a,b, c) {} }", {
      type: "class_declaration",
      identifier: "X",
      properties: [],
      methods: [
        {
          name: "y",
          parameters: ["a", "b", "c"].map((name) => ({ name })),
          body: {
            type: "block",
            body: [],
          },
          static: false,
        },
      ],
    });
  });
  test("parses class method with spread parameters", () => {
    testStatement("class X { y(...a) {} }", {
      type: "class_declaration",
      identifier: "X",
      properties: [],
      methods: [
        {
          name: "y",
          parameters: [{ name: "a", spread: true }],
          body: {
            type: "block",
            body: [],
          },
          static: false,
        },
      ],
    });
  });
  test("parses class method with body", () => {
    testStatement(`class X { y() { console.log("hello") } }`, {
      type: "class_declaration",
      identifier: "X",
      properties: [],
      methods: [
        {
          name: "y",
          parameters: [],
          body: {
            type: "block",
            body: [
              {
                type: "expression",
                expression: {
                  type: "call",
                  func: {
                    type: "member",
                    object: {
                      type: "identifier",
                      value: "console",
                    },
                    property: {
                      type: "identifier",
                      value: "log",
                    },
                    computed: false,
                  },
                  arguments: [
                    {
                      type: "string",
                      value: "hello",
                    },
                  ],
                },
              },
            ],
          },
          static: false,
        },
      ],
    });
  });
  test("parses class method with body and parameters", () => {
    testStatement(`class X { y(message) { console.log(message); } }`, {
      type: "class_declaration",
      identifier: "X",
      properties: [],
      methods: [
        {
          name: "y",
          parameters: ["message"].map((name) => ({ name })),
          body: {
            type: "block",
            body: [
              {
                type: "expression",
                expression: {
                  type: "call",
                  func: {
                    type: "member",
                    object: {
                      type: "identifier",
                      value: "console",
                    },
                    property: {
                      type: "identifier",
                      value: "log",
                    },
                    computed: false,
                  },
                  arguments: [
                    {
                      type: "identifier",
                      value: "message",
                    },
                  ],
                },
              },
            ],
          },
          static: false,
        },
      ],
    });
  });

  test("parses class arrow function property", () => {
    testStatement(`class X { y = () => {}; }`, {
      type: "class_declaration",
      identifier: "X",
      properties: [
        {
          name: "y",
          value: {
            type: "function",
            identifier: Option.none(),
            parameters: [],
            body: {
              type: "block",
              body: [],
            },
          },
          static: false,
        },
      ],
      methods: [],
    });
  });

  test("parses static class method", () => {
    testStatement(`class X { static y() {} }`, {
      type: "class_declaration",
      identifier: "X",
      properties: [],
      methods: [
        {
          name: "y",
          parameters: [],
          body: {
            type: "block",
            body: [],
          },
          static: true,
        },
      ],
    });
  });
  test("parses static class method with parameters", () => {
    testStatement(`class X { static y(a,b,c) {} }`, {
      type: "class_declaration",
      identifier: "X",
      properties: [],
      methods: [
        {
          name: "y",
          parameters: ["a", "b", "c"].map((name) => ({ name })),
          body: {
            type: "block",
            body: [],
          },
          static: true,
        },
      ],
    });
  });
  test("parses new expression", () =>
    textExpression("new X(123);", {
      type: "new",
      identifier: "X",
      arguments: [
        {
          type: "number",
          value: 123,
        },
      ],
    }));
});
