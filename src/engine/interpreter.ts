import {
  AssignmentOperator,
  Expression,
  Operator,
  Program,
  Statement,
  Location,
} from "../ast.ts";
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

    if (left.type === "string" && right.type === "string") {
      const ls = left as JSString;
      const rs = right as JSString;

      switch (expression.operator) {
        case "===":
        case "==":
          return this.runtime.newBoolean(ls.value === rs.value);
        case "!==":
        case "!=":
          return this.runtime.newBoolean(ls.value !== rs.value);
      }
    }

    if (
      (expression.operator === "===" || expression.operator === "!==") &&
      left.type !== right.type
    ) {
      const result = expression.operator === "===" ? false : true;
      return this.runtime.newBoolean(result);
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
      const op = expression.operator;
      if (op === "<" || op === "<=" || op === ">" || op === ">=") {
        return this.runtime.newBoolean(false);
      }

      return this.runtime.newNumber(NaN);
    }

    // function equality
    if (left.type === "function" && right.type === "function") {
      const leftFunc = left as JSFunction;
      const rightFunc = right as JSFunction;

      if (expression.operator === "===" || expression.operator === "==") {
        return this.runtime.newBoolean(leftFunc === rightFunc);
      }
      if (expression.operator === "!==" || expression.operator === "!=") {
        return this.runtime.newBoolean(leftFunc !== rightFunc);
      }
    }

    // function vs other type
    if (
      (left.type === "function" && right.type !== "function") ||
      (left.type !== "function" && right.type === "function")
    ) {
      if (expression.operator === "===" || expression.operator === "!==") {
        const result = expression.operator === "===" ? false : true;
        return this.runtime.newBoolean(result);
      }
      if (expression.operator === "==" || expression.operator === "!=") {
        const result = expression.operator === "==" ? false : true;
        return this.runtime.newBoolean(result);
      }
    }

    // object equality
    if (left.type === "object" && right.type === "object") {
      const leftObj = left as JSObject;
      const rightObj = right as JSObject;

      if (expression.operator === "===" || expression.operator === "==") {
        return this.runtime.newBoolean(leftObj === rightObj);
      }
      if (expression.operator === "!==" || expression.operator === "!=") {
        return this.runtime.newBoolean(leftObj !== rightObj);
      }
    }

    // insane things happen here lol

    throw todo(
      "binary operation with " + left.type + " and " + right.type,
      expression
    );
  }

  applyAssignmentOperator(
    operator: AssignmentOperator,
    current: JSObject,
    value: JSObject,
    expression: Extract<Expression, { type: "assignment" }>
  ): JSObject {
    switch (operator) {
      case "=":
        return value;
      case "+=": {
        if (current.type === "string" || value.type === "string") {
          return this.runtime.newString(current.toString() + value.toString());
        }
        if (current.type === "number" && value.type === "number") {
          return this.runtime.newNumber(
            (current as JSNumber).value + (value as JSNumber).value
          );
        }
        break;
      }
      case "-=":
        if (current.type === "number" && value.type === "number") {
          return this.runtime.newNumber(
            (current as JSNumber).value - (value as JSNumber).value
          );
        }
        break;
      case "*=":
        if (current.type === "number" && value.type === "number") {
          return this.runtime.newNumber(
            (current as JSNumber).value * (value as JSNumber).value
          );
        }
        break;
      case "/=":
        if (current.type === "number" && value.type === "number") {
          return this.runtime.newNumber(
            (current as JSNumber).value / (value as JSNumber).value
          );
        }
        break;
    }

    throw todo(
      `assignment operator ${operator} with ${current.type} and ${value.type}`,
      expression
    );
  }

  executeAssignmentExpression(
    expression: Extract<Expression, { type: "assignment" }>
  ) {
    const rightValue = this.executeExpression(expression.right);

    if (expression.left.type === "identifier") {
      if (expression.operator === "=") {
        this.runtime.setVariable(expression.left.value, rightValue);
        return rightValue;
      }

      const currentValue = this.runtime.lookupVariable(expression.left.value);
      const newValue = this.applyAssignmentOperator(
        expression.operator,
        currentValue,
        rightValue,
        expression
      );
      this.runtime.setVariable(expression.left.value, newValue);
      return newValue;
    }

    if (expression.left.type === "member") {
      const memberExpression = expression.left;
      const object = this.executeExpression(memberExpression.object);

      if (object.type === "undefined" || object.type === "null") {
        throw typeError("Cannot set properties of " + object.type, expression);
      }

      let propertyName: string;

      if (memberExpression.computed) {
        const computedProperty = this.executeExpression(
          memberExpression.property
        );
        propertyName = computedProperty.toString();
      } else {
        if (memberExpression.property.type !== "identifier") {
          throw referenceError(
            "Invalid left-hand side in assignment",
            expression
          );
        }

        propertyName = memberExpression.property.value;
      }

      if (expression.operator === "=") {
        this.runtime.setProperty(object, propertyName, rightValue);
        return rightValue;
      }

      const currentValue = this.runtime.getProperty(object, propertyName);
      const newValue = this.applyAssignmentOperator(
        expression.operator,
        currentValue,
        rightValue,
        expression
      );

      this.runtime.setProperty(object, propertyName, newValue);
      return newValue;
    }

    throw referenceError("Invalid left-hand side in assignment", expression);
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
    let argIndex = 0;
    for (let i = 0; i < fn.parameters.length; i++) {
      const parameter = fn.parameters[i];

      if (parameter.spread) {
        const restArgs: JSObject[] = [];
        while (argIndex < args.length) {
          restArgs.push(args[argIndex]);
          argIndex++;
        }

        const restArray = this.runtime.newArray(restArgs);
        this.runtime.declareVariable(parameter.name, restArray);
        continue;
      }

      let value: JSObject;
      if (argIndex < args.length) {
        value = args[argIndex];
      } else {
        value = this.runtime.newUndefined();
      }

      if (
        parameter.defaultValue !== undefined &&
        value.type === "undefined"
      ) {
        value = this.executeExpression(parameter.defaultValue);
      }

      this.runtime.declareVariable(parameter.name, value);
      argIndex++;
    }

    try {
      const result = this.executeStatement(fn.body);
      this.runtime.popScope();

      if (fn.body.type === "expression") {
        return result;
      }

      return this.runtime.newUndefined();
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
      case "template_literal": {
        const pieces: string[] = [];
        const { quasis, expressions } = expression;

        for (let i = 0; i < quasis.length; i++) {
          pieces.push(quasis[i]);

          if (i < expressions.length) {
            const value = this.executeExpression(expressions[i]);
            pieces.push(value.toString());
          }
        }

        return this.runtime.newString(pieces.join(""));
      }
      case "regex": {
        return this.runtime.newRegExp(expression.pattern, expression.flags);
      }
      case "boolean":
        return this.runtime.newBoolean(expression.value);
      case "null":
        return this.runtime.newNull();
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

      case "comma": {
        let result: JSObject = this.runtime.newUndefined();
        for (const expr of expression.expressions) {
          result = this.executeExpression(expr);
        }
        return result;
      }

      case "conditional": {
        const condition = this.executeExpression(expression.test);
        if (condition.isTruthy()) {
          return this.executeExpression(expression.consequent);
        }
        return this.executeExpression(expression.alternate);
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
        return this.executeAssignmentExpression(expression);
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

      case "unary": {
        if (expression.operator === "!") {
          const operand = this.executeExpression(expression.expression);
          return this.runtime.newBoolean(!operand.isTruthy());
        }

        if (expression.operator === "typeof") {
          if (expression.expression.type === "identifier") {
            const binding = this.runtime.lookupBinding(
              expression.expression.value
            );

            if (binding) {
              if (binding.initialized) {
                return this.runtime.newString(binding.value.typeof());
              } else {
                return this.runtime.newString("undefined");
              }
            }
          }

          const operand = this.executeExpression(expression.expression);

          return this.runtime.newString(operand.typeof());
        }

        break;
      }

      case "super_call": {
        // current constructor context
        const thisVal = this.runtime.lookupVariable("this");
        if (thisVal.type === "undefined") {
          throw referenceError("'super' keyword unexpected here", expression);
        }

        // find the current constructor
        const currentConstructor = this.runtime.getProperty(
          thisVal,
          "constructor"
        ) as JSFunction;
        if (currentConstructor.type !== "function") {
          throw referenceError(
            "Cannot find current constructor for super call",
            expression
          );
        }

        // get the parent constructor
        const currentPrototype = currentConstructor.properties[
          "prototype"
        ] as JSObject;
        const parentPrototype = currentPrototype.prototype;
        if (!parentPrototype) {
          throw referenceError(
            "Class does not extend another class",
            expression
          );
        }

        const parentConstructor = this.runtime.getProperty(
          parentPrototype,
          "constructor"
        ) as JSFunction;
        if (parentConstructor.type !== "function") {
          throw referenceError("Cannot find parent constructor", expression);
        }

        const args: JSObject[] = [];
        for (const a of expression.arguments) {
          args.push(this.executeExpression(a));
        }

        return this.call(thisVal, parentConstructor, args);
      }

      case "super_member": {
        // current constructor context
        const thisVal = this.runtime.lookupVariable("this");
        if (thisVal.type === "undefined") {
          throw referenceError("'super' keyword unexpected here", expression);
        }

        // find the current constructor
        const currentConstructor = this.runtime.getProperty(
          thisVal,
          "constructor"
        ) as JSFunction;
        if (currentConstructor.type !== "function") {
          throw referenceError(
            "Cannot find current constructor for super member access",
            expression
          );
        }

        // get the parent prototype
        const currentPrototype = currentConstructor.properties[
          "prototype"
        ] as JSObject;
        const parentPrototype = currentPrototype.prototype;
        if (!parentPrototype) {
          throw referenceError(
            "Class does not extend another class",
            expression
          );
        }

        return this.runtime.getProperty(parentPrototype, expression.property);
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
      case "block": {
        this.runtime.pushScope();
        try {
          return this.executeStatements(statement.body);
        } finally {
          this.runtime.popScope();
        }
      }
      case "expression":
        return this.executeExpression(statement.expression);
      case "return": {
        let value: JSObject = this.runtime.newUndefined();
        if (statement.expression) {
          value = this.executeExpression(statement.expression);
        }

        throw { type: "__RETURN_VALUE__", value };
      }
      case "variable_declaration": {
        const kind = statement.varType;
        let lastValue: JSObject = this.runtime.newUndefined();

        if (kind === "var") {
          for (const decl of statement.declarations) {
            let value = this.runtime.newUndefined();
            if (decl.value !== undefined) {
              value = this.executeExpression(decl.value);
            }
            this.runtime.declareVariable(decl.identifier, value, "var");
            lastValue = value;
          }
          return lastValue;
        }

        if (kind === "let" || kind === "const") {
          for (const decl of statement.declarations) {
            this.runtime.declareVariable(
              decl.identifier,
              this.runtime.newUndefined(),
              kind
            );

            const scope = this.runtime.scopes[this.runtime.scope];
            const binding = scope[decl.identifier];
            if (!binding) {
              throw referenceError(
                `binding for '${decl.identifier}' not found in current scope`,
                statement
              );
            }

            if (decl.value !== undefined) {
              binding.value = this.executeExpression(decl.value);
            }

            binding.initialized = true;
            lastValue = binding.value;
          }

          return lastValue;
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

        let test = statement.test
          ? this.executeExpression(statement.test)
          : this.runtime.newBoolean(true);

        while (test && test.isTruthy()) {
          try {
            this.executeStatement(statement.body);
          } catch (e) {
            if (e.type === "__BREAK__") {
              break;
            }
            throw e;
          }

          if (statement.update) {
            this.executeExpression(statement.update);
          }

          test = statement.test
            ? this.executeExpression(statement.test)
            : this.runtime.newBoolean(true);
        }

        return this.runtime.newUndefined();
      }

      case "while": {
        let condition = this.executeExpression(statement.condition);
        while (condition.isTruthy()) {
          try {
            this.executeStatement(statement.body);
          } catch (e) {
            if (e.type === "__BREAK__") {
              break;
            }
            throw e;
          }

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
              this.executeStatements(c.body);
              continue;
            }

            const caseValue = this.executeExpression(c.test);

            // bit of a hack, fix this
            if (caseValue.toString() === condition.toString()) {
              foundCase = true;
              this.executeStatements(c.body);
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

      case "class_declaration": {
        const constructorMethod = statement.methods.find(
          (m) => m.name === "constructor"
        );

        const ctor = constructorMethod
          ? this.runtime.newFunction(
              constructorMethod.parameters,
              constructorMethod.body
            )
          : this.runtime.newFunction([], {
              type: "empty",
              location: statement.location,
            });

        // extends
        if (statement.superClass) {
          const parentClass = this.runtime.lookupVariable(statement.superClass);
          if (parentClass.type !== "function") {
            throw typeError(
              `Class extends value ${statement.superClass} is not a constructor or null`,
              statement
            );
          }

          const parentPrototype = parentClass.properties[
            "prototype"
          ] as JSObject;

          const childPrototype = this.runtime.newObject();
          childPrototype.prototype = parentPrototype;
          childPrototype.properties["constructor"] = ctor;
          ctor.properties["prototype"] = childPrototype;
        }

        for (const prop of statement.properties) {
          const value = prop.value
            ? this.executeExpression(prop.value)
            : this.runtime.newUndefined();

          if (prop.static) {
            ctor.properties[prop.name] = value;
          } else {
            const prototypeObj = ctor.properties["prototype"] as JSObject;
            prototypeObj.properties[prop.name] = value;
          }
        }

        for (const meth of statement.methods) {
          if (meth.name === "constructor") continue;

          const func = this.runtime.newFunction(meth.parameters, meth.body);

          if (meth.static) {
            ctor.properties[meth.name] = func;
          } else {
            const prototypeObj = ctor.properties["prototype"] as JSObject;
            prototypeObj.properties[meth.name] = func;
          }
        }

        this.runtime.declareVariable(statement.identifier, ctor);

        break;
      }

      case "import_declaration":
      case "export_declaration": {
        throw todo("ES module support not implemented", statement);
      }

      default:
        assertNotReached(statement);
    }
  }

  executeStatements(statements: Statement[]): JSObject {
    // hoist function declarations
    for (const statement of statements) {
      if (statement.type !== "function_declaration") continue;

      const func = this.runtime.newFunction(
        statement.parameters,
        statement.body
      );
      this.runtime.declareVariable(statement.identifier, func, "var");
    }

    // hoist "var" declarations
    const currentScope = this.runtime.scopes[this.runtime.scope];
    for (const statement of statements) {
      if (statement.type !== "variable_declaration") continue;
      if (statement.varType !== "var") continue;

      for (const decl of statement.declarations) {
        if (decl.identifier in currentScope) continue;
        this.runtime.declareVariable(
          decl.identifier,
          this.runtime.newUndefined(),
          "var"
        );
      }
    }

    let lastValue = this.runtime.newUndefined();

    // run other statements
    for (const statement of statements) {
      if (statement.type === "function_declaration") continue;
      lastValue = this.executeStatement(statement);
    }

    return lastValue;
  }

  run(program: Program): JSObject {
    return this.executeStatements(program.body);
  }
}
