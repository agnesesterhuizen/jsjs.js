import { JSToken } from "./js-lexer";
import { Option } from "./types";

export type Operator = "+" | "*";

export const getOperatorFromToken = (token: JSToken): Operator => {
  if (token.type === "plus") return "+";
  if (token.type === "asterisk") return "*";
  throw "not an operator: " + token.type;
};

export const OPERATOR_PRECEDENCE: Record<Operator, number> = {
  "+": 1,
  "*": 2,
};

export type ClassPropertyDeclaration = {
  name: string;
  value?: Expression;
};

export type ClassMethodDeclaration = {
  name: string;
  parameters: string[];
  body: Statement;
};

export type Expression =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "boolean"; value: boolean }
  | { type: "identifier"; value: string }
  | { type: "object"; properties: Record<string, Expression> }
  | { type: "array"; elements: Expression[] }
  | { type: "member"; object: Expression; property: Expression; computed: boolean }
  | { type: "binary"; left: Expression; right: Expression; operator: Operator }
  | { type: "call"; function: Expression; arguments: Expression[] }
  | {
      type: "function";
      identifier: Option<string>;
      parameters: string[];
      body: Statement;
    }
  | {
      type: "assignment";
      operator: "=";
      left: Expression;
      right: Expression;
    };

export type Statement =
  | { type: "empty" }
  | { type: "expression"; expression: Expression }
  | {
      type: "variable_declaration";
      declarationType: "var";
      identifier: string;
      value: Option<Expression>;
    }
  | {
      type: "function_declaration";
      identifier: string;
      parameters: string[];
      body: Statement;
    }
  | {
      type: "class_declaration";
      identifier: string;
      properties: ClassPropertyDeclaration[];
      methods: ClassMethodDeclaration[];
    }
  | {
      type: "block";
      body: Statement[];
    }
  | { type: "return"; expression: Expression }
  | { type: "if"; condition: Expression; ifBody: Statement; elseBody: Option<Statement> }
  | { type: "while"; condition: Expression; body: Statement };

export interface Program {
  body: Statement[];
}
