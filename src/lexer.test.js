import { assertEquals, assertObjectMatch } from "jsr:@std/assert";
import { Lexer } from "./lexer.ts";

Deno.test("correctly lexes keywords", () => {
  const lexer = new Lexer();
  const src = `const`;

  const tokens = lexer.run("", src);

  assertObjectMatch(tokens[0], {
    type: "keyword",
    value: "const",
  });
});

Deno.test("correctly lexes identifier", () => {
  const lexer = new Lexer();
  const src = `abcd`;

  const tokens = lexer.run("", src);

  assertObjectMatch(tokens[0], {
    type: "identifier",
    value: "abcd",
  });
});

Deno.test("correctly lexes identifier that starts with keyword", () => {
  const lexer = new Lexer();
  const src = `constructor`;

  const tokens = lexer.run("", src);

  assertObjectMatch(tokens[0], {
    type: "identifier",
    value: "constructor",
  });
});

Deno.test("strings with lexable characters in them", () => {
  const lexer = new Lexer();
  const src = `"join(','):"`;

  const tokens = lexer.run("", src);

  assertObjectMatch(tokens[0], {
    type: "string",
    value: "join(','):",
  });
});

Deno.test("lexes arithmetic assignment operators", () => {
  const lexer = new Lexer();
  const src = "+= -= *= /=";

  const tokens = lexer.run("", src);

  assertEquals(tokens.map((t) => t.type), [
    "plus_equals",
    "minus_equals",
    "multiply_equals",
    "divide_equals",
  ]);
});
