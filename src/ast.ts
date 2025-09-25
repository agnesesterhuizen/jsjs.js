import { Token } from "./lexer";
import { assertNotReached, Option } from "./types";

export type Operator =
  | "+"
  | "*"
  | "-"
  | "/"
  | "!="
  | "!=="
  | "==="
  | "=="
  | "<="
  | "<"
  | ">="
  | ">"
  | "||"
  | "|"
  | "&&"
  | "&";

export const TOKEN_TO_OPERATOR: Record<string, Operator> = {
  plus: "+",
  minus: "-",
  asterisk: "*",
  divide: "/",

  not_equal: "!=",
  strict_not_equal: "!==",
  equal_to: "==",
  strict_equal_to: "===",

  greater_than: ">",
  greater_than_or_equal_to: ">=",
  less_than: "<",
  less_than_or_equal_to: "<=",

  or: "||",
  logical_or: "|",
  and: "&&",
  logical_and: "&",
};

export const getOperatorFromToken = (token: Token): Operator => {
  const op = TOKEN_TO_OPERATOR[token.type];
  if (!op) {
    throw new Error("not an operator: " + token.type);
  }
  return op;
};
export const OPERATOR_PRECEDENCE: Record<Operator, number> = {
  "||": 1,
  "&&": 2,
  "|": 3,
  "&": 5,
  "==": 6,
  "!=": 6,
  "===": 6,
  "!==": 6,
  "<": 7,
  "<=": 7,
  ">": 7,
  ">=": 7,
  "+": 8,
  "-": 8,
  "*": 9,
  "/": 9,
};
export type Parameter = {
  name: string;
  spread?: boolean;
};

export type ClassPropertyDeclaration = {
  name: string;
  value?: Expression;
  static: boolean;
};

export type ClassMethodDeclaration = {
  name: string;
  parameters: Parameter[];
  body: Statement;
  static: boolean;
};

export type Expression =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "boolean"; value: boolean }
  | { type: "identifier"; value: string }
  | { type: "object"; properties: Record<string, Expression> }
  | { type: "array"; elements: Expression[] }
  | { type: "member"; object: Expression; property: Expression; computed: boolean }
  | { type: "not"; expression: Expression }
  | { type: "binary"; left: Expression; right: Expression; operator: Operator }
  | { type: "call"; func: Expression; arguments: Expression[] }
  | {
      type: "function";
      identifier: Option<string>;
      parameters: Parameter[];
      body: Statement;
    }
  | {
      type: "assignment";
      operator: "=";
      left: Expression;
      right: Expression;
    }
  | {
      type: "new";
      identifier: string;
      arguments: Expression[];
    }
  | {
      type: "spread";
      expression: Expression;
    }
  | {
      type: "increment";
      expression: Expression;
      postfix: boolean;
    }
  | {
      type: "decrement";
      expression: Expression;
      postfix: boolean;
    };

export type Statement =
  | { type: "empty" }
  | { type: "expression"; expression: Expression }
  | {
      type: "variable_declaration";
      declarationType: "var";
      identifier: string;
      value: Option<Expression>;
      varType: "var" | "let" | "const";
    }
  | {
      type: "function_declaration";
      identifier: string;
      parameters: Parameter[];
      body: Statement;
    }
  | {
      type: "class_declaration";
      identifier: string;
      properties: ClassPropertyDeclaration[];
      methods: ClassMethodDeclaration[];
      superClass?: string;
    }
  | {
      type: "block";
      body: Statement[];
    }
  | { type: "return"; expression?: Expression }
  | { type: "break"; expression?: Expression }
  | { type: "if"; condition: Expression; ifBody: Statement; elseBody: Option<Statement> }
  | { type: "while"; condition: Expression; body: Statement }
  | { type: "switch"; condition: Expression; cases: SwitchCase[]; default: Option<Statement> };

export type SwitchCase = {
  test: Expression;
  body: Statement;
};

export interface Program {
  body: Statement[];
}
