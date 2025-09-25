import { assert } from "jsr:@std/assert/assert";
import { JSJS } from "./jsjs.ts";
import { assertEquals } from "jsr:@std/assert/equals";

const setupLogger = () => {
  const logs: any[] = [];

  const logger = (...data: any[]) => {
    logs.push(data);
  };

  return { logs, logger };
};

Deno.test("logger words", () => {
  const src = `console.log("hello world")`;

  const { logs, logger } = setupLogger();

  const jsjs = new JSJS();
  jsjs.interpreter.logger = logger;

  jsjs.run("TEST", src);

  assertEquals(logs.length, 1);
  assertEquals(logs[0], ["hello world"]);
});

Deno.test("interpreter: array.length", () => {
  const src = `
      const arr = [1, 2, 3, 4, 5];
      console.log(arr.length);
    `;

  const jsjs = new JSJS();

  const { logs, logger } = setupLogger();
  jsjs.interpreter.logger = logger;

  jsjs.run("TEST", src);

  assertEquals(logs.length, 1);
  assertEquals(logs[0][0], "5");
});
