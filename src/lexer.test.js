import { assertObjectMatch } from "jsr:@std/assert";
import { describe, it } from "jsr:@std/testing/bdd";
import { Lexer } from "./lexer.ts";

describe("lexer", () => {
  it("correctly lexes keywords", () => {
    const lexer = new Lexer();
    const src = `const`;

    const tokens = lexer.run("", src);

    assertObjectMatch(tokens[0], {
      type: "keyword",
      value: "const",
    });
  });

  it("correctly lexes identifier", () => {
    const lexer = new Lexer();
    const src = `abcd`;

    const tokens = lexer.run("", src);

    assertObjectMatch(tokens[0], {
      type: "identifier",
      value: "abcd",
    });
  });

  it("correctly lexes identifier that starts with keyword", () => {
    const lexer = new Lexer();
    const src = `constructor`;

    const tokens = lexer.run("", src);

    assertObjectMatch(tokens[0], {
      type: "identifier",
      value: "constructor",
    });
  });
});
