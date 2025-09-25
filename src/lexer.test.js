import { describe, expect, test } from "vitest";
import { Lexer } from "./lexer";

describe("lexer", () => {
  test("keyword", () => {
    const lexer = new Lexer();
    const src = `const`;

    const tokens = lexer.run("", src);

    expect(tokens[0]).toMatchObject({
      type: "keyword",
      value: "const",
    });
  });

  test("identifier", () => {
    const lexer = new Lexer();
    const src = `abcd`;

    const tokens = lexer.run("", src);

    expect(tokens[0]).toMatchObject({
      type: "identifier",
      value: "abcd",
    });
  });

  test("identifier that starts with keyword", () => {
    const lexer = new Lexer();
    const src = `constructor`;

    const tokens = lexer.run("", src);

    expect(tokens[0]).toMatchObject({
      type: "identifier",
      value: "constructor",
    });
  });
});
