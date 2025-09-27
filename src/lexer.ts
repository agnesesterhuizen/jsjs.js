import moo from "npm:moo@^0.5.2";

// Extract the needed functions from the moo object
const { states, keywords } = moo;

// Define types for moo
interface MooToken {
  type: string;
  value: string;
  text: string;
  toString(): string;
  offset: number;
  lineBreaks: number;
  line: number;
  col: number;
}

interface MooRule {
  match?: RegExp | string;
  value?: ((x: string) => unknown) | unknown;
  type?: unknown;
  lineBreaks?: boolean;
}

interface MooRules {
  [key: string]: MooRule | MooRule[] | string | RegExp;
}

interface MooStates {
  [key: string]: MooRules;
}

const keywordTypes = keywords({
  keyword: [
    "break",
    "case",
    "class",
    "const",
    "default",
    "else",
    "extends",
    "export",
    "false",
    "for",
    "function",
    "if",
    "import",
    "let",
    "new",
    "null",
    "return",
    "static",
    "super",
    "switch",
    "true",
    "typeof",
    "var",
    "while",
  ],
});

const stringRules: MooRule[] = [
  { match: /"[^"]*"/, value: (x: string) => x.slice(1, -1) },
  { match: /'[^']*'/, value: (x: string) => x.slice(1, -1) },
];

const commonRules = {
  ws: { match: /[\s]+/, lineBreaks: true },
  identifier: {
    match: /[$_a-zA-Z][$_0-9a-zA-Z]*/,
    type: keywordTypes,
  },
  number: /[-]?(?:[0-9]*[.])?[0-9]+/,
  string: stringRules,
  left_paren: "(",
  right_paren: ")",
  left_bracket: "[",
  right_bracket: "]",
  comment: /\/\/.*/,
  comma: ",",
  increment: "++",
  plus_equals: "+=",
  plus: "+",
  multiply_equals: "*=",
  multiply: "*",
  decrement: "--",
  minus_equals: "-=",
  minus: "-",
  divide_equals: "/=",
  divide: "/",
  modulo: "%",
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

const mainRules = {
  ...commonRules,
  left_brace: "{",
  right_brace: "}",
  template_start: { match: /`/, push: "template" },
} as const;

const templateRules = {
  template_expr_start: { match: /\${/, push: "template_expression" },
  template_end: { match: /`/, pop: 1 },
  template_chunk: {
    match: /(?:\\[`$]|[^`$]|[$](?!\{))+/,
    lineBreaks: true,
    value: (x: string) => x,
  },
} as const;

const expressionBaseRules = {
  ...commonRules,
  template_start: { match: /`/, push: "template" },
} as const;

const templateExpressionRules = {
  ...expressionBaseRules,
  left_brace: { match: /\{/, push: "template_expression_nested" },
  template_expr_end: { match: /\}/, pop: 1 },
} as const;

const templateExpressionNestedRules = {
  ...expressionBaseRules,
  left_brace: { match: /\{/, push: "template_expression_nested" },
  right_brace: { match: /\}/, pop: 1 },
} as const;

type MainTokenType = keyof typeof mainRules;
type TemplateTokenType = keyof typeof templateRules;
type TemplateExpressionTokenType = keyof typeof templateExpressionRules;
type TemplateExpressionNestedTokenType = keyof typeof templateExpressionNestedRules;

export type TokenType =
  | MainTokenType
  | TemplateTokenType
  | TemplateExpressionTokenType
  | TemplateExpressionNestedTokenType
  | "keyword";
export type Token = MooToken & { type: TokenType; filename: string };

export class Lexer {
  lexer = states(
    {
      main: mainRules,
      template: templateRules,
      template_expression: templateExpressionRules,
      template_expression_nested: templateExpressionNestedRules,
    } as MooStates
  );

  run(filename: string, src: string): Token[] {
    this.lexer.reset(src);
    const tokens = (Array.from(this.lexer) as MooToken[])
      .filter((t) => t.type !== "ws" && t.type !== "comment")
      .map((t) => ({ ...t, filename }));
    return tokens as Token[];
  }
}
