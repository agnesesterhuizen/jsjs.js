import { Token, TokenType } from "./lexer.ts";

export type UnaryOperator = "!" | "typeof";

export type Operator =
  | "+"
  | "*"
  | "-"
  | "/"
  | "%"
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

export const TOKEN_TO_OPERATOR: Partial<Record<TokenType, Operator>> = {
  plus: "+",
  minus: "-",
  multiply: "*",
  divide: "/",
  modulo: "%",

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

export type AssignmentOperator = "=" | "+=" | "-=" | "*=" | "/=";

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
  "%": 9,
};
export type Parameter = {
  name: string;
  spread?: boolean;
  defaultValue?: Expression;
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

export type VariableDeclarator = {
  identifier: string;
  value?: Expression;
};

export type ImportSpecifier =
  | { type: "import_default"; local: string }
  | { type: "import_named"; imported: string; local: string }
  | { type: "import_namespace"; local: string };

export type ExportSpecifier =
  | { type: "export_named"; local: string; exported: string }
  | { type: "export_namespace"; exported: string };

export type Location = {
  file: string;
  line: number;
  column: number;
};

export type WithLocation<T> = T & { location: Location };

export type Expression = WithLocation<
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | {
      type: "template_literal";
      quasis: string[];
      expressions: Expression[];
    }
  | { type: "boolean"; value: boolean }
  | { type: "identifier"; value: string }
  | { type: "null" }
  | { type: "object"; properties: Record<string, Expression> }
  | { type: "array"; elements: Expression[] }
  | {
      type: "member";
      object: Expression;
      property: Expression;
      computed: boolean;
    }
  | { type: "unary"; operator: UnaryOperator; expression: Expression }
  | { type: "binary"; left: Expression; right: Expression; operator: Operator }
  | { type: "call"; func: Expression; arguments: Expression[] }
  | {
      type: "function";
      identifier?: string;
      parameters: Parameter[];
      body: Statement;
    }
  | {
      type: "assignment";
      operator: AssignmentOperator;
      left: Expression;
      right: Expression;
    }
  | {
      type: "new";
      identifier: string;
      arguments: Expression[];
    }
  | {
      type: "conditional";
      test: Expression;
      consequent: Expression;
      alternate: Expression;
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
    }
  | {
      type: "super_call";
      arguments: Expression[];
    }
  | {
      type: "super_member";
      property: string;
    }
>;

export type Statement = WithLocation<
  | { type: "empty" }
  | { type: "expression"; expression: Expression }
  | {
      type: "variable_declaration";
      declarationType: "var";
      declarations: VariableDeclarator[];
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
  | {
      type: "if";
      condition: Expression;
      ifBody: Statement;
      elseBody?: Statement;
    }
  | { type: "while"; condition: Expression; body: Statement }
  | {
      type: "for";
      init: Statement;
      test?: Expression;
      update?: Expression;
      body: Statement;
    }
  | {
      type: "switch";
      condition: Expression;
      cases: SwitchCase[];
      default?: Statement;
    }
  | {
      type: "import_declaration";
      specifiers: ImportSpecifier[];
      source: string;
    }
  | {
      type: "export_declaration";
      exportKind: "named" | "default" | "all";
      specifiers?: ExportSpecifier[];
      declaration?: Statement | Expression;
      source?: string;
    }
>;

export type SwitchCase = {
  test: Expression;
  body: Statement[];
};

export interface Program {
  type: "program";
  body: Statement[];
}
