import { assertEquals, assertObjectMatch } from "jsr:@std/assert";
import { JSJS } from "./jsjs.ts";
import { Statement } from "./ast.ts";

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

const identifierPattern = (name: string) => ({
  type: "pattern_identifier",
  name,
});

const parameter = (name: string, overrides: Record<string, unknown> = {}) => ({
  name,
  pattern: identifierPattern(name),
  ...overrides,
});

const patternProperty = (
  key: string,
  overrides: Record<string, unknown> = {}
) => ({
  type: "pattern_property",
  key,
  value: identifierPattern(key),
  ...overrides,
});

const objectPattern = (
  properties: Record<string, unknown>[]
) => ({
  type: "pattern_object",
  properties,
});

Deno.test("parser: expressions", async (t) => {
  await t.step("parses expression in parens", () =>
    textExpression("(123);", { type: "number", value: 123 })
  );
  await t.step("parses expression in parens", () =>
    textExpression("(123);", { type: "number", value: 123 })
  );
  await t.step("parses number literal", () =>
    textExpression("123;", { type: "number", value: 123 })
  );
  await t.step("parses null literal", () =>
    textExpression("null;", { type: "null" })
  );
  await t.step("parses empty string literal", () =>
    textExpression('"";', { type: "string", value: "" })
  );
  await t.step("parses string literal", () =>
    textExpression('"hello";', { type: "string", value: "hello" })
  );
  await t.step("parses string literal, single quotes", () =>
    textExpression("'hello';", { type: "string", value: "hello" })
  );
  await t.step("parses template literal without expressions", () =>
    textExpression("`hello`;", {
      type: "template_literal",
      quasis: ["hello"],
      expressions: [],
    })
  );
  await t.step("parses template literal with expression", () =>
    textExpression("`hello ${name}`;", {
      type: "template_literal",
      quasis: ["hello ", ""],
      expressions: [{ type: "identifier", value: "name" }],
    })
  );
  await t.step("parses template literal with multiple expressions", () =>
    textExpression("`${a} + ${b}`;", {
      type: "template_literal",
      quasis: ["", " + ", ""],
      expressions: [
        { type: "identifier", value: "a" },
        { type: "identifier", value: "b" },
      ],
    })
  );
  await t.step("parses template literal with object literal expression", () =>
    textExpression("`${{ a: 1 }}`;", {
      type: "template_literal",
      quasis: ["", ""],
      expressions: [
        {
          type: "object",
          properties: {
            a: { type: "number", value: 1 },
          },
        },
      ],
    })
  );
  await t.step("parses regex literal", () =>
    textExpression("/abc/;", {
      type: "regex",
      pattern: "abc",
      flags: "",
    })
  );
  await t.step("parses regex literal with flags", () =>
    textExpression("/a+/gi;", {
      type: "regex",
      pattern: "a+",
      flags: "gi",
    })
  );
  await t.step("parses boolean literal: true", () =>
    textExpression("true;", { type: "boolean", value: true })
  );
  await t.step("parses boolean literal: false", () =>
    textExpression("false;", { type: "boolean", value: false })
  );
  await t.step("parses identifier literal: false", () =>
    textExpression("test;", { type: "identifier", value: "test" })
  );
  await t.step("parses object literal - empty", () =>
    textExpression("({});", { type: "object", properties: {} })
  );
  await t.step("parses object literal", () =>
    textExpression('({a: 123, b: "test"});', {
      type: "object",
      properties: {
        a: { type: "number", value: 123 },
        b: { type: "string", value: "test" },
      },
    })
  );
  await t.step("parses array literal - empty", () =>
    textExpression("([]);", { type: "array", elements: [] })
  );
  await t.step("parses array literal", () =>
    textExpression('([123, "test"]);', {
      type: "array",
      elements: [
        { type: "number", value: 123 },
        { type: "string", value: "test" },
      ],
    })
  );
  await t.step("parses assignment expression - identifier", () =>
    textExpression("x = 123;", {
      type: "assignment",
      operator: "=",
      left: { type: "pattern_identifier", name: "x" },
      right: { type: "number", value: 123 },
    })
  );
  await t.step("parses assignment expression - member", () =>
    textExpression("x.y = 123;", {
      type: "assignment",
      operator: "=",
      left: {
        type: "pattern_member",
        object: { type: "identifier", value: "x" },
        property: { type: "identifier", value: "y" },
        computed: false,
      },
      right: { type: "number", value: 123 },
    })
  );
  await t.step("parses assignment expression - computed member", () =>
    textExpression("x[y] = 123;", {
      type: "assignment",
      operator: "=",
      left: {
        type: "pattern_member",
        object: { type: "identifier", value: "x" },
        property: { type: "identifier", value: "y" },
        computed: true,
      },
      right: { type: "number", value: 123 },
    })
  );
  await t.step("parses arithmetic assignment expression - plus", () =>
    textExpression("x += 5;", {
      type: "assignment",
      operator: "+=",
      left: { type: "pattern_identifier", name: "x" },
      right: { type: "number", value: 5 },
    })
  );
  await t.step("parses arithmetic assignment expression - minus", () =>
    textExpression("y -= 2;", {
      type: "assignment",
      operator: "-=",
      left: { type: "pattern_identifier", name: "y" },
      right: { type: "number", value: 2 },
    })
  );
  await t.step("parses arithmetic assignment expression - multiply", () =>
    textExpression("value *= 10;", {
      type: "assignment",
      operator: "*=",
      left: { type: "pattern_identifier", name: "value" },
      right: { type: "number", value: 10 },
    })
  );
  await t.step("parses arithmetic assignment expression - divide", () =>
    textExpression("total /= 2;", {
      type: "assignment",
      operator: "/=",
      left: { type: "pattern_identifier", name: "total" },
      right: { type: "number", value: 2 },
    })
  );
  await t.step("parses member expression", () =>
    textExpression("a.b;", {
      type: "member",
      object: { type: "identifier", value: "a" },
      property: { type: "identifier", value: "b" },
      computed: false,
    })
  );
  await t.step("parses member expression - nested", () =>
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
    })
  );
  await t.step("parses computed member expression", () =>
    textExpression("a[0];", {
      type: "member",
      object: { type: "identifier", value: "a" },
      property: { type: "number", value: 0 },
      computed: true,
    })
  );
  await t.step(
    "parses computed member expression - object property as key",
    () =>
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
      })
  );

  await t.step("parses object expression", () =>
    textExpression("({});", {
      type: "object",
      properties: {},
    })
  );

  await t.step("parses object expression - with properties", () =>
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
    })
  );

  await t.step("parses call expression - no args", () =>
    textExpression("a();", {
      type: "call",
      func: { type: "identifier", value: "a" },
      arguments: [],
    })
  );
  await t.step("parses call expression", () =>
    textExpression('a(1,b,"test");', {
      type: "call",
      func: { type: "identifier", value: "a" },
      arguments: [
        { type: "number", value: 1 },
        { type: "identifier", value: "b" },
        { type: "string", value: "test" },
      ],
    })
  );
  await t.step("parses call member expression", () =>
    textExpression("a.b();", {
      type: "call",
      func: {
        type: "member",
        object: { type: "identifier", value: "a" },
        property: { type: "identifier", value: "b" },
        computed: false,
      },
      arguments: [],
    })
  );
  await t.step("parses call member expression on literal", () =>
    textExpression(`[10, 20, 30].forEach(() => {});`, {
      type: "call",
      func: {
        type: "member",
        object: {
          type: "array",
          elements: [
            { type: "number", value: 10 },
            { type: "number", value: 20 },
            { type: "number", value: 30 },
          ],
        },
        property: { type: "identifier", value: "forEach" },
        computed: false,
      },
      arguments: [
        {
          type: "function",
          parameters: [],
          body: { type: "block", body: [] },
        },
      ],
    })
  );
  await t.step("parses hello world", () =>
    textExpression('console.log("hello world")', {
      type: "call",
      func: {
        type: "member",
        object: { type: "identifier", value: "console" },
        property: { type: "identifier", value: "log" },
        computed: false,
      },
      arguments: [{ type: "string", value: "hello world" }],
    })
  );

  await t.step("parses not expression", () =>
    textExpression("!1;", {
      type: "unary",
      operator: "!",
      expression: { type: "number", value: 1 },
    })
  );

  await t.step("parses typeof expression", () =>
    textExpression("typeof x;", {
      type: "unary",
      operator: "typeof",
      expression: { type: "identifier", value: "x" },
    })
  );

  await t.step("spread expression", () => {
    textExpression("...a;", {
      type: "spread",
      expression: { type: "identifier", value: "a" },
    });
  });

  await t.step("super call expression", () => {
    textExpression("super();", {
      type: "super_call",
      arguments: [],
    });
  });

  await t.step("super call expression with arguments", () => {
    textExpression("super(name, age);", {
      type: "super_call",
      arguments: [
        { type: "identifier", value: "name" },
        { type: "identifier", value: "age" },
      ],
    });
  });

  await t.step("super member expression", () => {
    textExpression("super.method;", {
      type: "super_member",
      property: "method",
    });
  });

  await t.step("super member call expression", () => {
    textExpression("super.method();", {
      type: "call",
      func: {
        type: "super_member",
        property: "method",
      },
      arguments: [],
    });
  });

  await t.step("super member call expression with arguments", () => {
    textExpression("super.method(arg1, arg2);", {
      type: "call",
      func: {
        type: "super_member",
        property: "method",
      },
      arguments: [
        { type: "identifier", value: "arg1" },
        { type: "identifier", value: "arg2" },
      ],
    });
  });

  await t.step("binary expression", async (t) => {
    await t.step("parses binary expression", () =>
      textExpression("1+2;", {
        type: "binary",
        operator: "+",
        left: { type: "number", value: 1 },
        right: { type: "number", value: 2 },
      })
    );

    await t.step("parses binary expression with division", () =>
      textExpression("1/2;", {
        type: "binary",
        operator: "/",
        left: { type: "number", value: 1 },
        right: { type: "number", value: 2 },
      })
    );

    await t.step("parses binary comparison expression", () =>
      textExpression("1 !== 2;", {
        type: "binary",
        operator: "!==",
        left: { type: "number", value: 1 },
        right: { type: "number", value: 2 },
      })
    );

    // 1+2*3 => 1+(2*3)
    await t.step("parses binary expression with mixed precedence", () =>
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
      })
    );

    // 1*2+3 => (1*2)+3
    await t.step("parses binary expression with mixed precedence", () =>
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
      })
    );

    await t.step("parses binary expression with same precedence", () =>
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
      })
    );
  });

  await t.step("parses new expression", () =>
    textExpression("new X(123);", {
      type: "new",
      identifier: "X",
      arguments: [
        {
          type: "number",
          value: 123,
        },
      ],
    })
  );

  await t.step("function expression", async (t) => {
    await t.step("parses basic function expression", () =>
      textExpression("(function(){});", {
        type: "function",
        parameters: [],
        body: {
          type: "block",
          body: [],
        },
      })
    );
    await t.step("parses named function expression", () =>
      textExpression("(function test(){});", {
        type: "function",
        identifier: "test",
        parameters: [],
        body: {
          type: "block",
          body: [],
        },
      })
    );
    await t.step("parses function expression with single parameter", () =>
      textExpression("(function(a){});", {
        type: "function",
        parameters: [parameter("a")],
        body: {
          type: "block",
          body: [],
        },
      })
    );
    await t.step("parses function expression with parameters", () =>
      textExpression("(function(a,b,c){});", {
        type: "function",
        parameters: ["a", "b", "c"].map((name) => parameter(name)),
        body: {
          type: "block",
          body: [],
        },
      })
    );
    await t.step(
      "parses function expression with body - single statement",
      () =>
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
        })
    );
    await t.step("parses function expression with body", () =>
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
      })
    );
    await t.step("parses function expression", () =>
      textExpression('(function(a,b,c){ 123; test; "hello";});', {
        type: "function",
        parameters: ["a", "b", "c"].map((name) => parameter(name)),
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
      })
    );
  });

  await t.step("arrow function expression", async (t) => {
    await t.step("parses basic function expression", () =>
      textExpression("(() => {});", {
        type: "function",
        parameters: [],
        body: {
          type: "block",
          body: [],
        },
      })
    );
    await t.step(
      "parses arrow function expression with basic expression return",
      () =>
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
        })
    );
    await t.step(
      "parses arrow function expression with spread parameters",
      () =>
        textExpression("((...a) => {});", {
          type: "function",
          parameters: [parameter("a", { spread: true })],
          body: {
            type: "block",
            body: [],
          },
        })
    );
    await t.step(
      "parses arrow function expression with object expression return",
      () =>
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
        })
    );
    await t.step(
      "parses arrow function expression with destructured parameter",
      () =>
        textExpression("((feature, { location }) => location);", {
          type: "function",
          parameters: [
            parameter("feature"),
            {
              pattern: objectPattern([patternProperty("location")]),
            },
          ],
          body: {
            type: "expression",
            expression: {
              type: "identifier",
              value: "location",
            },
          },
        })
    );
    await t.step("parses class expression", () =>
      textExpression("(class A {});", {
        type: "class_expression",
        identifier: "A",
        properties: [],
        methods: [],
      })
    );
    await t.step("parses function expression with single parameter", () =>
      textExpression("((a) => {});", {
        type: "function",
        parameters: ["a"].map((name) => parameter(name)),
        body: {
          type: "block",
          body: [],
        },
      })
    );
    await t.step("parses function expression with parameters", () =>
      textExpression("((a,b,c) => {});", {
        type: "function",
        parameters: ["a", "b", "c"].map((name) => parameter(name)),
        body: {
          type: "block",
          body: [],
        },
      })
    );
    await t.step(
      "parses function expression with body - single statement",
      () =>
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
        })
    );
    await t.step("parses function expression with body", () =>
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
      })
    );
    await t.step("parses function expression", () =>
      textExpression('((a,b,c) => { 123; test; "hello";});', {
        type: "function",
        parameters: ["a", "b", "c"].map((name) => parameter(name)),
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
      })
    );
  });
  await t.step("parses comma operator", () =>
    textExpression("(1, 2, 3);", {
      type: "comma",
      expressions: [
        { type: "number", value: 1 },
        { type: "number", value: 2 },
        { type: "number", value: 3 },
      ],
    })
  );
  await t.step("parses grouped comma with member expression", () =>
    textExpression("((mod = { exports: {} }).exports, mod);", {
      type: "comma",
      expressions: [
        {
          type: "member",
          object: {
            type: "assignment",
            operator: "=",
            left: { type: "pattern_identifier", name: "mod" },
            right: {
              type: "object",
              properties: {
                exports: { type: "object" },
              },
            },
          },
          property: { type: "identifier", value: "exports" },
          computed: false,
        },
        { type: "identifier", value: "mod" },
      ],
    })
  );
  await t.step("parses symbol expression", () =>
    textExpression('Symbol("foo");', {
      type: "call",
      func: { type: "identifier", value: "Symbol" },
      arguments: [{ type: "string", value: "foo" }],
    })
  );
  await t.step("parses symbol.for expression", () =>
    textExpression('Symbol.for("bar");', {
      type: "call",
      func: {
        type: "member",
        object: { type: "identifier", value: "Symbol" },
        property: {
          type: "identifier",
          value: "for",
        },
        computed: false,
      },
      arguments: [{ type: "string", value: "bar" }],
    })
  );
});

Deno.test("parser:statement", async (t) => {
  await t.step("parses variable declaration with no initial value", () => {
    testStatement("var x;", {
      type: "variable_declaration",
      declarationType: "var",
      declarations: [
        {
          id: { type: "pattern_identifier", name: "x" },
        },
      ],
      varType: "var",
    });
  });

  await t.step("parses variable declaration", () => {
    testStatement("var x = 1;", {
      type: "variable_declaration",
      declarationType: "var",
      declarations: [
        {
          id: { type: "pattern_identifier", name: "x" },
          value: { type: "number", value: 1 },
        },
      ],
      varType: "var",
    });
  });
  await t.step("parses variable declaration with class expression", () => {
    testStatement("var X = class {};", {
      type: "variable_declaration",
      declarationType: "var",
      declarations: [
        {
          id: { type: "pattern_identifier", name: "X" },
          value: {
            type: "class_expression",
            properties: [],
            methods: [],
          },
        },
      ],
      varType: "var",
    });
  });
  await t.step("parses const declaration", () => {
    testStatement("const x = 1;", {
      type: "variable_declaration",
      declarationType: "var",
      declarations: [
        {
          id: { type: "pattern_identifier", name: "x" },
          value: { type: "number", value: 1 },
        },
      ],
      varType: "const",
    });
  });

  await t.step("parses return statement", () => {
    testStatement("return 123;", {
      type: "return",
      expression: { type: "number", value: 123 },
    });
  });
  await t.step("parses return statement without expression", () => {
    testStatement("return;", {
      type: "return",
    });
  });
  await t.step("parses basic function declaration statement", () => {
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
  await t.step("parses function declaration statement", () => {
    testStatement("function x(a,b,c) { 123; }", {
      type: "function_declaration",
      identifier: "x",
      parameters: ["a", "b", "c"].map((name) => parameter(name)),
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
  await t.step("parses if statement", () => {
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
  await t.step("parses if statement with regex literal", () => {
    testStatement('if (true) /abc/.test("abc");', {
      type: "if",
      condition: { type: "boolean", value: true },
      ifBody: {
        type: "expression",
        expression: {
          type: "call",
          func: {
            type: "member",
            object: {
              type: "regex",
              pattern: "abc",
              flags: "",
            },
          },
        },
      },
    });
  });
  await t.step("parses if/else statement", () => {
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
  await t.step("parses if/else if statement", () => {
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
  await t.step("parses while statement", () => {
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
  await t.step("parses while statement with expression", () => {
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

  await t.step("parses for-in with variable declaration", () => {
    testStatement("for (var key in obj) {}", {
      type: "for_in",
      left: {
        type: "variable_declaration",
        declarationType: "var",
        declarations: [
          {
            id: { type: "pattern_identifier", name: "key" },
          },
        ],
        varType: "var",
      },
      right: {
        type: "identifier",
        value: "obj",
      },
      body: {
        type: "block",
        body: [],
      },
    });
  });

  await t.step("parses for-in with identifier target", () => {
    testStatement("for (key in obj) { result = key; }", {
      type: "for_in",
      left: {
        type: "identifier",
        value: "key",
      },
      right: {
        type: "identifier",
        value: "obj",
      },
      body: {
        type: "block",
        body: [
          {
            type: "expression",
            expression: {
              type: "assignment",
              operator: "=",
              left: { type: "pattern_identifier", name: "result" },
              right: { type: "identifier", value: "key" },
            },
          },
        ],
      },
    });
  });

  await t.step("parses for-in with member target", () => {
    testStatement("for (box.prop in source) {}", {
      type: "for_in",
      left: {
        type: "member",
        object: { type: "identifier", value: "box" },
        property: { type: "identifier", value: "prop" },
        computed: false,
      },
      right: {
        type: "identifier",
        value: "source",
      },
      body: {
        type: "block",
        body: [],
      },
    });
  });

  await t.step("parses for-of with variable declaration", () => {
    testStatement("for (let value of items) {}", {
      type: "for_of",
      left: {
        type: "variable_declaration",
        declarationType: "var",
        declarations: [
          {
            id: { type: "pattern_identifier", name: "value" },
          },
        ],
        varType: "let",
      },
      right: {
        type: "identifier",
        value: "items",
      },
      body: {
        type: "block",
        body: [],
      },
    });
  });

  await t.step("parses for-of with identifier target", () => {
    testStatement("for (item of list) { total = item; }", {
      type: "for_of",
      left: {
        type: "identifier",
        value: "item",
      },
      right: {
        type: "identifier",
        value: "list",
      },
      body: {
        type: "block",
        body: [
          {
            type: "expression",
            expression: {
              type: "assignment",
              operator: "=",
              left: { type: "pattern_identifier", name: "total" },
              right: { type: "identifier", value: "item" },
            },
          },
        ],
      },
    });
  });

  await t.step("parses for-of with member target", () => {
    testStatement("for (box.prop of source) {}", {
      type: "for_of",
      left: {
        type: "member",
        object: { type: "identifier", value: "box" },
        property: { type: "identifier", value: "prop" },
        computed: false,
      },
      right: {
        type: "identifier",
        value: "source",
      },
      body: {
        type: "block",
        body: [],
      },
    });
  });

  await t.step("switch statement", () => {
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
            body: [
              {
                type: "break",
              },
            ],
          },
          {
            test: {
              type: "string",
              value: "b",
            },
            body: [
              {
                type: "return",
                expression: {
                  type: "number",
                  value: 123,
                },
              },
            ],
          },
        ],
        default: {
          type: "return",
        },
      } as Statement
    );
  });

  await t.step("switch statement with numbers", () => {
    testStatement(
      `switch (n) {
          case 0:
          case 1:
            c = 0;
            break;
          case 2:
            break;
          case 3:
            c = 1;
            break;
          default:
            c = 0;
        }`,
      {
        type: "switch",
        condition: {
          type: "identifier",
          value: "n",
        },
        cases: [
          {
            test: {
              type: "number",
              value: 0,
            },
            body: [],
          },
          {
            test: {
              type: "number",
              value: 1,
            },
            body: [
              {
                type: "expression",
                expression: {
                  type: "assignment",
                  operator: "=",
                  left: { type: "pattern_identifier", name: "c" },
                  right: {
                    type: "number",
                    value: 0,
                  },
                },
              },
              { type: "break" },
            ],
          },
          {
            test: {
              type: "number",
              value: 2,
            },
            body: [{ type: "break" }],
          },
          {
            test: {
              type: "number",
              value: 3,
            },
            body: [
              {
                type: "expression",
                expression: {
                  type: "assignment",
                  operator: "=",
                  left: { type: "pattern_identifier", name: "c" },
                  right: {
                    type: "number",
                    value: 1,
                  },
                },
              },
              { type: "break" },
            ],
          },
        ],
        default: {
          type: "expression",
          expression: {
            type: "assignment",
            operator: "=",
            left: { type: "pattern_identifier", name: "c" },
            right: {
              type: "number",
              value: 0,
            },
          },
        },
      } as Statement
    );
  });

  await t.step("switch statement inside method", () => {
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
            parameters: [parameter("expression")],
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
                      body: [
                        {
                          type: "return",
                          expression: {
                            type: "number",
                            value: 1,
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            static: false,
          },
        ],
      } as Statement
    );
  });

  // method shorthand tests:
  await t.step("parses object with string property method shorthand", () =>
    textExpression('({ "1_"() { return 42; } });', {
      type: "object",
      properties: {
        "1_": {
          type: "function",
          parameters: [],
          body: {
            type: "block",
            body: [
              {
                type: "return",
                expression: { type: "number", value: 42 },
              },
            ],
          },
        },
      },
    })
  );

  await t.step("parses object with numeric property method shorthand", () =>
    textExpression('({ 123() { return "hello"; } });', {
      type: "object",
      properties: {
        "123": {
          type: "function",
          parameters: [],
          body: {
            type: "block",
            body: [
              {
                type: "return",
                expression: { type: "string", value: "hello" },
              },
            ],
          },
        },
      },
    })
  );

  await t.step("parses object with identifier method shorthand", () =>
    textExpression("({ normalMethod() { return true; } });", {
      type: "object",
      properties: {
        normalMethod: {
          type: "function",
          parameters: [],
          body: {
            type: "block",
            body: [
              {
                type: "return",
                expression: { type: "boolean", value: true },
              },
            ],
          },
        },
      },
    })
  );

  await t.step("parses object with method shorthand with parameters", () =>
    textExpression('({ "test"(a, b) { return a + b; } });', {
      type: "object",
      properties: {
        test: {
          type: "function",
          parameters: [parameter("a"), parameter("b")],
          body: {
            type: "block",
            body: [
              {
                type: "return",
                expression: {
                  type: "binary",
                  operator: "+",
                  left: { type: "identifier", value: "a" },
                  right: { type: "identifier", value: "b" },
                },
              },
            ],
          },
        },
      },
    })
  );

  await t.step("parses object with mixed property types and methods", () =>
    textExpression(
      '({ "1_"() {}, normalMethod() {}, 456() {}, regularProp: 42 });',
      {
        type: "object",
        properties: {
          "1_": {
            type: "function",
            parameters: [],
            body: {
              type: "block",
              body: [],
            },
          },
          normalMethod: {
            type: "function",
            parameters: [],
            body: {
              type: "block",
              body: [],
            },
          },
          "456": {
            type: "function",
            parameters: [],
            body: {
              type: "block",
              body: [],
            },
          },
          regularProp: {
            type: "number",
            value: 42,
          },
        },
      }
    )
  );

  await t.step("parses object with string property names", () =>
    textExpression('({ "string prop": "value", "123abc": true });', {
      type: "object",
      properties: {
        "string prop": { type: "string", value: "value" },
        "123abc": { type: "boolean", value: true },
      },
    })
  );

  await t.step("parses object with numeric property names", () =>
    textExpression('({ 123: "numeric", 0.5: "decimal" });', {
      type: "object",
      properties: {
        "123": { type: "string", value: "numeric" },
        "0.5": { type: "string", value: "decimal" },
      },
    })
  );

  await t.step("parses basic class declaration", () => {
    testStatement("class X {}", {
      type: "class_declaration",
      identifier: "X",
      properties: [],
      methods: [],
    });
  });
  await t.step("parses class declaration with super class", () => {
    testStatement("class X extends Y {}", {
      type: "class_declaration",
      identifier: "X",
      properties: [],
      methods: [],
      superClass: "Y",
    });
  });
  await t.step("parses class declaration with constructor", () => {
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
  await t.step("parses class property without initial value", () => {
    testStatement("class X { x; }", {
      type: "class_declaration",
      identifier: "X",
      properties: [{ name: "x", static: false }],
      methods: [],
    });
  });
  await t.step("parses class property with initial value: number", () => {
    testStatement("class X { x = 123; }", {
      type: "class_declaration",
      identifier: "X",
      properties: [
        { name: "x", value: { type: "number", value: 123 }, static: false },
      ],
      methods: [],
    });
  });
  await t.step("parses class property with initial value: string", () => {
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
  await t.step("parses static class property", () => {
    testStatement(`class X { static x = "test"; }`, {
      type: "class_declaration",
      identifier: "X",
      properties: [
        { name: "x", value: { type: "string", value: "test" }, static: true },
      ],
      methods: [],
    });
  });
  await t.step("parses class property with initial value: expression", () => {
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
  await t.step("parses class with mixed properties", () => {
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
  await t.step("parses class method", () => {
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
  await t.step("parses class method with parameters", () => {
    testStatement("class X { y(a,b, c) {} }", {
      type: "class_declaration",
      identifier: "X",
      properties: [],
      methods: [
        {
          name: "y",
          parameters: ["a", "b", "c"].map((name) => parameter(name)),
          body: {
            type: "block",
            body: [],
          },
          static: false,
        },
      ],
    });
  });
  await t.step("parses class method with spread parameters", () => {
    testStatement("class X { y(...a) {} }", {
      type: "class_declaration",
      identifier: "X",
      properties: [],
      methods: [
        {
          name: "y",
          parameters: [parameter("a", { spread: true })],
          body: {
            type: "block",
            body: [],
          },
          static: false,
        },
      ],
    });
  });
  await t.step("parses class method with body", () => {
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
  await t.step("parses class method with body and parameters", () => {
    testStatement(`class X { y(message) { console.log(message); } }`, {
      type: "class_declaration",
      identifier: "X",
      properties: [],
      methods: [
        {
          name: "y",
          parameters: ["message"].map((name) => parameter(name)),
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

  await t.step("parses class arrow function property", () => {
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

  await t.step("parses static class method", () => {
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
  await t.step("parses static class method with parameters", () => {
    testStatement(`class X { static y(a,b,c) {} }`, {
      type: "class_declaration",
      identifier: "X",
      properties: [],
      methods: [
        {
          name: "y",
          parameters: ["a", "b", "c"].map((name) => parameter(name)),
          body: {
            type: "block",
            body: [],
          },
          static: true,
        },
      ],
    });
  });
  await t.step("parses import declaration - default", () => {
    testStatement('import foo from "./mod.js";', {
      type: "import_declaration",
      source: "./mod.js",
      specifiers: [{ type: "import_default", local: "foo" }],
    });
  });
  await t.step("parses import declaration - named", () => {
    testStatement('import { foo, bar as baz } from "./mod.js";', {
      type: "import_declaration",
      source: "./mod.js",
      specifiers: [
        { type: "import_named", imported: "foo", local: "foo" },
        { type: "import_named", imported: "bar", local: "baz" },
      ],
    });
  });
  await t.step("parses import declaration - namespace", () => {
    testStatement('import * as ns from "./mod.js";', {
      type: "import_declaration",
      source: "./mod.js",
      specifiers: [{ type: "import_namespace", local: "ns" }],
    });
  });
  await t.step("parses import declaration - side effect", () => {
    testStatement('import "./setup.js";', {
      type: "import_declaration",
      source: "./setup.js",
      specifiers: [],
    });
  });
  await t.step("parses export declaration - variable", () => {
    testStatement("export const foo = 1;", {
      type: "export_declaration",
      exportKind: "named",
      declaration: {
        type: "variable_declaration",
        varType: "const",
      },
    });
  });
  await t.step("parses export declaration - named specifiers", () => {
    testStatement('export { foo, bar as baz } from "./mod.js";', {
      type: "export_declaration",
      exportKind: "named",
      source: "./mod.js",
      specifiers: [
        { type: "export_named", local: "foo", exported: "foo" },
        { type: "export_named", local: "bar", exported: "baz" },
      ],
    });
  });
  await t.step("parses export declaration - export all", () => {
    testStatement('export * from "./mod.js";', {
      type: "export_declaration",
      exportKind: "all",
      source: "./mod.js",
      specifiers: [],
    });
  });
  await t.step("parses export declaration - namespace", () => {
    testStatement('export * as ns from "./mod.js";', {
      type: "export_declaration",
      exportKind: "all",
      source: "./mod.js",
      specifiers: [{ type: "export_namespace", exported: "ns" }],
    });
  });
  await t.step("parses export default expression", () => {
    testStatement("export default 42;", {
      type: "export_declaration",
      exportKind: "default",
      declaration: { type: "number", value: 42 },
    });
  });
  await t.step("parses export default function", () => {
    testStatement("export default function foo() {}", {
      type: "export_declaration",
      exportKind: "default",
      declaration: {
        type: "function_declaration",
        identifier: "foo",
      },
    });
  });
  await t.step("parses export default class", () => {
    testStatement("export default class Foo {}", {
      type: "export_declaration",
      exportKind: "default",
      declaration: {
        type: "class_declaration",
        identifier: "Foo",
      },
    });
  });
});
