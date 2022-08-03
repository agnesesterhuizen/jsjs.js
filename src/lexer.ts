type TokenType =
  | "number"
  | "semicolon"
  | "dot"
  | "comma"
  | "colon"
  | "string"
  | "keyword"
  | "identifier"
  | "left_paren"
  | "right_paren"
  | "logical_or"
  | "or"
  | "logical_and"
  | "and"
  | "less_than_or_equal_to"
  | "less_than"
  | "greater_than_or_equal_to"
  | "greater_than"
  | "exclamation"
  | "question_mark"
  | "equals"
  | "plus"
  | "minus"
  | "slash"
  | "asterisk"
  | "left_brace"
  | "right_brace"
  | "left_bracket"
  | "right_bracket";

interface Token<T> {
  type: T;
  value: string;
}

type LexResult<T> =
  | {
      type: "success";
      tokens: Token<T>[];
    }
  | {
      type: "failed";
      error: string;
      tokens: Token<T>[];
    };

interface Rule<T> {
  pattern: RegExp;
  callback: (text: string) => T;
}

export class Lexer<T> {
  rules: Rule<T>[] = [];
  skips: RegExp[] = [];
  source = "";
  index = 0;
  tokens: Token<T>[] = [];

  match(pattern: RegExp, callback: (text: string) => T) {
    this.rules.push({ pattern, callback });
  }

  skip(pattern: RegExp) {
    this.skips.push(pattern);
  }

  getTokens(source: string): LexResult<T> {
    this.source = source;
    this.index = 0;

    let remaining = this.source.substring(this.index);

    while (this.index < this.source.length) {
      if (remaining.length === 0) {
        break;
      }

      let matched = false;
      let skipped = false;

      for (let pattern of this.skips) {
        const matches = remaining.match(pattern);

        if (matches) {
          const value = matches[0];

          this.index += value.length;

          remaining = this.source.substring(this.index);
          skipped = true;
          break;
        }
      }

      if (skipped) {
        continue;
      }

      if (remaining.length === 0) {
        break;
      }

      for (let rule of this.rules) {
        const matches = remaining.match(rule.pattern);

        if (matches) {
          const value = matches[0];
          const type = rule.callback(value);
          this.tokens.push({ type, value });

          this.index += value.length;
          matched = true;
          break;
        }
      }

      if (!matched) {
        return {
          type: "failed",
          tokens: this.tokens,
          error: `unexpected token: ${remaining[0]}, ${remaining.charCodeAt(0)}}`,
        };
      }

      remaining = this.source.substring(this.index);
    }

    return { type: "success", tokens: this.tokens };
  }
}

export const newJSLexer = () => {
  const lexer = new Lexer<TokenType>();

  lexer.skip(/^\s+/);
  lexer.skip(/^\n+/);
  lexer.skip(/^\/\/.*\n/);

  lexer.match(/^;/, () => "semicolon");
  lexer.match(/^\./, () => "dot");
  lexer.match(/^\,/, () => "comma");
  lexer.match(/^\:/, () => "colon");
  lexer.match(/^\(/, () => "left_paren");
  lexer.match(/^\)/, () => "right_paren");
  lexer.match(/^\{/, () => "left_brace");
  lexer.match(/^\}/, () => "right_brace");
  lexer.match(/^\[/, () => "left_bracket");
  lexer.match(/^\]/, () => "right_bracket");
  lexer.match(/^\|/, () => "logical_or");
  lexer.match(/^\|\|/, () => "or");
  lexer.match(/^\&/, () => "logical_and");
  lexer.match(/^\&\&/, () => "and");
  lexer.match(/^<=/, () => "less_than_or_equal_to");
  lexer.match(/^</, () => "less_than");
  lexer.match(/^>=/, () => "greater_than_or_equal_to");
  lexer.match(/^>/, () => "greater_than");
  lexer.match(/^!/, () => "exclamation");
  lexer.match(/^\?/, () => "question_mark");
  lexer.match(/^=/, () => "equals");
  lexer.match(/^\+/, () => "plus");
  lexer.match(/^\-/, () => "minus");
  lexer.match(/^\//, () => "slash");
  lexer.match(/^\*/, () => "asterisk");
  lexer.match(/^\d+([\d+|.]\d*)*/, () => "number");
  lexer.match(/^".*"/, () => "string");
  lexer.match(/^`(.|\n)*`/, () => "string");
  lexer.match(/^\'.*\'/, () => "string");
  lexer.match(/^function|^return|^for|^const|^let|^var/, () => "keyword");
  lexer.match(/^[$_a-zA-Z][$_0-9a-zA-Z]*/, () => "identifier");

  return lexer;
};
