import { compile, Rules, Token as MooToken, keywords } from "moo";

const rules = {
  ws: { match: /[\s]+/, lineBreaks: true },
  identifier: {
    match: /[$_a-zA-Z][$_0-9a-zA-Z]*/,
    type: keywords({
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
        "new",
        "extends",
        "break",
        "switch",
        "case",
        "default",
      ],
    }),
  },

  number: [/[-]?(?:[0-9]*[.])?[0-9]+/],
  string: [
    { match: /".*"/, value: (x) => x.slice(1, -1) },
    { match: /'.*'/, value: (x) => x.slice(1, -1) },
    { match: /`.*`/, value: (x) => x.slice(1, -1) },
  ],
  left_brace: "{",
  right_brace: "}",
  left_paren: "(",
  right_paren: ")",
  left_bracket: "[",
  right_bracket: "]",
  comment: /\/\/.*/,
  regex_literal: /\/.*\//,
  comma: ",",
  increment: "++",
  plus: "+",
  asterisk: "*",
  decrement: "--",
  minus: "-",
  slash: "/",
  arrow: "=>",
  strict_equal_to: "===",
  equal_to: "==",
  equals: "=",
  spread: "...",
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
  strict_not_equal: "!==",
  not_equal: "!=",
  not: "!",
  question_mark: "?",
  eof: "<eof>",
} as const;

export type TokenType = keyof typeof rules | "keyword";
export type Token = MooToken & { type: TokenType; filename: string };

export class Lexer {
  lexer = compile(rules as Rules);

  run(filename: string, src: string): Token[] {
    this.lexer.reset(src);
    const tokens = Array.from(this.lexer)
      .filter((t) => t.type !== "ws" && t.type !== "comment")
      .map((t) => ({ ...t, filename }));
    return tokens as Token[];
  }
}
