import { Expression, Operator, Program, Statement, Location } from "../ast.ts";
import {
  JSBoolean,
  JSFunction,
  JSNumber,
  JSString,
  JSObject,
} from "./objects.ts";
import { Runtime } from "./runtime.ts";

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

export const todo = (
  feature: string,
  { location }: { location: Location }
): InterpreterError => ({
  type: "not_yet_implemented",
  message: feature,
  location: `at ${location.file}:${location.line}:${location.column}`,
});
export const referenceError = (
  message: string,
  { location }: { location: Location }
): InterpreterError => ({
  type: "reference_error",
  message,
  location: `at ${location.file}:${location.line}:${location.column}`,
});
export const typeError = (
  message: string,
  { location }: { location: Location }
): InterpreterError => ({
  type: "type_error",
  message,
  location: `at ${location.file}:${location.line}:${location.column}`,
});

export class Interpreter {
  debug = false;

  runtime: Runtime;

  constructor(runtime: Runtime) {
    this.runtime = runtime;
  }

  executeNumericOperation(operator: Operator, left: JSNumber, right: JSNumber) {
    switch (operator) {
      case "+":
        return this.runtime.newNumber(left.value + right.value);
      case "-":
        return this.runtime.newNumber(left.value - right.value);
      case "*":
        return this.runtime.newNumber(left.value * right.value);
      case "/":
        return this.runtime.newNumber(left.value / right.value);
      case "%":
        return this.runtime.newNumber(left.value % right.value);

      case "<":
        return this.runtime.newBoolean(left.value < right.value);
      case "<=":
        return this.runtime.newBoolean(left.value <= right.value);
      case ">":
        return this.runtime.newBoolean(left.value > right.value);
      case ">=":
        return this.runtime.newBoolean(left.value >= right.value);

      case "!=":
        return this.runtime.newBoolean(left.value != right.value);
      case "!==":
        return this.runtime.newBoolean(left.value !== right.value);
      case "==":
        return this.runtime.newBoolean(left.value == right.value);
      case "===":
        return this.runtime.newBoolean(left.value === right.value);

      // logical ops: short-circuit, return operand (not coerced bool)
      case "||":
        return left.isTruthy() ? left : right;
      case "&&":
        return left.isTruthy() ? right : left;

      case "|": {
        const l = left.value | 0;
        const r = right.value | 0;
        return this.runtime.newNumber(l | r);
      }
      case "&": {
        const l = left.value | 0;
        const r = right.value | 0;
        return this.runtime.newNumber(l & r);
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
        return this.runtime.newBoolean(left.isTruthy() || right.isTruthy());
      case "&&":
        return this.runtime.newBoolean(left.isTruthy() && right.isTruthy());
      case "!=":
        return this.runtime.newBoolean(left.value != right.value);
      case "!==":
        return this.runtime.newBoolean(left.value !== right.value);
      case "==":
        return this.runtime.newBoolean(left.value == right.value);
      case "===":
        return this.runtime.newBoolean(left.value === right.value);
      case "<=":
        return this.runtime.newBoolean(left.value <= right.value);
      case "<":
        return this.runtime.newBoolean(left.value < right.value);
      case ">=":
        return this.runtime.newBoolean(left.value >= right.value);
      case ">":
        return this.runtime.newBoolean(left.value > right.value);

      // convert bools to 1 or 0 and do regular arithmetic
      case "+":
        return this.runtime.newNumber(
          (left.value ? 1 : 0) + (right.value ? 1 : 0)
        );
      case "-":
        return this.runtime.newNumber(
          (left.value ? 1 : 0) - (right.value ? 1 : 0)
        );
      case "*":
        return this.runtime.newNumber(
          (left.value ? 1 : 0) * (right.value ? 1 : 0)
        );
      case "/":
        return this.runtime.newNumber(
          (left.value ? 1 : 0) / (right.value ? 1 : 0)
        );
      case "%":
        return this.runtime.newNumber(
          (left.value ? 1 : 0) % (right.value ? 1 : 0)
        );
      case "|":
        return this.runtime.newNumber(
          (left.value ? 1 : 0) | (right.value ? 1 : 0)
        );
      case "&":
        return this.runtime.newNumber(
          (left.value ? 1 : 0) & (right.value ? 1 : 0)
        );

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
      return this.runtime.newString(left.toString() + right.toString());
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
          return this.runtime.newBoolean(ls.value < rs.value);
        case "<=":
          return this.runtime.newBoolean(ls.value <= rs.value);
        case ">":
          return this.runtime.newBoolean(ls.value > rs.value);
        case ">=":
          return this.runtime.newBoolean(ls.value >= rs.value);
      }
    }

    // equality comparisons with null
    if (left.type === "null" && right.type === "null") {
      if (expression.operator === "===" || expression.operator === "==")
        return this.runtime.newBoolean(true);
      if (expression.operator === "!==" || expression.operator === "!=")
        return this.runtime.newBoolean(false);
    }

    // equality comparisons with undefined
    if (left.type === "undefined" && right.type === "undefined") {
      if (expression.operator === "===" || expression.operator === "==")
        return this.runtime.newBoolean(true);
      if (expression.operator === "!==" || expression.operator === "!=")
        return this.runtime.newBoolean(false);
    }

    // equality comparisons with null and undefined :(
    if (
      (left.type === "null" && right.type === "undefined") ||
      (left.type === "undefined" && right.type === "null")
    ) {
      if (expression.operator === "==") return this.runtime.newBoolean(true);
      if (expression.operator === "!=") return this.runtime.newBoolean(false);
      if (expression.operator === "===") return this.runtime.newBoolean(false);
      if (expression.operator === "!==") return this.runtime.newBoolean(true);
    }

    if (
      (left.type === "number" && right.type === "undefined") ||
      (left.type === "undefined" && right.type === "number")
    ) {
      return this.runtime.newNumber(NaN);
    }

    // insane things happen here lol

    throw todo(
      "binary operation with " + left.type + " and " + right.type,
      expression
    );
  }

  call(thisArg: JSObject, fn: JSFunction, args: JSObject[]): JSObject {
    if (fn.isBuiltIn) {
      const func = fn.builtInFunction;
      const result = func(thisArg, ...args);
      return result;
    }

    this.runtime.pushScope();

    this.runtime.declareVariable("this", thisArg);

    // bind parameters
    for (let i = 0; i < fn.parameters.length; i++) {
      const parameter = fn.parameters[i];
      this.runtime.declareVariable(parameter.name, args[i]);
    }

    try {
      const result = this.executeStatement(fn.body);
      this.runtime.popScope();
      return result;
    } catch (errorOrReturnValue) {
      // rethrow if not a return value so we don't mask any actual errors

      if (errorOrReturnValue.type !== "__RETURN_VALUE__") {
        throw errorOrReturnValue;
      }

      this.runtime.popScope();
      return errorOrReturnValue.value;
    }
  }

  executeExpression(expression: Expression): JSObject {
    if (this.debug) {
      console.log("executeExpression", expression);
    }

    switch (expression.type) {
      case "number":
        return this.runtime.newNumber(expression.value);
      case "string":
        return this.runtime.newString(expression.value);
      case "boolean":
        return this.runtime.newBoolean(expression.value);
      case "identifier":
        return this.runtime.lookupVariable(expression.value);
      case "call": {
        const fnVal = this.executeExpression(expression.func);

        if (fnVal.type !== "function") {
          throw todo(`${fnVal.toString()} is not a function`, expression);
        }

        const args: JSObject[] = [];
        for (const a of expression.arguments) {
          args.push(this.executeExpression(a));
        }

        let thisVal: JSObject = this.runtime.newUndefined();

        if (expression.func.type === "member") {
          thisVal = this.executeExpression(expression.func.object);
        }

        return this.call(thisVal, fnVal as JSFunction, args);
      }

      case "new": {
        const callee = this.runtime.lookupVariable(expression.identifier);
        if (callee.type !== "function") {
          throw typeError(
            `${callee.toString()} is not a constructor`,
            expression
          );
        }
        const args: JSObject[] = [];
        for (const a of expression.arguments) {
          args.push(this.executeExpression(a));
        }
        return this.runtime.construct(callee as JSFunction, args);
      }

      case "member": {
        const object = this.executeExpression(expression.object);

        if (expression.computed) {
          return this.runtime.getProperty(
            object,
            this.executeExpression(expression.property).toString()
          );
        } else {
          if (expression.property.type !== "identifier") {
            throw todo(
              "executeExpression: member expression with computed properties",
              expression
            );
          }

          return this.runtime.getProperty(
            object,
            this.runtime.newString(expression.property.value).toString()
          );
        }
      }

      case "function": {
        return this.runtime.newFunction(expression.parameters, expression.body);
      }

      case "object": {
        const properties: Record<string, JSObject> = {};

        for (const [name, expr] of Object.entries(expression.properties)) {
          const value = this.executeExpression(expr);
          properties[name] = value;
        }

        return this.runtime.newObject(properties);
      }

      case "array": {
        const elements = [];

        for (const element of expression.elements) {
          const value = this.executeExpression(element);
          elements.push(value);
        }

        return this.runtime.newArray(elements);
      }

      case "assignment": {
        if (expression.operator !== "=") {
          throw todo("non = assignment", expression);
        }

        if (expression.left.type === "identifier") {
          const value = this.executeExpression(expression.right);
          this.runtime.setVariable(expression.left.value, value);
          return value;
        }

        if (expression.left.type === "member") {
          const memberExpression = expression.left;
          const object = this.executeExpression(memberExpression.object);

          if (object.type === "undefined" || object.type === "null") {
            throw typeError(
              "Cannot set properties of " + object.type,
              expression
            );
          }

          let property: JSObject;

          if (memberExpression.computed) {
            if (memberExpression.property.type === "identifier") {
              property = this.runtime.newString(
                memberExpression.property.value
              );
            } else {
              property = this.executeExpression(memberExpression.property);
            }
          } else {
            if (memberExpression.property.type !== "identifier") {
              throw referenceError(
                "Invalid left-hand side in assignment",
                expression
              );
            }

            property = this.runtime.newString(memberExpression.property.value);
          }

          const value = this.executeExpression(expression.right);

          this.runtime.setProperty(object, property.toString(), value);

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
        const newValue = this.runtime.newNumber(originalValue.value + 1);

        // update the value in the environment
        this.runtime.setVariable(expression.expression.value, newValue);

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
        const newValue = this.runtime.newNumber(originalValue.value - 1);

        // update the value in the environment
        this.runtime.setVariable(expression.expression.value, newValue);

        if (expression.postfix) {
          return originalValue;
        } else {
          return newValue;
        }
      }

      case "not": {
        const operand = this.executeExpression(expression.expression);
        return this.runtime.newBoolean(!operand.isTruthy());
      }

      default:
        throw todo(expression.type, expression);
    }
  }

  executeStatement(statement: Statement): JSObject {
    if (this.debug) {
      console.log("executeStatement", statement);
    }

    switch (statement.type) {
      case "empty":
        return this.runtime.newUndefined();
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
          this.runtime.declareVariable(statement.identifier, value);
          return value;
        }

        return this.runtime.newUndefined();
      }

      case "function_declaration": {
        const func = this.runtime.newFunction(
          statement.parameters,
          statement.body
        );
        this.runtime.declareVariable(statement.identifier, func);
        return this.runtime.newUndefined();
      }

      case "if": {
        const condition = this.executeExpression(statement.condition);
        if (condition.isTruthy()) {
          this.executeStatement(statement.ifBody);
        } else if (statement.elseBody !== undefined) {
          this.executeStatement(statement.elseBody);
        }

        return this.runtime.newUndefined();
      }

      case "for": {
        this.executeStatement(statement.init);

        let test = this.executeExpression(statement.test);

        while (test && test.isTruthy()) {
          this.executeStatement(statement.body);
          this.executeExpression(statement.update);
          test = this.executeExpression(statement.test);
        }

        return this.runtime.newUndefined();
      }

      case "while": {
        let condition = this.executeExpression(statement.condition);
        while (condition.isTruthy()) {
          this.executeStatement(statement.body);
          condition = this.executeExpression(statement.condition);
          if (!condition.isTruthy()) break;
        }

        return this.runtime.newUndefined();
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
            return this.runtime.newUndefined();
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

  executeStatements(statements: Statement[]): JSObject {
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

    let lastValue = this.runtime.newUndefined();

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

  run(program: Program): JSObject {
    return this.executeStatements(program.body);
  }
}
