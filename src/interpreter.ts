import { Expression, Program, Statement } from "./ast";
import { JSFunction, JSNumber, JSObject, JSValue } from "./js-types";
import { assertNotReached, Option, Result } from "./types";

export type InterpreterError =
  | {
      type: "not_yet_implemented";
      message?: string;
    }
  | {
      type: "reference_error";
      message: string;
    }
  | {
      type: "type_error";
      message: string;
    };

const todo = (feature: string): InterpreterError => ({ type: "not_yet_implemented", message: feature });
const referenceError = (message: string): InterpreterError => ({ type: "reference_error", message });
const typeError = (message: string): InterpreterError => ({ type: "type_error", message });

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

export class Interpreter {
  debug = false;

  scope = 0;
  scopes: Record<string, JSValue>[] = [];

  constructor() {
    const global = {
      console: JSObject.object({
        log: JSObject.builtinFunction((...args: JSValue[]) => {
          const strings = args.map((x) => x.toString());
          console.log(...strings);
          return JSObject.undefined();
        }),
      }),
    };

    this.scopes.push(global);
  }

  pushScope() {
    this.scopes.push({});
  }

  popScope() {
    this.scopes.pop();
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

      if (scope[name]) {
        return scope[name];
      }

      index--;
    }

    return JSObject.undefined();
  }

  executeExpression(expression: Expression): Result<JSValue, InterpreterError> {
    if (this.debug) {
      console.log("executeExpression", expression);
    }

    switch (expression.type) {
      case "number":
        return Result.ok(JSObject.number(expression.value));
      case "string":
        return Result.ok(JSObject.string(expression.value));
      case "boolean":
        return Result.ok(JSObject.boolean(expression.value));
      case "identifier":
        return Result.ok(this.lookupVariable(expression.value));
      case "call": {
        const identifierResult = this.executeExpression(expression.function);
        if (identifierResult.isErr()) return identifierResult;

        const value = identifierResult.unwrap();

        if (value.type !== "function") {
          return Result.err({ type: "type_error", message: `TODO: x is not a function` });
        }

        const functionValue = value as JSFunction;

        if (!functionValue.isBuiltIn) {
          this.pushScope();

          for (let i = 0; i < expression.arguments.length; i++) {
            const arg = expression.arguments[i];
            const result = this.executeExpression(arg);
            if (result.isErr()) return result;
            const parameter = functionValue.parameters[i];
            this.declareVariable(parameter, result.unwrap());
          }

          try {
            const result = this.executeStatement(functionValue.body.unwrap());
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

        const func = functionValue.builtInFunction.unwrap();

        const args = [];

        for (const arg of expression.arguments) {
          const result = this.executeExpression(arg);
          if (result.isErr()) return result;
          args.push(result.unwrap());
        }

        const result = func(...args);
        return Result.ok(result);
      }

      case "member": {
        const objectResult = this.executeExpression(expression.object);
        if (objectResult.isErr()) return objectResult;

        const object = objectResult.unwrap();

        if (expression.computed) {
          const property = this.executeExpression(expression.property);
          if (property.isErr()) return property;

          return Result.ok(object.getProperty(property.unwrap()));
        } else {
          if (expression.property.type !== "identifier") {
            return Result.err(todo(`executeExpression: member expression with computed properties`));
          }

          return Result.ok(object.getProperty(JSObject.string(expression.property.value)));
        }
      }

      case "function": {
        return Result.ok(JSObject.function(expression.parameters, expression.body));
      }

      case "object": {
        const properties = {};

        for (const [name, expr] of Object.entries(expression.properties)) {
          const value = this.executeExpression(expr);
          if (value.isErr()) return value;

          properties[name] = value.unwrap();
        }

        return Result.ok(JSObject.object(properties));
      }

      case "array": {
        const elements = [];

        for (const element of expression.elements) {
          const value = this.executeExpression(element);
          if (value.isErr()) return value;

          elements.push(value.unwrap());
        }

        return Result.ok(JSObject.array(elements));
      }

      case "assignment": {
        if (expression.operator !== "=") {
          return Result.err(todo("non = assignment"));
        }

        if (expression.left.type === "identifier") {
          const value = this.executeExpression(expression.right);
          if (value.isErr()) return value;
          this.setVariable(expression.left.value, value.unwrap());
          return Result.ok(value.unwrap());
        }

        if (expression.left.type === "member") {
          const memberExpression = expression.left;
          if (memberExpression.object.type !== "identifier") {
            return Result.err({ type: "reference_error", message: "Invalid left-hand side in assignment" });
          }

          const object = this.lookupVariable(memberExpression.object.value);
          if (object.type === "undefined" || object.type === "null") {
            return Result.err(typeError(`Cannot set properties of ${object.type})`));
          }

          let property: JSValue;

          if (memberExpression.computed) {
            if (memberExpression.property.type === "identifier") {
              property = JSObject.string(memberExpression.property.value);
            } else {
              const value = this.executeExpression(memberExpression.property);
              if (value.isErr()) return value;
              property = value.unwrap();
            }
          } else {
            if (memberExpression.property.type !== "identifier") {
              return Result.err(referenceError("Invalid left-hand side in assignment"));
            }
          }

          const value = this.executeExpression(expression.right);
          if (value.isErr()) return value;

          object.setProperty(property, value.unwrap());

          return Result.ok(value.unwrap());
        }

        return Result.err(referenceError("Invalid left-hand side in assignment"));
      }

      case "binary": {
        const right = this.executeExpression(expression.right);
        if (right.isErr()) return right;

        const left = this.executeExpression(expression.left);
        if (left.isErr()) return left;

        const rightValue = right.unwrap();
        const leftValue = left.unwrap();

        if (rightValue.type !== "number" || leftValue.type !== "number") {
          return Result.err(todo(`non numeric binary expression`));
        }

        switch (expression.operator) {
          case "+": {
            const result = JSObject.number((leftValue as JSNumber).value + (rightValue as JSNumber).value);
            return Result.ok(result);
          }
          default:
            assertNotReached(expression);
          // return Result.err(todo(`binary expression with "${expression.operator}" operater`));
        }
        break;
      }

      default:
        assertNotReached(expression);
    }
  }

  executeStatement(statement: Statement): Result<JSValue, InterpreterError> {
    if (this.debug) {
      console.log("executeStatement", statement);
    }

    switch (statement.type) {
      case "empty":
        return Result.ok(JSObject.undefined());
      case "block":
        return this.executeStatements(statement.body);
      case "expression":
        return this.executeExpression(statement.expression);
      case "return": {
        const value = this.executeExpression(statement.expression);
        throw { type: "__RETURN_VALUE__", value };
      }
      case "variable_declaration": {
        if (statement.value.hasValue()) {
          const result = this.executeExpression(statement.value.unwrap());
          if (result.isErr()) return result;
          const value = result.unwrap();
          this.declareVariable(statement.identifier, value);
          return Result.ok(value);
        }

        return Result.ok(JSObject.undefined());
      }

      case "function_declaration": {
        const func = JSObject.function(statement.parameters, statement.body);
        this.declareVariable(statement.identifier, func);
        return Result.ok(JSObject.undefined());
      }

      case "if": {
        const condition = this.executeExpression(statement.condition);
        if (condition.isErr()) return condition;
        if (condition.unwrap().isTruthy()) {
          this.executeStatement(statement.ifBody);
        } else if (statement.elseBody.hasValue()) {
          this.executeStatement(statement.elseBody.unwrap());
        }

        return Result.ok(JSObject.undefined());
      }

      case "while": {
        return Result.err(todo("while statements"));
      }

      default:
        assertNotReached(statement);
    }
  }

  executeStatements(statements: Statement[]): Result<JSValue, InterpreterError> {
    // run function declarations first
    for (const statement of statements) {
      if (statement.type !== "function_declaration") continue;

      const result = this.executeStatement(statement);
      if (result.isErr()) return result.mapErr();
    }

    // host "var" declarations
    for (const statement of statements) {
      if (statement.type !== "variable_declaration") continue;
      if (statement.declarationType !== "var") continue;

      const result = this.executeStatement(statement);
      if (result.isErr()) return result.mapErr();
    }

    let lastValue = JSObject.undefined();

    // run other statements
    for (const statement of statements) {
      if (statement.type === "function_declaration") continue;
      if (statement.type === "variable_declaration" && statement.declarationType === "var") continue;

      const result = this.executeStatement(statement);
      if (result.isErr()) return result.mapErr();

      lastValue = result.unwrap();
    }

    return Result.ok(lastValue);
  }

  run(program: Program): Result<JSValue, InterpreterError> {
    console.log("running", JSON.stringify(program, null, 2));
    return this.executeStatements(program.body);
  }
}
