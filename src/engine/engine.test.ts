import { assertEquals } from "jsr:@std/assert/equals";
import { Lexer } from "../lexer.ts";
import { Parser } from "../parser.ts";
import { Engine } from "./engine.ts";

const setupLogger = () => {
  const logs: any[] = [];

  const logger = (...data: any[]) => {
    logs.push(data);
  };

  return { logs, logger };
};

const run = (src: string) => {
  const { logs, logger } = setupLogger();

  const engine = new Engine(logger);
  const parser = new Parser();

  const lexer = new Lexer();
  const tokens = lexer.run("TEST", src);
  const program = parser.parse(tokens);

  engine.run(program);

  return { logs };
};

Deno.test("logger words", () => {
  const src = `console.log("hello world")`;

  const { logs } = run(src);

  assertEquals(logs.length, 1);
  assertEquals(logs[0], ["hello world"]);
});

Deno.test("interpreter: array.length", () => {
  const src = `
      const arr = [1, 2, 3, 4, 5];
      console.log(arr.length);
    `;

  const { logs } = run(src);

  assertEquals(logs.length, 1);
  assertEquals(logs[0][0], "5");
});

Deno.test("interpreter: template literals", () => {
  const src = `
    const name = "world";
    const a = 2;
    const b = 3;
    const multiLine = \`first line
second line\`;
    const nested = \`outer \${\`inner \${a + b}\`}\`;
    const escaped = \`backtick: \\\`\`;
    console.log(\`hello \${name}!\`);
    console.log(\`\${a} + \${b} = \${a + b}\`);
    console.log(multiLine);
    console.log(nested);
    console.log(escaped);
  `;

  const { logs } = run(src);

  assertEquals(logs.length, 5);
  assertEquals(logs[0], ["hello world!"]);
  assertEquals(logs[1], ["2 + 3 = 5"]);
  assertEquals(logs[2], ["first line\nsecond line"]);
  assertEquals(logs[3], ["outer inner 5"]);
  assertEquals(logs[4], ["backtick: `"]);
});
