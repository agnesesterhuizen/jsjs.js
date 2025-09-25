import { assertEquals, assertObjectMatch } from "jsr:@std/assert";
import { describe, it } from "jsr:@std/testing/bdd";
import { JSJS } from "./jsjs.ts";

const textExpression = (source: string, expression: any) => {
  const p = new JSJS();
  const ast = p.parse("TEST", source);
  assertEquals(ast.body.length, 1);
  const expected = {
    type: "expression",
    expression,
  };
  assertObjectMatch(ast.body[0], expected);
};

const testStatement = (source: string, statement: any) => {
  const p = new JSJS();
  const ast = p.parse("TEST", source);
  assertEquals(ast.body.length, 1);
  assertObjectMatch(ast.body[0], statement);
};

describe("parser", () => {
  describe("expressions", () => {
    it("parses expression in parens", () =>
      textExpression("(123);", { type: "number", value: 123 }));
    it("parses number literal", () =>
      textExpression("123;", { type: "number", value: 123 }));
    it("parses empty string literal", () =>
      textExpression('"";', { type: "string", value: "" }));
    it("parses string literal", () =>
      textExpression('"hello";', { type: "string", value: "hello" }));
    it("parses string literal, single quotes", () =>
      textExpression("'hello';", { type: "string", value: "hello" }));
    it("parses string literal, backticks", () =>
      textExpression("`hello`;", { type: "string", value: "hello" }));
    it("parses boolean literal: true", () =>
      textExpression("true;", { type: "boolean", value: true }));
    it("parses boolean literal: false", () =>
      textExpression("false;", { type: "boolean", value: false }));
    it("parses identifier literal: false", () =>
      textExpression("test;", { type: "identifier", value: "test" }));
    it("parses object literal - empty", () =>
      textExpression("({});", { type: "object", properties: {} }));
    it("parses object literal", () =>
      textExpression('({a: 123, b: "test"});', {
        type: "object",
        properties: {
          a: { type: "number", value: 123 },
          b: { type: "string", value: "test" },
        },
      }));
    it("parses array literal - empty", () =>
      textExpression("([]);", { type: "array", elements: [] }));
    it("parses array literal", () =>
      textExpression('([123, "test"]);', {
        type: "array",
        elements: [
          { type: "number", value: 123 },
          { type: "string", value: "test" },
        ],
      }));
    it("parses assignment expression - identifier", () =>
      textExpression("x = 123;", {
        type: "assignment",
        operator: "=",
        left: { type: "identifier", value: "x" },
        right: { type: "number", value: 123 },
      }));
    it("parses assignment expression - member", () =>
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
    it("parses assignment expression - computed member", () =>
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
    it("parses member expression", () =>
      textExpression("a.b;", {
        type: "member",
        object: { type: "identifier", value: "a" },
        property: { type: "identifier", value: "b" },
        computed: false,
      }));
    it("parses member expression - nested", () =>
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
    it("parses computed member expression", () =>
      textExpression("a[0];", {
        type: "member",
        object: { type: "identifier", value: "a" },
        property: { type: "number", value: 0 },
        computed: true,
      }));
    it("parses computed member expression - object property as key", () =>
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

    it("parses object expression", () =>
      textExpression("({});", {
        type: "object",
        properties: {},
      }));

    it("parses object expression - with properties", () =>
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

    it("parses call expression - no args", () =>
      textExpression("a();", {
        type: "call",
        func: { type: "identifier", value: "a" },
        arguments: [],
      }));
    it("parses call expression", () =>
      textExpression('a(1,b,"test");', {
        type: "call",
        func: { type: "identifier", value: "a" },
        arguments: [
          { type: "number", value: 1 },
          { type: "identifier", value: "b" },
          { type: "string", value: "test" },
        ],
      }));
    it("parses call member expression", () =>
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
    it("parses hello world", () =>
      textExpression('console.log("hello world")', {
        type: "call",
        func: {
          type: "member",
          object: { type: "identifier", value: "console" },
          property: { type: "identifier", value: "log" },
          computed: false,
        },
        arguments: [{ type: "string", value: "hello world" }],
      }));
    describe("function expression", () => {
      it("parses basic function expression", () =>
        textExpression("(function(){});", {
          type: "function",
          parameters: [],
          body: {
            type: "block",
            body: [],
          },
        }));
      it("parses named function expression", () =>
        textExpression("(function test(){});", {
          type: "function",
          identifier: "test",
          parameters: [],
          body: {
            type: "block",
            body: [],
          },
        }));
      it("parses function expression with single parameter", () =>
        textExpression("(function(a){});", {
          type: "function",
          parameters: [{ name: "a" }],
          body: {
            type: "block",
            body: [],
          },
        }));
      it("parses function expression with parameters", () =>
        textExpression("(function(a,b,c){});", {
          type: "function",
          parameters: ["a", "b", "c"].map((name) => ({ name })),
          body: {
            type: "block",
            body: [],
          },
        }));
      it("parses function expression with body - single statement", () =>
        textExpression("(function(){ 123; });", {
          type: "function",
          parameters: [],
          body: {
            type: "block",
            body: [
              {
                type: "expression",
                expression: { type: "number", value: 123 },
              },
            ],
          },
        }));
      it("parses function expression with body", () =>
        textExpression('(function(){ 123; test; "hello"; });', {
          type: "function",
          parameters: [],
          body: {
            type: "block",
            body: [
              {
                type: "expression",
                expression: { type: "number", value: 123 },
              },
              {
                type: "expression",
                expression: { type: "identifier", value: "test" },
              },
              {
                type: "expression",
                expression: { type: "string", value: "hello" },
              },
            ],
          },
        }));
      it("parses function expression", () =>
        textExpression('(function(a,b,c){ 123; test; "hello";});', {
          type: "function",
          parameters: ["a", "b", "c"].map((name) => ({ name })),
          body: {
            type: "block",
            body: [
              {
                type: "expression",
                expression: { type: "number", value: 123 },
              },
              {
                type: "expression",
                expression: { type: "identifier", value: "test" },
              },
              {
                type: "expression",
                expression: { type: "string", value: "hello" },
              },
            ],
          },
        }));
    });
    describe("arrow function expression", () => {
      it("parses basic function expression", () =>
        textExpression("(() => {});", {
          type: "function",
          parameters: [],
          body: {
            type: "block",
            body: [],
          },
        }));
      it("parses arrow function expression with basic expression return", () =>
        textExpression("(() => (1));", {
          type: "function",
          parameters: [],
          body: {
            type: "expression",
            expression: {
              type: "number",
              value: 1,
            },
          },
        }));
      it("parses arrow function expression with spread parameters", () =>
        textExpression("((...a) => {});", {
          type: "function",
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
      it("parses arrow function expression with object expression return", () =>
        textExpression("(() => ({ a: 1 }));", {
          type: "function",
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
      it("parses function expression with single parameter", () =>
        textExpression("((a) => {});", {
          type: "function",
          parameters: ["a"].map((name) => ({ name })),
          body: {
            type: "block",
            body: [],
          },
        }));
      it("parses function expression with parameters", () =>
        textExpression("((a,b,c) => {});", {
          type: "function",
          parameters: ["a", "b", "c"].map((name) => ({ name })),
          body: {
            type: "block",
            body: [],
          },
        }));
      it("parses function expression with body - single statement", () =>
        textExpression("(() => { 123; });", {
          type: "function",
          parameters: [],
          body: {
            type: "block",
            body: [
              {
                type: "expression",
                expression: { type: "number", value: 123 },
              },
            ],
          },
        }));
      it("parses function expression with body", () =>
        textExpression('(() => { 123; test; "hello"; });', {
          type: "function",
          parameters: [],
          body: {
            type: "block",
            body: [
              {
                type: "expression",
                expression: { type: "number", value: 123 },
              },
              {
                type: "expression",
                expression: { type: "identifier", value: "test" },
              },
              {
                type: "expression",
                expression: { type: "string", value: "hello" },
              },
            ],
          },
        }));
      it("parses function expression", () =>
        textExpression('((a,b,c) => { 123; test; "hello";});', {
          type: "function",
          parameters: ["a", "b", "c"].map((name) => ({ name })),
          body: {
            type: "block",
            body: [
              {
                type: "expression",
                expression: { type: "number", value: 123 },
              },
              {
                type: "expression",
                expression: { type: "identifier", value: "test" },
              },
              {
                type: "expression",
                expression: { type: "string", value: "hello" },
              },
            ],
          },
        }));
    });

    it("parses not expression", () =>
      textExpression("!1;", {
        type: "not",
        expression: { type: "number", value: 1 },
      }));

    it("spread expression", () => {
      textExpression("...a;", {
        type: "spread",
        expression: { type: "identifier", value: "a" },
      });
    });

    describe("binary expression", () => {
      it("parses binary expression", () =>
        textExpression("1+2;", {
          type: "binary",
          operator: "+",
          left: { type: "number", value: 1 },
          right: { type: "number", value: 2 },
        }));

      it("parses binary expression with division", () =>
        textExpression("1/2;", {
          type: "binary",
          operator: "/",
          left: { type: "number", value: 1 },
          right: { type: "number", value: 2 },
        }));

      it("parses binary comparison expression", () =>
        textExpression("1 !== 2;", {
          type: "binary",
          operator: "!==",
          left: { type: "number", value: 1 },
          right: { type: "number", value: 2 },
        }));

      // 1+2*3 => 1+(2*3)
      it("parses binary expression with mixed precedence", () =>
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
      it("parses binary expression with mixed precedence", () =>
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

      it("parses binary expression with same precedence", () =>
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

    it("parses new expression", () =>
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

  describe("statements", () => {
    it("parses variable declaration with no initial value", () => {
      testStatement("var x;", {
        type: "variable_declaration",
        declarationType: "var",
        identifier: "x",
        varType: "var",
      });
    });

    it("parses variable declaration", () => {
      testStatement("var x = 1;", {
        type: "variable_declaration",
        declarationType: "var",
        identifier: "x",
        value: { type: "number", value: 1 },
        varType: "var",
      });
    });
    it("parses const declaration", () => {
      testStatement("const x = 1;", {
        type: "variable_declaration",
        declarationType: "var",
        identifier: "x",
        value: { type: "number", value: 1 },
        varType: "const",
      });
    });

    it("parses return statement", () => {
      testStatement("return 123;", {
        type: "return",
        expression: { type: "number", value: 123 },
      });
    });
    it("parses return statement without expression", () => {
      testStatement("return;", {
        type: "return",
      });
    });
    it("parses basic function declaration statement", () => {
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
    it("parses function declaration statement", () => {
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
    it("parses if statement", () => {
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
        elseBody: undefined,
      });
    });
    it("parses if/else statement", () => {
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
        elseBody: {
          type: "block",
          body: [
            {
              type: "expression",
              expression: { type: "number", value: 234 },
            },
          ],
        },
      });
    });
    it("parses if/else if statement", () => {
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
        elseBody: {
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
          elseBody: undefined,
        },
      });
    });
    it("parses while statement", () => {
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
    it("parses while statement with expression", () => {
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

    it("switch statement", () => {
      testStatement(
        `switch(x) {
        case "a": break;
        case "b":
          return 123;
        default:
          return;
      }`,
        {
          type: "switch",
          condition: {
            type: "identifier",
            value: "x",
          },
          cases: [
            {
              test: {
                type: "string",
                value: "a",
              },
              body: {
                type: "break",
              },
            },
            {
              test: {
                type: "string",
                value: "b",
              },
              body: {
                type: "return",
                expression: {
                  type: "number",
                  value: 123,
                },
              },
            },
          ],
          default: {
            type: "return",
          },
        }
      );
    });

    it("switch statement inside method", () => {
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
                    elseBody: undefined,
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
                    default: undefined,
                  },
                ],
              },
              static: false,
            },
          ],
        }
      );
    });

    it("parses basic class declaration", () => {
      testStatement("class X {}", {
        type: "class_declaration",
        identifier: "X",
        properties: [],
        methods: [],
      });
    });
    it("parses class declaration with super class", () => {
      testStatement("class X extends Y {}", {
        type: "class_declaration",
        identifier: "X",
        properties: [],
        methods: [],
        superClass: "Y",
      });
    });
    it("parses class declaration with constructor", () => {
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
    it("parses class property without initial value", () => {
      testStatement("class X { x; }", {
        type: "class_declaration",
        identifier: "X",
        properties: [{ name: "x", static: false }],
        methods: [],
      });
    });
    it("parses class property with initial value: number", () => {
      testStatement("class X { x = 123; }", {
        type: "class_declaration",
        identifier: "X",
        properties: [
          { name: "x", value: { type: "number", value: 123 }, static: false },
        ],
        methods: [],
      });
    });
    it("parses class property with initial value: string", () => {
      testStatement(`class X { x = "test"; }`, {
        type: "class_declaration",
        identifier: "X",
        properties: [
          {
            name: "x",
            value: { type: "string", value: "test" },
            static: false,
          },
        ],
        methods: [],
      });
    });
    it("parses static class property", () => {
      testStatement(`class X { static x = "test"; }`, {
        type: "class_declaration",
        identifier: "X",
        properties: [
          { name: "x", value: { type: "string", value: "test" }, static: true },
        ],
        methods: [],
      });
    });
    it("parses class property with initial value: expression", () => {
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
    it("parses class with mixed properties", () => {
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
    it("parses class method", () => {
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
    it("parses class method with parameters", () => {
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
    it("parses class method with spread parameters", () => {
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
    it("parses class method with body", () => {
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
    it("parses class method with body and parameters", () => {
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

    it("parses class arrow function property", () => {
      testStatement(`class X { y = () => {}; }`, {
        type: "class_declaration",
        identifier: "X",
        properties: [
          {
            name: "y",
            value: {
              type: "function",
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

    it("parses static class method", () => {
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
    it("parses static class method with parameters", () => {
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
  });
});
