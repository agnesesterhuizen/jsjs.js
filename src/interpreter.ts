import { Expression, Operator, Program, Statement, Location } from "./ast.ts";
import {
  JSArray,
  JSBoolean,
  JSFunction,
  JSNumber,
  JSObject,
  JSString,
  JSValue,
} from "./js-types.ts";

const assertNotReached = (_t: never) => {};

export type InterpreterError =
  | {
      type: "not_yet_implemented";
      message?: string;
      location?: string;
    }
  | {
      type: "reference_error";
      message: string;
      location?: string;
    }
  | {
      type: "type_error";
      message: string;
      location?: string;
    };

const todo = (
  feature: string,
  { location }: { location: Location }
): InterpreterError => ({
  type: "not_yet_implemented",
  message: feature,
  location: `at ${location.file}:${location.line}:${location.column}`,
});
const referenceError = (
  message: string,
  { location }: { location: Location }
): InterpreterError => ({
  type: "reference_error",
  message,
  location: `at ${location.file}:${location.line}:${location.column}`,
});
const typeError = (
  message: string,
  { location }: { location: Location }
): InterpreterError => ({
  type: "type_error",
  message,
  location: `at ${location.file}:${location.line}:${location.column}`,
});

// export type Value =
//   | { type: "undefined" }
//   | { type: "number"; value: number }
//   | { type: "string"; value: string }
//   | { type: "boolean"; value: boolean }
//   | { type: "object"; properties: Record<string, Value> }
//   | {
//       type: "function";
//       builtIn: boolean;
//       builtInFunc: Option<(...args: Value[]) => Value>;
//       body: Statement;
//       parameters: string[];
//     };

// const valueToString = (value: Value): string => {
//   switch (value.type) {
//     case "number":
//     case "string":
//     case "boolean":
//       return value.value.toString();
//     default:
//       return JSON.stringify(value);
//   }
// };

export type Logger = (...data: any[]) => void;

export class Interpreter {
  debug = false;

  scope = 0;
  scopes: Record<string, JSValue>[] = [];

  logger: Logger = console.log;

  constructor() {
    const global = {
      console: JSObject.object({
        log: JSObject.builtinFunction((...args: JSValue[]) => {
          this.logger(...args.map((a) => a.toString()));
          return JSObject.undefined();
        }),
      }),
      Object: JSObject.object({
        keys: JSObject.builtinFunction((obj: JSObject) => {
          const keys = new JSArray();
          keys.elements = Object.keys(obj.properties).map(
            (prop) => new JSString(prop)
          );

          return keys;
        }),
      }),
      Math: JSObject.object({
        random: JSObject.builtinFunction(() => {
          return JSObject.number(Math.random());
        }),
        floor: JSObject.builtinFunction((x: JSNumber) => {
          if (x.type !== "number") {
            throw "Math.floor expects a number";
          }
          return JSObject.number(Math.floor(x.value));
        }),
      }),
    };

    this.scopes.push(global);
  }

  pushScope() {
    this.scopes.push({});
    this.scope++;
  }

  popScope() {
    this.scopes.pop();
    this.scope--;
  }

  declareVariable(name: string, value: JSValue) {
    const scope = this.scopes[this.scope];
    scope[name] = value;
  }

  setVariable(name: string, value: JSValue) {
    const scope = this.scopes[this.scope];
    scope[name] = value;
  }

  lookupVariable(name: string) {
    let index = this.scope;

    while (index >= 0) {
      const scope = this.scopes[index];

      if (name in scope) {
        return scope[name];
      }

      index--;
    }

    return JSObject.undefined();
  }

  executeNumericOperation(operator: Operator, left: JSNumber, right: JSNumber) {
    switch (operator) {
      case "+":
        return JSObject.number(left.value + right.value);
      case "-":
        return JSObject.number(left.value - right.value);
      case "*":
        return JSObject.number(left.value * right.value);
      case "/":
        return JSObject.number(left.value / right.value);
      case "%":
        return JSObject.number(left.value % right.value);

      case "<":
        return JSObject.boolean(left.value < right.value);
      case "<=":
        return JSObject.boolean(left.value <= right.value);
      case ">":
        return JSObject.boolean(left.value > right.value);
      case ">=":
        return JSObject.boolean(left.value >= right.value);

      case "!=":
        return JSObject.boolean(left.value != right.value);
      case "!==":
        return JSObject.boolean(left.value !== right.value);
      case "==":
        return JSObject.boolean(left.value == right.value);
      case "===":
        return JSObject.boolean(left.value === right.value);

      // logical ops: short-circuit, return operand (not coerced bool)
      case "||":
        return left.isTruthy() ? left : right;
      case "&&":
        return left.isTruthy() ? right : left;

      case "|": {
        const l = left.value | 0;
        const r = right.value | 0;
        return JSObject.number(l | r);
      }
      case "&": {
        const l = left.value | 0;
        const r = right.value | 0;
        return JSObject.number(l & r);
      }

      default:
        assertNotReached(operator);
    }
  }

  executeBooleanOperation(
    expression: Expression,
    operator: Operator,
    left: JSBoolean,
    right: JSBoolean
  ) {
    switch (operator) {
      case "||":
        return JSObject.boolean(left.isTruthy() || right.isTruthy());
      case "&&":
        return JSObject.boolean(left.isTruthy() && right.isTruthy());
      case "!=":
        return JSObject.boolean(left.value != right.value);
      case "!==":
        return JSObject.boolean(left.value !== right.value);
      case "==":
        return JSObject.boolean(left.value == right.value);
      case "===":
        return JSObject.boolean(left.value === right.value);
      case "<=":
        return JSObject.boolean(left.value <= right.value);
      case "<":
        return JSObject.boolean(left.value < right.value);
      case ">=":
        return JSObject.boolean(left.value >= right.value);
      case ">":
        return JSObject.boolean(left.value > right.value);

      // convert bools to 1 or 0 and do regular arithmetic
      case "+":
        return JSObject.number((left.value ? 1 : 0) + (right.value ? 1 : 0));
      case "-":
        return JSObject.number((left.value ? 1 : 0) - (right.value ? 1 : 0));
      case "*":
        return JSObject.number((left.value ? 1 : 0) * (right.value ? 1 : 0));
      case "/":
        return JSObject.number((left.value ? 1 : 0) / (right.value ? 1 : 0));
      case "%":
        return JSObject.number((left.value ? 1 : 0) % (right.value ? 1 : 0));
      case "|":
        return JSObject.number((left.value ? 1 : 0) | (right.value ? 1 : 0));
      case "&":
        return JSObject.number((left.value ? 1 : 0) & (right.value ? 1 : 0));

      default:
        assertNotReached(operator);
        throw todo("boolean operator " + operator, expression);
    }
  }

  executeBinaryExpression(expression: Extract<Expression, { type: "binary" }>) {
    const left = this.executeExpression(expression.left);

    // short-circuit checks first
    if (expression.operator === "||") {
      return left.isTruthy() ? left : this.executeExpression(expression.right);
    }

    if (expression.operator === "&&") {
      return left.isTruthy() ? this.executeExpression(expression.right) : left;
    }

    const right = this.executeExpression(expression.right);

    if (left.type === "number" && right.type === "number") {
      const res = this.executeNumericOperation(
        expression.operator,
        left as JSNumber,
        right as JSNumber
      );

      return res;
    }

    if (left.type === "boolean" && right.type === "boolean") {
      return this.executeBooleanOperation(
        expression,
        expression.operator,
        left as JSBoolean,
        right as JSBoolean
      );
    }

    // string concatenation with +
    if (
      expression.operator === "+" &&
      (left.type === "string" || right.type === "string")
    ) {
      return JSObject.string(left.toString() + right.toString());
    }

    // string comparisons with <, <=, >, >=
    if (
      ["<", "<=", ">", ">="].includes(expression.operator) &&
      left.type === "string" &&
      right.type === "string"
    ) {
      const ls = left as JSString;
      const rs = right as JSString;

      switch (expression.operator) {
        case "<":
          return JSObject.boolean(ls.value < rs.value);
        case "<=":
          return JSObject.boolean(ls.value <= rs.value);
        case ">":
          return JSObject.boolean(ls.value > rs.value);
        case ">=":
          return JSObject.boolean(ls.value >= rs.value);
      }
    }

    // equality comparisons with null
    if (left.type === "null" && right.type === "null") {
      if (expression.operator === "===" || expression.operator === "==")
        return JSObject.boolean(true);
      if (expression.operator === "!==" || expression.operator === "!=")
        return JSObject.boolean(false);
    }

    // equality comparisons with undefined
    if (left.type === "undefined" && right.type === "undefined") {
      if (expression.operator === "===" || expression.operator === "==")
        return JSObject.boolean(true);
      if (expression.operator === "!==" || expression.operator === "!=")
        return JSObject.boolean(false);
    }

    // equality comparisons with null and undefined :(
    if (
      (left.type === "null" && right.type === "undefined") ||
      (left.type === "undefined" && right.type === "null")
    ) {
      if (expression.operator === "==") return JSObject.boolean(true);
      if (expression.operator === "!=") return JSObject.boolean(false);
      if (expression.operator === "===") return JSObject.boolean(false);
      if (expression.operator === "!==") return JSObject.boolean(true);
    }

    if (
      (left.type === "number" && right.type === "undefined") ||
      (left.type === "undefined" && right.type === "number")
    ) {
      return JSObject.number(NaN);
    }

    // insane things happen here lol

    throw todo(
      "binary operation with " + left.type + " and " + right.type,
      expression
    );
  }

  call(fn: JSFunction, args: Expression[]): JSValue {
    if (fn.isBuiltIn) {
      const func = fn.builtInFunction;

      const argValues = [];

      for (const a of args) {
        const result = this.executeExpression(a);
        argValues.push(result);
      }

      const result = func(...argValues);

      return result;
    }

    this.pushScope();

    // bind parameters
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      const result = this.executeExpression(a);
      const parameter = fn.parameters[i];
      this.declareVariable(parameter.name, result);
    }

    try {
      const result = this.executeStatement(fn.body);
      this.popScope();
      return result;
    } catch (errorOrReturnValue) {
      // rethrow if not a return value so we don't mask any actual errors

      if (errorOrReturnValue.type !== "__RETURN_VALUE__") {
        throw errorOrReturnValue;
      }

      this.popScope();
      return errorOrReturnValue.value;
    }
  }

  executeExpression(expression: Expression): JSValue {
    if (this.debug) {
      console.log("executeExpression", expression);
    }

    switch (expression.type) {
      case "number":
        return JSObject.number(expression.value);
      case "string":
        return JSObject.string(expression.value);
      case "boolean":
        return JSObject.boolean(expression.value);
      case "identifier":
        return this.lookupVariable(expression.value);
      case "call": {
        const value = this.executeExpression(expression.func);

        if (value.type !== "function") {
          throw todo(`function not defined`, expression);
        }

        return this.call(value as JSFunction, expression.arguments);
      }

      case "member": {
        const object = this.executeExpression(expression.object);

        if (expression.computed) {
          return object.getProperty(
            this.executeExpression(expression.property)
          );
        } else {
          if (expression.property.type !== "identifier") {
            throw todo(
              "executeExpression: member expression with computed properties",
              expression
            );
          }

          return object.getProperty(JSObject.string(expression.property.value));
        }
      }

      case "function": {
        return JSObject.func(expression.parameters, expression.body);
      }

      case "object": {
        const properties: Record<string, JSValue> = {};

        for (const [name, expr] of Object.entries(expression.properties)) {
          const value = this.executeExpression(expr);
          properties[name] = value;
        }

        return JSObject.object(properties);
      }

      case "array": {
        const elements = [];

        for (const element of expression.elements) {
          const value = this.executeExpression(element);
          elements.push(value);
        }

        return JSObject.array(elements);
      }

      case "assignment": {
        if (expression.operator !== "=") {
          throw todo("non = assignment", expression);
        }

        if (expression.left.type === "identifier") {
          const value = this.executeExpression(expression.right);
          this.setVariable(expression.left.value, value);
          return value;
        }

        if (expression.left.type === "member") {
          const memberExpression = expression.left;
          if (memberExpression.object.type !== "identifier") {
            throw referenceError(
              "Invalid left-hand side in assignment",
              expression
            );
          }

          const object = this.lookupVariable(memberExpression.object.value);
          if (object.type === "undefined" || object.type === "null") {
            throw typeError(
              "Cannot set properties of " + object.type,
              expression
            );
          }

          let property: JSValue;

          if (memberExpression.computed) {
            if (memberExpression.property.type === "identifier") {
              property = JSObject.string(memberExpression.property.value);
            } else {
              const value = this.executeExpression(memberExpression.property);
              property = value;
            }
          } else {
            if (memberExpression.property.type !== "identifier") {
              throw referenceError(
                "Invalid left-hand side in assignment",
                expression
              );
            }
          }

          const value = this.executeExpression(expression.right);

          object.setProperty(property, value);

          return value;
        }

        throw referenceError(
          "Invalid left-hand side in assignment",
          expression
        );
      }

      case "binary": {
        return this.executeBinaryExpression(expression);
      }

      case "increment": {
        // TODO: support member expressions

        if (!(expression.expression.type === "identifier")) {
          throw todo("unsupported expression type", expression);
        }

        // get the value
        const operand = this.executeExpression(expression.expression);
        if (operand.type !== "number") {
          throw todo("incrementing non-number", expression);
        }

        const originalValue = operand as JSNumber;
        const newValue = JSObject.number(originalValue.value + 1);

        // update the value in the environment
        this.setVariable(expression.expression.value, newValue);

        if (expression.postfix) {
          return originalValue;
        } else {
          return newValue;
        }
      }

      case "decrement": {
        // TODO: support member expressions

        if (!(expression.expression.type === "identifier")) {
          throw todo("unsupported expression type", expression);
        }

        // get the value
        const operand = this.executeExpression(expression.expression);
        if (operand.type !== "number") {
          throw todo("decrementing non-number", expression);
        }

        const originalValue = operand as JSNumber;
        const newValue = JSObject.number(originalValue.value - 1);

        // update the value in the environment
        this.setVariable(expression.expression.value, newValue);

        if (expression.postfix) {
          return originalValue;
        } else {
          return newValue;
        }
      }

      case "not": {
        const operand = this.executeExpression(expression.expression);
        return JSObject.boolean(!operand.isTruthy());
      }

      default:
        throw todo(expression.type, expression);
    }
  }

  executeStatement(statement: Statement): JSValue {
    if (this.debug) {
      console.log("executeStatement", statement);
    }

    switch (statement.type) {
      case "empty":
        return JSObject.undefined();
      case "block":
        return this.executeStatements(statement.body);
      case "expression":
        return this.executeExpression(statement.expression);
      case "return": {
        const value = this.executeExpression(statement.expression);
        throw { type: "__RETURN_VALUE__", value };
      }
      case "variable_declaration": {
        if (statement.value !== undefined) {
          const value = this.executeExpression(statement.value);
          this.declareVariable(statement.identifier, value);
          return value;
        }

        return JSObject.undefined();
      }

      case "function_declaration": {
        const func = JSObject.func(statement.parameters, statement.body);
        this.declareVariable(statement.identifier, func);
        return JSObject.undefined();
      }

      case "if": {
        const condition = this.executeExpression(statement.condition);
        if (condition.isTruthy()) {
          this.executeStatement(statement.ifBody);
        } else if (statement.elseBody !== undefined) {
          this.executeStatement(statement.elseBody);
        }

        return JSObject.undefined();
      }

      case "for": {
        this.executeStatement(statement.init);

        let test = this.executeExpression(statement.test);

        while (test && test.isTruthy()) {
          this.executeStatement(statement.body);
          this.executeExpression(statement.update);
          test = this.executeExpression(statement.test);
        }

        return JSObject.undefined();
      }

      case "while": {
        let condition = this.executeExpression(statement.condition);
        while (condition.isTruthy()) {
          this.executeStatement(statement.body);
          condition = this.executeExpression(statement.condition);
          if (!condition.isTruthy()) break;
        }

        return JSObject.undefined();
      }

      case "switch": {
        const condition = this.executeExpression(statement.condition);

        let foundCase = false;

        try {
          for (const c of statement.cases) {
            if (foundCase) {
              this.executeStatement(c.body);
              continue;
            }

            const caseValue = this.executeExpression(c.test);

            // bit of a hack, fix this
            if (caseValue.toString() === condition.toString()) {
              foundCase = true;
              this.executeStatement(c.body);
            }
          }
        } catch (e) {
          if (e.type === "__BREAK__") {
            return JSObject.undefined();
          }
          throw e;
        }

        if (statement.default) {
          return this.executeStatement(statement.default);
        }

        break;
      }

      case "break": {
        throw { type: "__BREAK__" };
      }

      default:
        throw todo(statement.type, statement);
    }
  }

  executeStatements(statements: Statement[]): JSValue {
    // run function declarations first
    for (const statement of statements) {
      if (statement.type !== "function_declaration") continue;

      this.executeStatement(statement);
    }

    // hoist "var" declarations
    for (const statement of statements) {
      if (statement.type !== "variable_declaration") continue;
      if (statement.declarationType !== "var") continue;

      this.executeStatement(statement);
    }

    let lastValue = JSObject.undefined();

    // run other statements
    for (const statement of statements) {
      if (statement.type === "function_declaration") continue;
      if (
        statement.type === "variable_declaration" &&
        statement.declarationType === "var"
      )
        continue;

      lastValue = this.executeStatement(statement);
    }

    return lastValue;
  }

  run(program: Program): JSValue {
    return this.executeStatements(program.body);
  }
}
