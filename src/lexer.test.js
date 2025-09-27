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

Deno.test("lexes regex literal", () => {
  const lexer = new Lexer();
  const src = `if (true) /abc/g;`;

  const tokens = lexer.run("", src).filter((t) => t.type !== "keyword" || t.value !== "if");

  const regexToken = tokens.find((t) => t.type === "regex");

  assertObjectMatch(regexToken, {
    type: "regex",
    value: "abc",
    regexFlags: "g",
  });
});

Deno.test("does not mistake division for regex", () => {
  const lexer = new Lexer();
  const src = `a / b;`;

  const tokens = lexer.run("", src);

  assertEquals(tokens.map((t) => t.type), [
    "identifier",
    "divide",
    "identifier",
    "semicolon",
  ]);
});

Deno.test("lexes regex literal with character classes and escapes", () => {
  const lexer = new Lexer();
  const src = `/[a-z\\/]+/gi;`;

  const tokens = lexer.run("", src);
  const regexToken = tokens.find((t) => t.type === "regex");

  assertObjectMatch(regexToken, {
    type: "regex",
    value: "[a-z\\/]+",
    regexFlags: "gi",
  });
});

Deno.test("allows regex literal after return keyword", () => {
  const lexer = new Lexer();
  const src = `return /foo?/i;`;

  const tokens = lexer.run("", src);
  const regexToken = tokens.find((t) => t.type === "regex");

  assertObjectMatch(regexToken, {
    type: "regex",
    value: "foo?",
    regexFlags: "i",
  });
});

Deno.test("allows regex after control paren", () => {
  const lexer = new Lexer();
  const src = `if (ok) /test/.exec(str);`;

  const tokens = lexer.run("", src);
  const regexToken = tokens.find((t) => t.type === "regex");

  assertObjectMatch(regexToken, {
    type: "regex",
    value: "test",
    regexFlags: "",
  });
});
