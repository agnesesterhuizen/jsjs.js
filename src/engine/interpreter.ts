import {
  AssignmentOperator,
  ClassMethodDeclaration,
  ClassPropertyDeclaration,
  Expression,
  Operator,
  Program,
  Statement,
  Location,
  Pattern,
} from "../parser/ast.ts";
import {
  JSBoolean,
  JSFunction,
  JSNumber,
  JSString,
  JSObject,
  JSSymbol,
  JSArray,
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

export type NodeWithLocation = { location: Location };

export const todo = (
  feature: string,
  { location }: NodeWithLocation
): InterpreterError => ({
  type: "not_yet_implemented",
  message: feature,
  location: `at ${location.file}:${location.line}:${location.column}`,
});
export const referenceError = (
  message: string,
  { location }: NodeWithLocation
): InterpreterError => ({
  type: "reference_error",
  message,
  location: `at ${location.file}:${location.line}:${location.column}`,
});
export const typeError = (
  message: string,
  { location }: NodeWithLocation
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

  declarePatternBindings(pattern: Pattern, kind: "let" | "const") {
    switch (pattern.type) {
      case "pattern_identifier": {
        this.runtime.declareVariable(
          pattern.name,
          this.runtime.newUndefined(),
          kind
        );
        return;
      }
      case "pattern_object": {
        for (const property of pattern.properties) {
          if (property.type === "pattern_property") {
            this.declarePatternBindings(property.value, kind);
          } else if (property.type === "pattern_rest") {
            this.declarePatternBindings(property.argument, kind);
          }
        }
        return;
      }
      case "pattern_member":
        throw referenceError(
          "Invalid destructuring target in declaration",
          pattern
        );
      default:
        return;
    }
  }

  assignPattern(
    pattern: Pattern,
    value: JSObject,
    options: {
      kind: "var" | "let" | "const" | "assignment";
      declaration: boolean;
    }
  ): JSObject {
    switch (pattern.type) {
      case "pattern_identifier":
        return this.assignPatternIdentifier(pattern, value, options);
      case "pattern_member":
        if (options.declaration) {
          throw referenceError(
            "Invalid destructuring target in declaration",
            pattern
          );
        }
        return this.assignPatternMember(pattern, value);
      case "pattern_object":
        return this.assignObjectPattern(pattern, value, options);
      default:
        return value;
    }
  }

  assignPatternIdentifier(
    pattern: Extract<Pattern, { type: "pattern_identifier" }>,
    value: JSObject,
    options: {
      kind: "var" | "let" | "const" | "assignment";
      declaration: boolean;
    }
  ): JSObject {
    if (options.kind === "var") {
      this.runtime.declareVariable(pattern.name, value, "var");
      return value;
    }

    if (options.kind === "let" || options.kind === "const") {
      const scope = this.runtime.scopes[this.runtime.scope];
      const binding = scope[pattern.name];
      if (!binding) {
        throw referenceError(
          `binding for '${pattern.name}' not found in current scope`,
          pattern
        );
      }
      binding.value = value;
      binding.initialized = true;
      return value;
    }

    this.runtime.setVariable(pattern.name, value);
    return value;
  }

  assignPatternMember(
    pattern: Extract<Pattern, { type: "pattern_member" }>,
    value: JSObject
  ): JSObject {
    const object = this.executeExpression(pattern.object);

    if (object.type === "undefined" || object.type === "null") {
      throw typeError(`Cannot set properties of ${object.type}`, pattern);
    }

    let propertyKey: string | JSSymbol;

    if (pattern.computed) {
      const computedProperty = this.executeExpression(pattern.property);
      if (computedProperty.type === "symbol") {
        propertyKey = computedProperty as JSSymbol;
      } else {
        propertyKey = computedProperty.toString();
      }
    } else {
      if (pattern.property.type !== "identifier") {
        throw referenceError("Invalid property in assignment target", pattern);
      }
      propertyKey = pattern.property.value;
    }

    this.runtime.setProperty(object, propertyKey, value);
    return value;
  }

  assignObjectPattern(
    pattern: Extract<Pattern, { type: "pattern_object" }>,
    value: JSObject,
    options: {
      kind: "var" | "let" | "const" | "assignment";
      declaration: boolean;
    }
  ): JSObject {
    if (value.type === "undefined" || value.type === "null") {
      throw typeError(`Cannot destructure ${value.type} value`, pattern);
    }

    const source = value as JSObject;
    const excludedKeys = new Set<string>();
    let lastValue: JSObject = this.runtime.newUndefined();

    for (const property of pattern.properties) {
      if (property.type === "pattern_property") {
        excludedKeys.add(property.key);
        let propertyValue = this.runtime.getProperty(source, property.key);
        if (propertyValue.type === "undefined" && property.defaultValue) {
          propertyValue = this.executeExpression(property.defaultValue);
        }
        lastValue = this.assignPattern(property.value, propertyValue, options);
      } else if (property.type === "pattern_rest") {
        const restValue = this.createObjectRest(source, excludedKeys);
        lastValue = this.assignPattern(property.argument, restValue, options);
      }
    }

    return lastValue;
  }

  createObjectRest(source: JSObject, excludedKeys: Set<string>): JSObject {
    const rest = this.runtime.newObject();

    if (source.type === "array") {
      const arraySource = source as JSArray;
      for (let i = 0; i < arraySource.elements.length; i++) {
        const element = arraySource.elements[i];
        if (element === undefined) continue;
        const key = String(i);
        if (excludedKeys.has(key)) continue;
        rest.properties[key] = element;
      }
    }

    for (const [key, val] of Object.entries(source.properties)) {
      if (excludedKeys.has(key)) continue;
      rest.properties[key] = val;
    }

    return rest;
  }

  createClassConstructor(classNode: {
    identifier?: string;
    properties: ClassPropertyDeclaration[];
    methods: ClassMethodDeclaration[];
    superClass?: string;
    location: Location;
  }): JSFunction {
    const constructorMethod = classNode.methods.find(
      (m) => m.name === "constructor"
    );

    const ctor = constructorMethod
      ? this.runtime.newFunction(
          constructorMethod.parameters,
          constructorMethod.body
        )
      : this.runtime.newFunction([], {
          type: "empty",
          location: classNode.location,
        });

    if (classNode.identifier) {
      ctor.properties["name"] = this.runtime.newString(classNode.identifier);
    }

    if (classNode.superClass) {
      const parentClass = this.runtime.lookupVariable(classNode.superClass);
      if (parentClass.type !== "function") {
        throw typeError(
          `Class extends value ${classNode.superClass} is not a constructor or null`,
          classNode
        );
      }

      const parentPrototype = parentClass.properties["prototype"] as JSObject;

      const childPrototype = this.runtime.newObject();
      childPrototype.prototype = parentPrototype;
      childPrototype.properties["constructor"] = ctor;
      ctor.properties["prototype"] = childPrototype;
    }

    for (const prop of classNode.properties) {
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

    for (const meth of classNode.methods) {
      if (meth.name === "constructor") continue;

      const func = this.runtime.newFunction(meth.parameters, meth.body);

      if (meth.static) {
        ctor.properties[meth.name] = func;
      } else {
        const prototypeObj = ctor.properties["prototype"] as JSObject;
        prototypeObj.properties[meth.name] = func;
      }
    }

    return ctor;
  }

  collectPatternIdentifiers(pattern: Pattern, result: Set<string>) {
    switch (pattern.type) {
      case "pattern_identifier":
        result.add(pattern.name);
        return;
      case "pattern_object":
        for (const property of pattern.properties) {
          if (property.type === "pattern_property") {
            this.collectPatternIdentifiers(property.value, result);
          } else if (property.type === "pattern_rest") {
            this.collectPatternIdentifiers(property.argument, result);
          }
        }
        return;
      case "pattern_member":
        return;
      default:
        return;
    }
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

      case "??":
      case "in":
        throw new Error("should never happen");

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

      case "??":
      case "in":
        throw new Error("should never happen");

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

    if (expression.operator === "??") {
      if (left.type === "null" || left.type === "undefined") {
        return this.executeExpression(expression.right);
      } else {
        return left;
      }
    }

    if (expression.operator === "in") {
      const right = this.executeExpression(expression.right);
      if (right.type !== "object" && right.type !== "array") {
        throw typeError("right operand of 'in' must be an object", expression);
      }

      const key = left.type === "symbol" ? (left as JSSymbol) : left.toString();

      const value = this.runtime.getProperty(right, key);

      return this.runtime.newBoolean(value.type !== "undefined");
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

    if (left.type === "symbol" && right.type === "symbol") {
      const ls = left as JSSymbol;
      const rs = right as JSSymbol;

      switch (expression.operator) {
        case "===":
        case "==":
          return this.runtime.newBoolean(ls === rs);
        case "!==":
        case "!=":
          return this.runtime.newBoolean(ls !== rs);
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

    if (expression.operator === "=") {
      this.assignPattern(expression.left, rightValue, {
        kind: "assignment",
        declaration: false,
      });
      return rightValue;
    }

    if (expression.left.type === "pattern_identifier") {
      const currentValue = this.runtime.lookupVariable(expression.left.name);
      const newValue = this.applyAssignmentOperator(
        expression.operator,
        currentValue,
        rightValue,
        expression
      );
      this.runtime.setVariable(expression.left.name, newValue);
      return newValue;
    }

    if (expression.left.type === "pattern_member") {
      const object = this.executeExpression(expression.left.object);

      if (object.type === "undefined" || object.type === "null") {
        throw typeError("Cannot set properties of " + object.type, expression);
      }

      let propertyKey: string | JSSymbol;

      if (expression.left.computed) {
        const computedProperty = this.executeExpression(
          expression.left.property
        );
        if (computedProperty.type === "symbol") {
          propertyKey = computedProperty as JSSymbol;
        } else {
          propertyKey = computedProperty.toString();
        }
      } else {
        if (expression.left.property.type !== "identifier") {
          throw referenceError(
            "Invalid left-hand side in assignment",
            expression
          );
        }

        propertyKey = expression.left.property.value;
      }

      const currentValue = this.runtime.getProperty(object, propertyKey);
      const newValue = this.applyAssignmentOperator(
        expression.operator,
        currentValue,
        rightValue,
        expression
      );

      this.runtime.setProperty(object, propertyKey, newValue);
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
        this.assignPattern(parameter.pattern, restArray, {
          kind: "var",
          declaration: true,
        });
        continue;
      }

      let value: JSObject;
      if (argIndex < args.length) {
        value = args[argIndex];
      } else {
        value = this.runtime.newUndefined();
      }

      if (parameter.defaultValue !== undefined && value.type === "undefined") {
        value = this.executeExpression(parameter.defaultValue);
      }

      this.assignPattern(parameter.pattern, value, {
        kind: "var",
        declaration: true,
      });
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

      if (errorOrReturnValue.type !== "__INTERNAL_RETURN_VALUE__") {
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
        const calleeIsOptional =
          expression.func.type === "member" && expression.func.optional;
        const fnVal = this.executeExpression(expression.func);

        if (calleeIsOptional) {
          if (fnVal.type === "undefined" || fnVal.type === "null") {
            return this.runtime.newUndefined();
          }
        }

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

        if (
          expression.optional &&
          (object.type === "undefined" || object.type === "null")
        ) {
          return this.runtime.newUndefined();
        }

        if (expression.computed) {
          const propertyValue = this.executeExpression(expression.property);
          if (propertyValue.type === "symbol") {
            return this.runtime.getProperty(object, propertyValue as JSSymbol);
          }

          return this.runtime.getProperty(object, propertyValue.toString());
        }

        if (expression.property.type !== "identifier") {
          throw todo(
            "executeExpression: member expression with computed properties",
            expression
          );
        }

        return this.runtime.getProperty(object, expression.property.value);
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

      case "class_expression": {
        return this.createClassConstructor(expression);
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
                return this.runtime.newString(binding.value.typeOf());
              } else {
                return this.runtime.newString("undefined");
              }
            }
          }

          const operand = this.executeExpression(expression.expression);

          return this.runtime.newString(operand.typeOf());
        }

        if (expression.operator === "void") {
          // evaluate the expression, return undefined
          this.executeExpression(expression.expression);
          return this.runtime.newUndefined();
        }

        if (expression.operator === "+") {
          const operand = this.executeExpression(expression.expression);
          const numberVal = this.runtime.toNumber(operand, expression);
          return this.runtime.newNumber(+numberVal.value);
        }

        if (expression.operator === "-") {
          const operand = this.executeExpression(expression.expression);
          const numberVal = this.runtime.toNumber(operand, expression);
          return this.runtime.newNumber(-numberVal.value);
        }

        throw todo(
          `unary expression for operator ${expression.operator}`,
          expression
        );
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

        throw { type: "__INTERNAL_RETURN_VALUE__", value };
      }
      case "variable_declaration": {
        const kind = statement.varType;
        let lastValue: JSObject = this.runtime.newUndefined();
        if (kind === "let" || kind === "const") {
          for (const decl of statement.declarations) {
            this.declarePatternBindings(decl.id, kind);
          }
        }

        for (const decl of statement.declarations) {
          const shouldAssign =
            decl.value !== undefined || decl.id.type === "pattern_identifier";

          if (!shouldAssign) {
            continue;
          }

          let initValue: JSObject = this.runtime.newUndefined();

          if (decl.value !== undefined) {
            initValue = this.executeExpression(decl.value);
          }

          lastValue = this.assignPattern(decl.id, initValue, {
            kind,
            declaration: true,
          });
        }

        return lastValue;
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
            if (e.type === "__INTERNAL_BREAK__") {
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

      case "for_in": {
        const rightValue = this.executeExpression(statement.right);

        if (rightValue.type === "undefined" || rightValue.type === "null") {
          throw typeError(`Cannot iterate over ${rightValue.type}`, statement);
        }

        const iterableObject = rightValue as JSObject;
        const keys = this.runtime.enumerateObjectKeys(iterableObject);

        let assign: (value: JSObject) => void;

        if (statement.left.type === "variable_declaration") {
          const declaration = statement.left;
          const declarator = declaration.declarations[0];

          this.executeStatement(declaration);

          assign = (value: JSObject) => {
            this.assignPattern(declarator.id, value, {
              kind: declaration.varType,
              declaration: true,
            });
          };
        } else {
          const targetExpression = statement.left as Expression;

          assign = (value: JSObject) => {
            if (targetExpression.type === "identifier") {
              this.runtime.setVariable(targetExpression.value, value);
              return;
            }

            if (targetExpression.type === "member") {
              const object = this.executeExpression(targetExpression.object);

              if (object.type === "undefined" || object.type === "null") {
                throw typeError(
                  `Cannot set properties of ${object.type}`,
                  targetExpression
                );
              }

              let propertyKey: string | JSSymbol;

              if (targetExpression.computed) {
                const propertyValue = this.executeExpression(
                  targetExpression.property
                );

                if (propertyValue.type === "symbol") {
                  propertyKey = propertyValue as JSSymbol;
                } else {
                  propertyKey = propertyValue.toString();
                }
              } else {
                if (targetExpression.property.type !== "identifier") {
                  throw referenceError(
                    "Invalid left-hand side in assignment",
                    targetExpression
                  );
                }

                propertyKey = targetExpression.property.value;
              }

              this.runtime.setProperty(object, propertyKey, value);
              return;
            }

            throw referenceError(
              "Invalid left-hand side in for-in",
              targetExpression
            );
          };
        }

        for (const key of keys) {
          const keyValue = this.runtime.newString(key);
          assign(keyValue);

          try {
            this.executeStatement(statement.body);
          } catch (e) {
            if (e.type === "__INTERNAL_BREAK__") {
              break;
            }
            throw e;
          }
        }

        return this.runtime.newUndefined();
      }

      case "for_of": {
        const iterable = this.executeExpression(statement.right);

        if (iterable.type === "undefined" || iterable.type === "null") {
          throw typeError(`Cannot iterate over ${iterable.type}`, statement);
        }

        const iteratorSymbol = this.runtime.getWellKnownSymbol("iterator");
        const iteratorMethod = this.runtime.getProperty(
          iterable,
          iteratorSymbol
        );

        if (iteratorMethod.type !== "function") {
          throw typeError("Object is not iterable", statement);
        }

        const iterator = this.call(iterable, iteratorMethod as JSFunction, []);

        const nextMethod = this.runtime.getProperty(iterator, "next");
        if (nextMethod.type !== "function") {
          throw typeError("Iterator must have a next method", statement);
        }

        let assign: (value: JSObject) => void;

        if (statement.left.type === "variable_declaration") {
          const declaration = statement.left;
          const declarator = declaration.declarations[0];

          this.executeStatement(declaration);

          assign = (value: JSObject) => {
            this.assignPattern(declarator.id, value, {
              kind: declaration.varType,
              declaration: true,
            });
          };
        } else {
          const targetExpression = statement.left as Expression;

          assign = (value: JSObject) => {
            if (targetExpression.type === "identifier") {
              this.runtime.setVariable(targetExpression.value, value);
              return;
            }

            if (targetExpression.type === "member") {
              const object = this.executeExpression(targetExpression.object);

              if (object.type === "undefined" || object.type === "null") {
                throw typeError(
                  `Cannot set properties of ${object.type}`,
                  targetExpression
                );
              }

              let propertyKey: string | JSSymbol;

              if (targetExpression.computed) {
                const propertyValue = this.executeExpression(
                  targetExpression.property
                );

                if (propertyValue.type === "symbol") {
                  propertyKey = propertyValue as JSSymbol;
                } else {
                  propertyKey = propertyValue.toString();
                }
              } else {
                if (targetExpression.property.type !== "identifier") {
                  throw referenceError(
                    "Invalid left-hand side in assignment",
                    targetExpression
                  );
                }

                propertyKey = targetExpression.property.value;
              }

              this.runtime.setProperty(object, propertyKey, value);
              return;
            }

            throw referenceError(
              "Invalid left-hand side in for-of",
              targetExpression
            );
          };
        }

        while (true) {
          const result = this.call(iterator, nextMethod as JSFunction, []);

          const doneValue = this.runtime.getProperty(result, "done");
          if (doneValue.isTruthy()) {
            break;
          }

          const value = this.runtime.getProperty(result, "value");
          assign(value);

          try {
            this.executeStatement(statement.body);
          } catch (e) {
            if (e.type === "__INTERNAL_BREAK__") {
              break;
            }
            throw e;
          }
        }

        return this.runtime.newUndefined();
      }

      case "while": {
        let condition = this.executeExpression(statement.condition);
        while (condition.isTruthy()) {
          try {
            this.executeStatement(statement.body);
          } catch (e) {
            if (e.type === "__INTERNAL_BREAK__") {
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
          if (e.type === "__INTERNAL_BREAK__") {
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
        throw { type: "__INTERNAL_BREAK__" };
      }

      case "class_declaration": {
        const ctor = this.createClassConstructor(statement);
        this.runtime.declareVariable(statement.identifier, ctor);

        break;
      }

      case "import_declaration":
      case "export_declaration": {
        throw todo("ES module support not implemented", statement);
      }

      case "try": {
        try {
          this.executeStatement(statement.block);
        } catch (e) {
          if (e.type !== "__INTERNAL_THROW__") {
            throw e;
          }

          if (!statement.handler) {
            throw e;
          }

          this.runtime.pushScope();

          if (statement.handler.param) {
            const value = e["__INTERNAL_THROW_VALUE__"] as JSObject;
            this.runtime.declareVariable(statement.handler.param, value);
          }

          this.executeStatement(statement.handler.body);

          this.runtime.popScope();
        } finally {
          if (statement.finalizer) {
            this.executeStatement(statement.finalizer);
          }
        }

        break;
      }

      case "throw": {
        const value = this.executeExpression(statement.expression);

        throw {
          type: "__INTERNAL_THROW__",
          __INTERNAL_THROW_VALUE__: value,
        };
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
        const identifiers = new Set<string>();
        this.collectPatternIdentifiers(decl.id, identifiers);
        for (const name of identifiers) {
          if (name in currentScope) continue;
          this.runtime.declareVariable(
            name,
            this.runtime.newUndefined(),
            "var"
          );
        }
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
