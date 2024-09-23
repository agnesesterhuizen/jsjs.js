import { Lexer, Token } from "./lexer";

export type JSTokenType =
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

export type JSToken = Token<JSTokenType>;

export const newJSLexer = () => {
  const lexer = new Lexer<JSTokenType>();

  lexer.skip(/^\s+/);
  lexer.skip(/^\n+/);
  lexer.skip(/^\/\/.*\n/);

  lexer.match(/^;/, () => "semicolon");
  lexer.match(/^\./, () => "dot");
  lexer.match(/^,/, () => "comma");
  lexer.match(/^:/, () => "colon");
  lexer.match(/^\(/, () => "left_paren");
  lexer.match(/^\)/, () => "right_paren");
  lexer.match(/^\{/, () => "left_brace");
  lexer.match(/^\}/, () => "right_brace");
  lexer.match(/^\[/, () => "left_bracket");
  lexer.match(/^\]/, () => "right_bracket");
  lexer.match(/^\|/, () => "logical_or");
  lexer.match(/^\|\|/, () => "or");
  lexer.match(/^&/, () => "logical_and");
  lexer.match(/^&&/, () => "and");
  lexer.match(/^<=/, () => "less_than_or_equal_to");
  lexer.match(/^</, () => "less_than");
  lexer.match(/^>=/, () => "greater_than_or_equal_to");
  lexer.match(/^>/, () => "greater_than");
  lexer.match(/^!/, () => "exclamation");
  lexer.match(/^\?/, () => "question_mark");
  lexer.match(/^=/, () => "equals");
  lexer.match(/^\+/, () => "plus");
  lexer.match(/^-/, () => "minus");
  lexer.match(/^\//, () => "slash");
  lexer.match(/^\*/, () => "asterisk");
  lexer.match(/^0[xX][0-9a-fA-F]+/, () => "number");
  lexer.match(/^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)/, () => "number");
  lexer.match(/^".*"/, (text) => ({ type: "string", value: text.slice(1, -1) }));
  lexer.match(/^`(.|\n)*`/, (text) => ({ type: "string", value: text.slice(1, -1) }));
  lexer.match(/^'.*'/, (text) => ({ type: "string", value: text.slice(1, -1) }));
  lexer.match(/^function|^return|^for|^const|^let|^var|^true|^false|^if|^else|^while|^class/, () => "keyword");
  lexer.match(/^[$_a-zA-Z][$_0-9a-zA-Z]*/, () => "identifier");

  return lexer;
};
