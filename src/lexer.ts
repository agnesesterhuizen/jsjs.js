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
    "catch",
    "class",
    "const",
    "default",
    "else",
    "extends",
    "export",
    "false",
    "finally",
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
    "throw",
    "true",
    "try",
    "typeof",
    "var",
    "void",
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
  multiline_comment_start: { match: "/*", push: "multiline_comment" },
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
  backslash: "\\",
  caret: "^",
  dollar: "$",
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

const multilineCommentRules = {
  multiline_comment_end: { match: "*/", pop: 1 },
  multiline_comment_content: { match: /[\s\S]/, lineBreaks: true },
} as const;

type MainTokenType = keyof typeof mainRules;
type TemplateTokenType = keyof typeof templateRules;
type TemplateExpressionTokenType = keyof typeof templateExpressionRules;
type TemplateExpressionNestedTokenType =
  keyof typeof templateExpressionNestedRules;
type MultilineCommentTokenType = keyof typeof multilineCommentRules;

export type TokenType =
  | MainTokenType
  | TemplateTokenType
  | TemplateExpressionTokenType
  | TemplateExpressionNestedTokenType
  | MultilineCommentTokenType
  | "keyword"
  | "regex";
export type Token = MooToken & {
  type: TokenType;
  filename: string;
  regexFlags?: string;
};

type ParenContext = "control" | "normal";

const CONTROL_KEYWORDS = new Set([
  "if",
  "while",
  "for",
  "with",
  "switch",
  "catch",
]);
const KEYWORDS_ENDING_EXPRESSION = new Set([
  "true",
  "false",
  "null",
  "this",
  "super",
]);
const KEYWORDS_ALLOW_REGEX = new Set([
  "return",
  "case",
  "throw",
  "delete",
  "void",
  "typeof",
  "in",
  "instanceof",
  "new",
]);

const TOKEN_TYPES_ENDING_EXPRESSION = new Set([
  "identifier",
  "number",
  "string",
  "right_paren",
  "right_bracket",
  "right_brace",
  "increment",
  "decrement",
  "regex",
  "template_end",
]);

const TOKEN_TYPES_ALLOW_REGEX = new Set([
  "left_paren",
  "left_brace",
  "left_bracket",
  "comma",
  "semicolon",
  "colon",
  "equals",
  "plus",
  "minus",
  "multiply",
  "divide",
  "modulo",
  "or",
  "logical_or",
  "and",
  "logical_and",
  "less_than",
  "less_than_or_equal_to",
  "greater_than",
  "greater_than_or_equal_to",
  "not",
  "question_mark",
  "plus_equals",
  "minus_equals",
  "multiply_equals",
  "divide_equals",
  "arrow",
  "spread",
]);

export class Lexer {
  lexer = states({
    main: mainRules,
    template: templateRules,
    template_expression: templateExpressionRules,
    template_expression_nested: templateExpressionNestedRules,
    multiline_comment: multilineCommentRules,
  } as MooStates);

  run(filename: string, src: string): Token[] {
    this.lexer.reset(src);
    const rawTokens = Array.from(this.lexer) as MooToken[];

    const processed: Token[] = [];
    const skipTypes = new Set([
      "ws",
      "comment",
      "multiline_comment_start",
      "multiline_comment_end",
      "multiline_comment_content",
    ]);
    let canRegex = true;
    let pendingControlParen = false;
    const parenStack: ParenContext[] = [];

    for (let i = 0; i < rawTokens.length; i++) {
      const raw = rawTokens[i];

      if (skipTypes.has(raw.type)) {
        continue;
      }

      if (raw.type === "divide" && canRegex) {
        const scanned = this.scanRegexLiteral(src, raw.offset);
        if (scanned) {
          const token: Token = {
            ...raw,
            type: "regex",
            value: scanned.pattern,
            regexFlags: scanned.flags,
            text: scanned.raw,
            lineBreaks: 0,
            filename,
          };

          processed.push(token);
          canRegex = false;

          while (
            i + 1 < rawTokens.length &&
            rawTokens[i + 1].offset < scanned.end
          ) {
            i++;
          }

          continue;
        }
      }

      const token: Token = { ...(raw as MooToken), filename } as Token;
      processed.push(token);

      if (token.type === "keyword") {
        const keyword = token.value;

        if (CONTROL_KEYWORDS.has(keyword)) {
          pendingControlParen = true;
          canRegex = true;
          continue;
        }

        pendingControlParen = false;

        if (KEYWORDS_ENDING_EXPRESSION.has(keyword)) {
          canRegex = false;
          continue;
        }

        if (KEYWORDS_ALLOW_REGEX.has(keyword)) {
          canRegex = true;
          continue;
        }

        canRegex = true;
        continue;
      }

      switch (token.type) {
        case "left_paren": {
          parenStack.push(pendingControlParen ? "control" : "normal");
          pendingControlParen = false;
          canRegex = true;
          break;
        }
        case "right_paren": {
          const ctx = parenStack.pop() ?? "normal";
          pendingControlParen = false;
          canRegex = ctx === "control";
          break;
        }
        default: {
          pendingControlParen = false;
          if (TOKEN_TYPES_ENDING_EXPRESSION.has(token.type)) {
            canRegex = false;
          } else if (TOKEN_TYPES_ALLOW_REGEX.has(token.type)) {
            canRegex = true;
          } else {
            canRegex = true;
          }
        }
      }
    }

    return processed;
  }

  private scanRegexLiteral(
    src: string,
    start: number
  ): { pattern: string; flags: string; end: number; raw: string } | null {
    let index = start + 1;
    let inClass = false;
    let escaped = false;

    while (index < src.length) {
      const char = src[index];

      if (escaped) {
        escaped = false;
        index++;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        index++;
        continue;
      }

      if (char === "[" && !inClass) {
        inClass = true;
        index++;
        continue;
      }

      if (char === "]" && inClass) {
        inClass = false;
        index++;
        continue;
      }

      if ((char === "\n" || char === "\r") && !escaped) {
        return null;
      }

      if (char === "/" && !inClass) {
        break;
      }

      index++;
    }

    if (index >= src.length || src[index] !== "/") {
      return null;
    }

    const pattern = src.slice(start + 1, index);

    let flagIndex = index + 1;
    while (flagIndex < src.length && /[a-zA-Z]/.test(src[flagIndex])) {
      flagIndex++;
    }

    const flags = src.slice(index + 1, flagIndex);
    return {
      pattern,
      flags,
      end: flagIndex,
      raw: src.slice(start, flagIndex),
    };
  }
}
