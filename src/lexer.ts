import { compile, Rules, Token as MooToken } from "moo";

const rules: Rules = {
  ws: { match: /[\s]+/, lineBreaks: true },
  keyword: [
    "function",
    "return",
    "for",
    "const",
    "let",
    "var",
    "true",
    "false",
    "if",
    "else",
    "while",
    "class",
    "static",
  ],
  number: [/[-]?(?:[0-9]*[.])?[0-9]+/],
  identifier: /[$_a-zA-Z][$_0-9a-zA-Z]*/,
  string: [
    { match: /".*"/, value: (x) => x.slice(1, -1) },
    { match: /'.*'/, value: (x) => x.slice(1, -1) },
    { match: /`[.|\n]*`/, value: (x) => x.slice(1, -1) },
  ],
  left_brace: "{",
  right_brace: "}",
  left_paren: "(",
  right_paren: ")",
  left_bracket: "[",
  right_bracket: "]",
  comma: ",",
  plus: "+",
  asterisk: "*",
  minus: "*",
  slash: "/",
  equals: "=",
  dot: ".",
  colon: ":",
  semicolon: ";",
  or: "||",
  logical_or: "|",
  and: "&&",
  logical_and: "&",
  less_than_or_equal_to: "<=",
  less_than: "<",
  greater_than_or_equal_to: ">=",
  greater_than: ">",
  exclamation: "!",
  question_mark: "?",
  eof: "<eof>",
};

export type TokenType = keyof typeof rules;
export type Token = MooToken & { type: TokenType };

export class Lexer {
  lexer = compile(rules);

  run(src: string): Token[] {
    this.lexer.reset(src);
    const tokens = Array.from(this.lexer).filter((t) => t.type !== "ws");
    return tokens as Token[];
  }
}
