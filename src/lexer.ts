import { ParseError } from "./Parser";
import { Result } from "./types";

export interface Token<T> {
  type: T;
  value: string;
}

interface Rule<T> {
  pattern: RegExp;
  callback: (text: string) => Token<T> | T;
}

export class Lexer<T> {
  rules: Rule<T>[] = [];
  skips: RegExp[] = [];
  source = "";
  index = 0;
  tokens: Token<T>[] = [];

  match(pattern: RegExp, callback: (text: string) => Token<T> | T) {
    this.rules.push({ pattern, callback });
  }

  skip(pattern: RegExp) {
    this.skips.push(pattern);
  }

  getTokens(source: string): Result<Token<T>[], ParseError> {
    this.source = source;
    this.index = 0;

    let remaining = this.source.substring(this.index);

    while (this.index < this.source.length) {
      if (remaining.length === 0) {
        break;
      }

      let matched = false;
      let skipped = false;

      for (const pattern of this.skips) {
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

      for (const rule of this.rules) {
        const matches = remaining.match(rule.pattern);

        if (matches) {
          const value = matches[0];
          const result = rule.callback(value);
          if (typeof result === "string") {
            this.tokens.push({ type: result, value });
          } else {
            this.tokens.push(result as Token<T>);
          }

          this.index += value.length;
          matched = true;
          break;
        }
      }

      if (!matched) {
        return Result.err({
          type: "unexpected_token",
          message: `unexpected token: ${remaining[0]} (${remaining.charCodeAt(0)})`,
        });
      }

      remaining = this.source.substring(this.index);
    }

    return Result.ok(this.tokens);
  }
}
