var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../../Library/Caches/deno/npm/registry.npmjs.org/moo/0.5.2/moo.js
var require_moo = __commonJS({
  "../../../Library/Caches/deno/npm/registry.npmjs.org/moo/0.5.2/moo.js"(exports, module) {
    (function(root, factory) {
      if (typeof define === "function" && define.amd) {
        define([], factory);
      } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
      } else {
        root.moo = factory();
      }
    })(exports, function() {
      "use strict";
      var hasOwnProperty = Object.prototype.hasOwnProperty;
      var toString = Object.prototype.toString;
      var hasSticky = typeof new RegExp().sticky === "boolean";
      function isRegExp(o) {
        return o && toString.call(o) === "[object RegExp]";
      }
      function isObject(o) {
        return o && typeof o === "object" && !isRegExp(o) && !Array.isArray(o);
      }
      function reEscape(s) {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      }
      function reGroups(s) {
        var re = new RegExp("|" + s);
        return re.exec("").length - 1;
      }
      function reCapture(s) {
        return "(" + s + ")";
      }
      function reUnion(regexps) {
        if (!regexps.length) return "(?!)";
        var source = regexps.map(function(s) {
          return "(?:" + s + ")";
        }).join("|");
        return "(?:" + source + ")";
      }
      function regexpOrLiteral(obj) {
        if (typeof obj === "string") {
          return "(?:" + reEscape(obj) + ")";
        } else if (isRegExp(obj)) {
          if (obj.ignoreCase) throw new Error("RegExp /i flag not allowed");
          if (obj.global) throw new Error("RegExp /g flag is implied");
          if (obj.sticky) throw new Error("RegExp /y flag is implied");
          if (obj.multiline) throw new Error("RegExp /m flag is implied");
          return obj.source;
        } else {
          throw new Error("Not a pattern: " + obj);
        }
      }
      function pad(s, length) {
        if (s.length > length) {
          return s;
        }
        return Array(length - s.length + 1).join(" ") + s;
      }
      function lastNLines(string, numLines) {
        var position = string.length;
        var lineBreaks = 0;
        while (true) {
          var idx = string.lastIndexOf("\n", position - 1);
          if (idx === -1) {
            break;
          } else {
            lineBreaks++;
          }
          position = idx;
          if (lineBreaks === numLines) {
            break;
          }
          if (position === 0) {
            break;
          }
        }
        var startPosition = lineBreaks < numLines ? 0 : position + 1;
        return string.substring(startPosition).split("\n");
      }
      function objectToRules(object) {
        var keys = Object.getOwnPropertyNames(object);
        var result = [];
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          var thing = object[key];
          var rules2 = [].concat(thing);
          if (key === "include") {
            for (var j = 0; j < rules2.length; j++) {
              result.push({
                include: rules2[j]
              });
            }
            continue;
          }
          var match = [];
          rules2.forEach(function(rule) {
            if (isObject(rule)) {
              if (match.length) result.push(ruleOptions(key, match));
              result.push(ruleOptions(key, rule));
              match = [];
            } else {
              match.push(rule);
            }
          });
          if (match.length) result.push(ruleOptions(key, match));
        }
        return result;
      }
      function arrayToRules(array) {
        var result = [];
        for (var i = 0; i < array.length; i++) {
          var obj = array[i];
          if (obj.include) {
            var include = [].concat(obj.include);
            for (var j = 0; j < include.length; j++) {
              result.push({
                include: include[j]
              });
            }
            continue;
          }
          if (!obj.type) {
            throw new Error("Rule has no type: " + JSON.stringify(obj));
          }
          result.push(ruleOptions(obj.type, obj));
        }
        return result;
      }
      function ruleOptions(type, obj) {
        if (!isObject(obj)) {
          obj = {
            match: obj
          };
        }
        if (obj.include) {
          throw new Error("Matching rules cannot also include states");
        }
        var options = {
          defaultType: type,
          lineBreaks: !!obj.error || !!obj.fallback,
          pop: false,
          next: null,
          push: null,
          error: false,
          fallback: false,
          value: null,
          type: null,
          shouldThrow: false
        };
        for (var key in obj) {
          if (hasOwnProperty.call(obj, key)) {
            options[key] = obj[key];
          }
        }
        if (typeof options.type === "string" && type !== options.type) {
          throw new Error("Type transform cannot be a string (type '" + options.type + "' for token '" + type + "')");
        }
        var match = options.match;
        options.match = Array.isArray(match) ? match : match ? [
          match
        ] : [];
        options.match.sort(function(a, b) {
          return isRegExp(a) && isRegExp(b) ? 0 : isRegExp(b) ? -1 : isRegExp(a) ? 1 : b.length - a.length;
        });
        return options;
      }
      function toRules(spec) {
        return Array.isArray(spec) ? arrayToRules(spec) : objectToRules(spec);
      }
      var defaultErrorRule = ruleOptions("error", {
        lineBreaks: true,
        shouldThrow: true
      });
      function compileRules(rules2, hasStates) {
        var errorRule = null;
        var fast = /* @__PURE__ */ Object.create(null);
        var fastAllowed = true;
        var unicodeFlag = null;
        var groups = [];
        var parts = [];
        for (var i = 0; i < rules2.length; i++) {
          if (rules2[i].fallback) {
            fastAllowed = false;
          }
        }
        for (var i = 0; i < rules2.length; i++) {
          var options = rules2[i];
          if (options.include) {
            throw new Error("Inheritance is not allowed in stateless lexers");
          }
          if (options.error || options.fallback) {
            if (errorRule) {
              if (!options.fallback === !errorRule.fallback) {
                throw new Error("Multiple " + (options.fallback ? "fallback" : "error") + " rules not allowed (for token '" + options.defaultType + "')");
              } else {
                throw new Error("fallback and error are mutually exclusive (for token '" + options.defaultType + "')");
              }
            }
            errorRule = options;
          }
          var match = options.match.slice();
          if (fastAllowed) {
            while (match.length && typeof match[0] === "string" && match[0].length === 1) {
              var word = match.shift();
              fast[word.charCodeAt(0)] = options;
            }
          }
          if (options.pop || options.push || options.next) {
            if (!hasStates) {
              throw new Error("State-switching options are not allowed in stateless lexers (for token '" + options.defaultType + "')");
            }
            if (options.fallback) {
              throw new Error("State-switching options are not allowed on fallback tokens (for token '" + options.defaultType + "')");
            }
          }
          if (match.length === 0) {
            continue;
          }
          fastAllowed = false;
          groups.push(options);
          for (var j = 0; j < match.length; j++) {
            var obj = match[j];
            if (!isRegExp(obj)) {
              continue;
            }
            if (unicodeFlag === null) {
              unicodeFlag = obj.unicode;
            } else if (unicodeFlag !== obj.unicode && options.fallback === false) {
              throw new Error("If one rule is /u then all must be");
            }
          }
          var pat = reUnion(match.map(regexpOrLiteral));
          var regexp = new RegExp(pat);
          if (regexp.test("")) {
            throw new Error("RegExp matches empty string: " + regexp);
          }
          var groupCount = reGroups(pat);
          if (groupCount > 0) {
            throw new Error("RegExp has capture groups: " + regexp + "\nUse (?: \u2026 ) instead");
          }
          if (!options.lineBreaks && regexp.test("\n")) {
            throw new Error("Rule should declare lineBreaks: " + regexp);
          }
          parts.push(reCapture(pat));
        }
        var fallbackRule = errorRule && errorRule.fallback;
        var flags = hasSticky && !fallbackRule ? "ym" : "gm";
        var suffix = hasSticky || fallbackRule ? "" : "|";
        if (unicodeFlag === true) flags += "u";
        var combined = new RegExp(reUnion(parts) + suffix, flags);
        return {
          regexp: combined,
          groups,
          fast,
          error: errorRule || defaultErrorRule
        };
      }
      function compile2(rules2) {
        var result = compileRules(toRules(rules2));
        return new Lexer2({
          start: result
        }, "start");
      }
      function checkStateGroup(g, name, map) {
        var state = g && (g.push || g.next);
        if (state && !map[state]) {
          throw new Error("Missing state '" + state + "' (in token '" + g.defaultType + "' of state '" + name + "')");
        }
        if (g && g.pop && +g.pop !== 1) {
          throw new Error("pop must be 1 (in token '" + g.defaultType + "' of state '" + name + "')");
        }
      }
      function compileStates(states, start) {
        var all = states.$all ? toRules(states.$all) : [];
        delete states.$all;
        var keys = Object.getOwnPropertyNames(states);
        if (!start) start = keys[0];
        var ruleMap = /* @__PURE__ */ Object.create(null);
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          ruleMap[key] = toRules(states[key]).concat(all);
        }
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          var rules2 = ruleMap[key];
          var included = /* @__PURE__ */ Object.create(null);
          for (var j = 0; j < rules2.length; j++) {
            var rule = rules2[j];
            if (!rule.include) continue;
            var splice = [
              j,
              1
            ];
            if (rule.include !== key && !included[rule.include]) {
              included[rule.include] = true;
              var newRules = ruleMap[rule.include];
              if (!newRules) {
                throw new Error("Cannot include nonexistent state '" + rule.include + "' (in state '" + key + "')");
              }
              for (var k = 0; k < newRules.length; k++) {
                var newRule = newRules[k];
                if (rules2.indexOf(newRule) !== -1) continue;
                splice.push(newRule);
              }
            }
            rules2.splice.apply(rules2, splice);
            j--;
          }
        }
        var map = /* @__PURE__ */ Object.create(null);
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          map[key] = compileRules(ruleMap[key], true);
        }
        for (var i = 0; i < keys.length; i++) {
          var name = keys[i];
          var state = map[name];
          var groups = state.groups;
          for (var j = 0; j < groups.length; j++) {
            checkStateGroup(groups[j], name, map);
          }
          var fastKeys = Object.getOwnPropertyNames(state.fast);
          for (var j = 0; j < fastKeys.length; j++) {
            checkStateGroup(state.fast[fastKeys[j]], name, map);
          }
        }
        return new Lexer2(map, start);
      }
      function keywordTransform(map) {
        var isMap = typeof Map !== "undefined";
        var reverseMap = isMap ? /* @__PURE__ */ new Map() : /* @__PURE__ */ Object.create(null);
        var types = Object.getOwnPropertyNames(map);
        for (var i = 0; i < types.length; i++) {
          var tokenType = types[i];
          var item = map[tokenType];
          var keywordList = Array.isArray(item) ? item : [
            item
          ];
          keywordList.forEach(function(keyword) {
            if (typeof keyword !== "string") {
              throw new Error("keyword must be string (in keyword '" + tokenType + "')");
            }
            if (isMap) {
              reverseMap.set(keyword, tokenType);
            } else {
              reverseMap[keyword] = tokenType;
            }
          });
        }
        return function(k) {
          return isMap ? reverseMap.get(k) : reverseMap[k];
        };
      }
      var Lexer2 = function(states, state) {
        this.startState = state;
        this.states = states;
        this.buffer = "";
        this.stack = [];
        this.reset();
      };
      Lexer2.prototype.reset = function(data, info) {
        this.buffer = data || "";
        this.index = 0;
        this.line = info ? info.line : 1;
        this.col = info ? info.col : 1;
        this.queuedToken = info ? info.queuedToken : null;
        this.queuedText = info ? info.queuedText : "";
        this.queuedThrow = info ? info.queuedThrow : null;
        this.setState(info ? info.state : this.startState);
        this.stack = info && info.stack ? info.stack.slice() : [];
        return this;
      };
      Lexer2.prototype.save = function() {
        return {
          line: this.line,
          col: this.col,
          state: this.state,
          stack: this.stack.slice(),
          queuedToken: this.queuedToken,
          queuedText: this.queuedText,
          queuedThrow: this.queuedThrow
        };
      };
      Lexer2.prototype.setState = function(state) {
        if (!state || this.state === state) return;
        this.state = state;
        var info = this.states[state];
        this.groups = info.groups;
        this.error = info.error;
        this.re = info.regexp;
        this.fast = info.fast;
      };
      Lexer2.prototype.popState = function() {
        this.setState(this.stack.pop());
      };
      Lexer2.prototype.pushState = function(state) {
        this.stack.push(this.state);
        this.setState(state);
      };
      var eat = hasSticky ? function(re, buffer) {
        return re.exec(buffer);
      } : function(re, buffer) {
        var match = re.exec(buffer);
        if (match[0].length === 0) {
          return null;
        }
        return match;
      };
      Lexer2.prototype._getGroup = function(match) {
        var groupCount = this.groups.length;
        for (var i = 0; i < groupCount; i++) {
          if (match[i + 1] !== void 0) {
            return this.groups[i];
          }
        }
        throw new Error("Cannot find token type for matched text");
      };
      function tokenToString() {
        return this.value;
      }
      Lexer2.prototype.next = function() {
        var index = this.index;
        if (this.queuedGroup) {
          var token = this._token(this.queuedGroup, this.queuedText, index);
          this.queuedGroup = null;
          this.queuedText = "";
          return token;
        }
        var buffer = this.buffer;
        if (index === buffer.length) {
          return;
        }
        var group = this.fast[buffer.charCodeAt(index)];
        if (group) {
          return this._token(group, buffer.charAt(index), index);
        }
        var re = this.re;
        re.lastIndex = index;
        var match = eat(re, buffer);
        var error = this.error;
        if (match == null) {
          return this._token(error, buffer.slice(index, buffer.length), index);
        }
        var group = this._getGroup(match);
        var text = match[0];
        if (error.fallback && match.index !== index) {
          this.queuedGroup = group;
          this.queuedText = text;
          return this._token(error, buffer.slice(index, match.index), index);
        }
        return this._token(group, text, index);
      };
      Lexer2.prototype._token = function(group, text, offset) {
        var lineBreaks = 0;
        if (group.lineBreaks) {
          var matchNL = /\n/g;
          var nl = 1;
          if (text === "\n") {
            lineBreaks = 1;
          } else {
            while (matchNL.exec(text)) {
              lineBreaks++;
              nl = matchNL.lastIndex;
            }
          }
        }
        var token = {
          type: typeof group.type === "function" && group.type(text) || group.defaultType,
          value: typeof group.value === "function" ? group.value(text) : text,
          text,
          toString: tokenToString,
          offset,
          lineBreaks,
          line: this.line,
          col: this.col
        };
        var size = text.length;
        this.index += size;
        this.line += lineBreaks;
        if (lineBreaks !== 0) {
          this.col = size - nl + 1;
        } else {
          this.col += size;
        }
        if (group.shouldThrow) {
          var err = new Error(this.formatError(token, "invalid syntax"));
          throw err;
        }
        if (group.pop) this.popState();
        else if (group.push) this.pushState(group.push);
        else if (group.next) this.setState(group.next);
        return token;
      };
      if (typeof Symbol !== "undefined" && Symbol.iterator) {
        var LexerIterator = function(lexer) {
          this.lexer = lexer;
        };
        LexerIterator.prototype.next = function() {
          var token = this.lexer.next();
          return {
            value: token,
            done: !token
          };
        };
        LexerIterator.prototype[Symbol.iterator] = function() {
          return this;
        };
        Lexer2.prototype[Symbol.iterator] = function() {
          return new LexerIterator(this);
        };
      }
      Lexer2.prototype.formatError = function(token, message) {
        if (token == null) {
          var text = this.buffer.slice(this.index);
          var token = {
            text,
            offset: this.index,
            lineBreaks: text.indexOf("\n") === -1 ? 0 : 1,
            line: this.line,
            col: this.col
          };
        }
        var numLinesAround = 2;
        var firstDisplayedLine = Math.max(token.line - numLinesAround, 1);
        var lastDisplayedLine = token.line + numLinesAround;
        var lastLineDigits = String(lastDisplayedLine).length;
        var displayedLines = lastNLines(this.buffer, this.line - token.line + numLinesAround + 1).slice(0, 5);
        var errorLines = [];
        errorLines.push(message + " at line " + token.line + " col " + token.col + ":");
        errorLines.push("");
        for (var i = 0; i < displayedLines.length; i++) {
          var line = displayedLines[i];
          var lineNo = firstDisplayedLine + i;
          errorLines.push(pad(String(lineNo), lastLineDigits) + "  " + line);
          if (lineNo === token.line) {
            errorLines.push(pad("", lastLineDigits + token.col + 1) + "^");
          }
        }
        return errorLines.join("\n");
      };
      Lexer2.prototype.clone = function() {
        return new Lexer2(this.states, this.state);
      };
      Lexer2.prototype.has = function(tokenType) {
        return true;
      };
      return {
        compile: compile2,
        states: compileStates,
        error: Object.freeze({
          error: true
        }),
        fallback: Object.freeze({
          fallback: true
        }),
        keywords: keywordTransform
      };
    });
  }
});

// src/types.ts
var Option = class _Option {
  _value = null;
  static some(value) {
    const option = new _Option();
    option._value = value;
    return option;
  }
  static none() {
    return new _Option();
  }
  hasValue = () => this._value !== null;
  setValue(value) {
    this._value = value;
  }
  unwrap() {
    if (this._value === null) {
      throw new Error("attempted to unwrap Option with value None");
    }
    return this._value;
  }
};
var Result = class _Result {
  _ok = true;
  _value;
  _error;
  isOk = () => this._ok;
  isErr = () => !this._ok;
  unwrap() {
    if (!this._ok) {
      const errorString = JSON.stringify(this._error, null, 2);
      const message = "attempt to unwrap result with error: " + errorString;
      throw new Error(message);
    }
    return this._value;
  }
  error = () => this._error;
  mapErr() {
    return _Result.err(this._error);
  }
  static ok(value) {
    const result = new _Result();
    result._ok = true;
    result._value = value;
    return result;
  }
  static err(error) {
    const result = new _Result();
    result._ok = false;
    result._error = error;
    return result;
  }
  toJSON(...args) {
    console.log("toJSON");
    if (this._ok) {
      return JSON.stringify({
        ok: true,
        value: this._value
      }, ...args.slice(1));
    }
    return JSON.stringify({
      ok: false,
      error: this._error
    }, ...args.slice(1));
  }
  toString() {
    return this.toJSON([]);
  }
};

// src/js-types.ts
var JSObject = class _JSObject {
  type = "object";
  properties = {};
  getProperty(property) {
    if (this.type === "array" && property.type === "number") {
      return this.elements[property.value];
    }
    const propertyName = property.toString();
    if (!this.properties[propertyName]) {
      return _JSObject.undefined();
    }
    return this.properties[propertyName];
  }
  setProperty(property, value) {
    if (this.type === "array" && property.type === "number") {
      this.elements[property.value] = value;
      return;
    }
    const propertyName = property.toString();
    this.properties[propertyName] = value;
  }
  isTruthy() {
    return true;
  }
  //#region type factory methods
  static undefined() {
    return new JSUndefined();
  }
  static number(value) {
    const object = new JSNumber();
    object.value = value;
    return object;
  }
  static string(value) {
    const object = new JSString();
    object.value = value;
    return object;
  }
  static boolean(value) {
    const object = new JSBoolean();
    object.value = value;
    return object;
  }
  static func(parameters, body) {
    const object = new JSFunction();
    object.parameters = parameters;
    object.body = Option.some(body);
    return object;
  }
  static builtinFunction(func) {
    const object = new JSFunction();
    object.isBuiltIn = true;
    object.builtInFunction = Option.some(func);
    return object;
  }
  static object(properties) {
    const object = new _JSObject();
    object.properties = properties;
    return object;
  }
  static array(elements) {
    const object = new JSArray();
    object.elements = elements;
    return object;
  }
};
var JSUndefined = class extends JSObject {
  type = "undefined";
  toString() {
    return "undefined";
  }
  isTruthy() {
    return false;
  }
};
var JSNumber = class extends JSObject {
  type = "number";
  value;
  toString() {
    return this.value.toString();
  }
  isTruthy() {
    return this.value !== 0;
  }
};
var JSString = class extends JSObject {
  type = "string";
  value;
  toString() {
    return this.value.toString();
  }
  isTruthy() {
    return this.value !== "";
  }
};
var JSBoolean = class extends JSObject {
  type = "boolean";
  value;
  toString() {
    return this.value.toString();
  }
  isTruthy() {
    return this.value;
  }
};
var JSArray = class extends JSObject {
  type = "array";
  elements = [];
  toString() {
    return this.elements.toString();
  }
};
var JSFunction = class extends JSObject {
  type = "function";
  isBuiltIn = false;
  builtInFunction = Option.none();
  body = Option.none();
  parameters = [];
  toString() {
    return "TODO: function string";
  }
};

// src/interpreter.ts
var todo = (feature) => ({
  type: "not_yet_implemented",
  message: feature
});
var referenceError = (message) => ({
  type: "reference_error",
  message
});
var typeError = (message) => ({
  type: "type_error",
  message
});
var Interpreter = class {
  debug = false;
  scope = 0;
  scopes = [];
  constructor() {
    const global = {
      console: JSObject.object({
        log: JSObject.builtinFunction((...args) => {
          const strings = args.map((x) => x.toString());
          console.log(...strings);
          return JSObject.undefined();
        })
      })
    };
    this.scopes.push(global);
  }
  pushScope() {
    this.scopes.push({});
  }
  popScope() {
    this.scopes.pop();
  }
  declareVariable(name, value) {
    const scope = this.scopes[this.scope];
    scope[name] = value;
  }
  setVariable(name, value) {
    const scope = this.scopes[this.scope];
    scope[name] = value;
  }
  lookupVariable(name) {
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
  executeExpression(expression) {
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
        const identifierResult = this.executeExpression(expression.func);
        if (identifierResult.isErr()) return identifierResult;
        const value = identifierResult.unwrap();
        if (value.type !== "function") {
          return Result.err({
            type: "type_error",
            message: "TODO: x is not a function"
          });
        }
        const functionValue = value;
        if (!functionValue.isBuiltIn) {
          this.pushScope();
          for (let i = 0; i < expression.arguments.length; i++) {
            const arg = expression.arguments[i];
            const result2 = this.executeExpression(arg);
            if (result2.isErr()) return result2;
            const parameter = functionValue.parameters[i];
            this.declareVariable(parameter.name, result2.unwrap());
          }
          try {
            const result2 = this.executeStatement(functionValue.body.unwrap());
            this.popScope();
            return result2;
          } catch (errorOrReturnValue) {
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
          const result2 = this.executeExpression(arg);
          if (result2.isErr()) return result2;
          args.push(result2.unwrap());
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
            return Result.err(todo("executeExpression: member expression with computed properties"));
          }
          return Result.ok(object.getProperty(JSObject.string(expression.property.value)));
        }
      }
      case "function": {
        return Result.ok(JSObject.func(expression.parameters, expression.body));
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
            return Result.err({
              type: "reference_error",
              message: "Invalid left-hand side in assignment"
            });
          }
          const object = this.lookupVariable(memberExpression.object.value);
          if (object.type === "undefined" || object.type === "null") {
            return Result.err(typeError("Cannot set properties of " + object.type));
          }
          let property;
          if (memberExpression.computed) {
            if (memberExpression.property.type === "identifier") {
              property = JSObject.string(memberExpression.property.value);
            } else {
              const value2 = this.executeExpression(memberExpression.property);
              if (value2.isErr()) return value2;
              property = value2.unwrap();
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
          return Result.err(todo("non numeric binary expression"));
        }
        switch (expression.operator) {
          case "+": {
            const result = JSObject.number(leftValue.value + rightValue.value);
            return Result.ok(result);
          }
          case "*": {
            const result = JSObject.number(leftValue.value * rightValue.value);
            return Result.ok(result);
          }
          case "!==":
          case "!=":
          case "===":
          case "==": {
            todo("comparison operation");
            break;
          }
          default:
            todo(expression.operator);
        }
        break;
      }
      default:
        todo(expression.type);
    }
  }
  executeStatement(statement) {
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
        throw {
          type: "__RETURN_VALUE__",
          value
        };
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
        const func = JSObject.func(statement.parameters, statement.body);
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
        todo(statement.type);
    }
  }
  executeStatements(statements) {
    for (const statement of statements) {
      if (statement.type !== "function_declaration") continue;
      const result = this.executeStatement(statement);
      if (result.isErr()) return result.mapErr();
    }
    for (const statement of statements) {
      if (statement.type !== "variable_declaration") continue;
      if (statement.declarationType !== "var") continue;
      const result = this.executeStatement(statement);
      if (result.isErr()) return result.mapErr();
    }
    let lastValue = JSObject.undefined();
    for (const statement of statements) {
      if (statement.type === "function_declaration") continue;
      if (statement.type === "variable_declaration" && statement.declarationType === "var") continue;
      const result = this.executeStatement(statement);
      if (result.isErr()) return result.mapErr();
      lastValue = result.unwrap();
    }
    return Result.ok(lastValue);
  }
  run(program) {
    console.log("running", JSON.stringify(program, null, 2));
    return this.executeStatements(program.body);
  }
};

// src/lexer.ts
var import_npm_moo_0_5 = __toESM(require_moo());
var { compile, keywords } = import_npm_moo_0_5.default;
var rules = {
  ws: {
    match: /[\s]+/,
    lineBreaks: true
  },
  identifier: {
    match: /[$_a-zA-Z][$_0-9a-zA-Z]*/,
    type: keywords({
      keyword: [
        "function",
        "return",
        "for",
        "const",
        "let",
        "var",
        "true",
        "false",
        "if",
        "else",
        "while",
        "class",
        "static",
        "new",
        "extends",
        "break",
        "switch",
        "case",
        "default"
      ]
    })
  },
  number: [
    /[-]?(?:[0-9]*[.])?[0-9]+/
  ],
  string: [
    {
      match: /".*"/,
      value: (x) => x.slice(1, -1)
    },
    {
      match: /'.*'/,
      value: (x) => x.slice(1, -1)
    },
    {
      match: /`.*`/,
      value: (x) => x.slice(1, -1)
    }
  ],
  left_brace: "{",
  right_brace: "}",
  left_paren: "(",
  right_paren: ")",
  left_bracket: "[",
  right_bracket: "]",
  comment: /\/\/.*/,
  regex_literal: /\/.*\//,
  comma: ",",
  increment: "++",
  plus: "+",
  asterisk: "*",
  decrement: "--",
  minus: "-",
  slash: "/",
  arrow: "=>",
  strict_equal_to: "===",
  equal_to: "==",
  equals: "=",
  spread: "...",
  dot: ".",
  colon: ":",
  semicolon: ";",
  or: "||",
  logical_or: "|",
  and: "&&",
  logical_and: "&",
  less_than_or_equal_to: "<=",
  less_than: "<",
  greater_than_or_equal_to: ">=",
  greater_than: ">",
  strict_not_equal: "!==",
  not_equal: "!=",
  not: "!",
  question_mark: "?",
  eof: "<eof>"
};
var Lexer = class {
  lexer = compile(rules);
  run(filename, src) {
    this.lexer.reset(src);
    const tokens = Array.from(this.lexer).filter((t) => t.type !== "ws" && t.type !== "comment").map((t) => ({
      ...t,
      filename
    }));
    return tokens;
  }
};

// src/ast.ts
var TOKEN_TO_OPERATOR = {
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
  logical_and: "&"
};
var getOperatorFromToken = (token) => {
  const op = TOKEN_TO_OPERATOR[token.type];
  if (!op) {
    throw new Error("not an operator: " + token.type);
  }
  return op;
};
var OPERATOR_PRECEDENCE = {
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
  "/": 9
};

// src/parser.ts
var unexpectedToken = (expected, actual) => {
  const err = {
    type: "unexpected_token",
    message: "unexpected token: expected " + expected + ", got " + actual.value + ` in ${actual.filename}:${actual.line}:${actual.col}`
  };
  throw new Error(JSON.stringify(err));
};
var Parser = class {
  index = 0;
  tokens = [];
  expect(type) {
    const token = this.tokens[this.index];
    if (!token) return Result.err({
      type: "unexpected_token",
      message: "expected: " + type + ", got eof"
    });
    if (token.type !== type) return Result.err(unexpectedToken(type, token));
    this.index++;
    return Result.ok(token);
  }
  expectWithValue(type, value) {
    const tokenResult = this.expect(type);
    if (tokenResult.isErr()) return tokenResult;
    const token = tokenResult.unwrap();
    if (token.value !== value) return Result.err(unexpectedToken(type, token));
    return Result.ok(token);
  }
  backup(level = 1) {
    this.index -= level;
  }
  nextToken() {
    const token = this.tokens[this.index];
    this.index++;
    return token;
  }
  peekNextToken(level = 0) {
    return this.tokens[this.index + level];
  }
  nextTokenIsType(type) {
    const nextToken = this.tokens[this.index];
    if (!nextToken) return false;
    return nextToken.type === type;
  }
  parseNumber() {
    const numberTokenResult = this.expect("number");
    if (numberTokenResult.isErr()) return numberTokenResult.mapErr();
    const { value } = numberTokenResult.unwrap();
    return Result.ok({
      type: "number",
      value: parseFloat(value)
    });
  }
  parseString() {
    const stringTokenResult = this.expect("string");
    if (stringTokenResult.isErr()) return stringTokenResult.mapErr();
    const { value } = stringTokenResult.unwrap();
    return Result.ok({
      type: "string",
      value
    });
  }
  parseIdentifier() {
    const identifierTokenResult = this.expect("identifier");
    if (identifierTokenResult.isErr()) return identifierTokenResult.mapErr();
    const { value } = identifierTokenResult.unwrap();
    return Result.ok({
      type: "identifier",
      value
    });
  }
  parseBoolean() {
    const booleanTokenResult = this.expect("keyword");
    if (booleanTokenResult.isErr()) return booleanTokenResult.mapErr();
    const { value } = booleanTokenResult.unwrap();
    if (value !== "true" && value !== "false") {
      return Result.err(unexpectedToken("eof", booleanTokenResult.unwrap()));
    }
    return Result.ok({
      type: "boolean",
      value: value === "true"
    });
  }
  parseArrowFunctionExpression() {
    const leftParenResult = this.expect("left_paren");
    if (leftParenResult.isErr()) return leftParenResult.mapErr();
    const params = this.parseParams();
    if (params.isErr()) return params.mapErr();
    this.expect("arrow");
    const bodyResult = this.parseStatement();
    if (bodyResult.isErr()) return bodyResult.mapErr();
    return Result.ok({
      type: "function",
      identifier: Option.none(),
      parameters: params.unwrap(),
      body: bodyResult.unwrap()
    });
  }
  parseFunctionExpression() {
    const keyword = this.expectWithValue("keyword", "function");
    if (keyword.isErr()) return keyword.mapErr();
    const { value } = keyword.unwrap();
    if (value !== "function") {
      return Result.err(unexpectedToken("eof", keyword.unwrap()));
    }
    const identifier = Option.none();
    if (this.nextTokenIsType("identifier")) {
      const identifierToken = this.expect("identifier");
      identifier.setValue(identifierToken.unwrap().value);
    }
    const leftParenResult = this.expect("left_paren");
    if (leftParenResult.isErr()) return leftParenResult.mapErr();
    const params = this.parseParams();
    if (params.isErr()) return params.mapErr();
    const bodyResult = this.parseStatement();
    if (bodyResult.isErr()) return bodyResult.mapErr();
    return Result.ok({
      type: "function",
      identifier,
      parameters: params.unwrap(),
      body: bodyResult.unwrap()
    });
  }
  parseObjectExpression() {
    const leftBrace = this.expect("left_brace");
    if (leftBrace.isErr()) return leftBrace.mapErr();
    const properties = {};
    while (!this.nextTokenIsType("right_brace")) {
      const identifier = this.expect("identifier");
      if (identifier.isErr()) return identifier.mapErr();
      const idToken = identifier.unwrap();
      const id = idToken.value;
      if (this.peekNextToken().type === "colon") {
        const colon = this.expect("colon");
        if (colon.isErr()) return colon.mapErr();
        const value = this.parseExpression(0);
        if (value.isErr()) return value.mapErr();
        properties[id] = value.unwrap();
      } else {
        properties[id] = {
          type: "identifier",
          value: id
        };
      }
      if (this.nextTokenIsType("comma")) {
        this.index++;
      }
    }
    this.index++;
    return Result.ok({
      type: "object",
      properties
    });
  }
  parseArrayExpression() {
    const leftBracket = this.expect("left_bracket");
    if (leftBracket.isErr()) return leftBracket.mapErr();
    const elements = [];
    while (!this.nextTokenIsType("right_bracket")) {
      const value = this.parseExpression(0);
      if (value.isErr()) return value.mapErr();
      elements.push(value.unwrap());
      if (this.nextTokenIsType("comma")) {
        this.index++;
      }
    }
    this.index++;
    return Result.ok({
      type: "array",
      elements
    });
  }
  // parseKeywordExpression(): Result<Expression, ParseError> {
  //   const keywordTokenResult = this.expect("keyword");
  //   if (keywordTokenResult.isErr()) return keywordTokenResult.mapErr();
  //   const token = keywordTokenResult.unwrap();
  //   switch (token.value) {
  //     case "true":
  //     case "false":
  //       this.index--;
  //       return this.parseBoolean();
  //     case "function":
  //       this.index--;
  //       return this.parseFunctionExpression();
  //     default:
  //       return Result.err(unexpectedToken("eof", token));
  //   }
  // }
  isArrowFunctionExpression() {
    const next0 = this.peekNextToken()?.type;
    const next1 = this.peekNextToken(1)?.type;
    const next2 = this.peekNextToken(2)?.type;
    if (next0 !== "left_paren") return false;
    if (next1 === "right_paren") return true;
    if (next1 === "identifier" && next2 === "right_paren") return true;
    if (next1 === "identifier" && next2 === "comma") return true;
    if (next1 === "spread" && next2 === "identifier") return true;
    return false;
  }
  parseNotExpression() {
    const err = this.expect("not");
    if (err.isErr()) return err.mapErr();
    const expression = this.parseExpression();
    if (expression.isErr()) return expression.mapErr();
    return Result.ok({
      type: "not",
      expression: expression.unwrap()
    });
  }
  parsePrimary() {
    if (this.isArrowFunctionExpression()) {
      return this.parseArrowFunctionExpression();
    }
    if (this.peekNextToken()?.type === "left_paren") {
      this.expect("left_paren");
      const expression = this.parseExpression();
      this.expect("right_paren");
      return expression;
    }
    const token = this.nextToken();
    switch (token.type) {
      case "identifier": {
        let left = {
          type: "identifier",
          value: token.value
        };
        while (true) {
          const next = this.peekNextToken()?.type;
          if (next === "dot") {
            this.nextToken();
            const right = this.expect("identifier");
            if (right.isErr()) return right.mapErr();
            left = {
              type: "member",
              object: left,
              property: {
                type: "identifier",
                value: right.unwrap().value
              },
              computed: false
            };
          } else if (next === "left_bracket") {
            this.nextToken();
            const property = this.parseExpression(0);
            if (property.isErr()) return property.mapErr();
            const rightBracket = this.expect("right_bracket");
            if (rightBracket.isErr()) return rightBracket.mapErr();
            left = {
              type: "member",
              object: left,
              property: property.unwrap(),
              computed: true
            };
          } else if (next === "left_paren") {
            this.nextToken();
            const args = [];
            while (this.peekNextToken().type !== "right_paren") {
              const arg = this.parseExpression(0);
              if (arg.isErr()) return arg.mapErr();
              args.push(arg.unwrap());
              if (this.peekNextToken().type !== "right_paren") {
                this.expect("comma");
              }
            }
            this.expect("right_paren");
            left = {
              type: "call",
              func: left,
              arguments: args
            };
          } else if (next === "increment") {
            this.expect("increment");
            left = {
              type: "increment",
              expression: left,
              postfix: true
            };
          } else if (next === "decrement") {
            this.expect("decrement");
            left = {
              type: "decrement",
              expression: left,
              postfix: true
            };
          } else {
            break;
          }
        }
        if (this.peekNextToken()?.type === "equals") {
          this.nextToken();
          const value = this.parseExpression();
          if (value.isErr()) return value.mapErr();
          return Result.ok({
            type: "assignment",
            operator: "=",
            left,
            right: value.unwrap()
          });
        }
        return Result.ok(left);
      }
      case "number": {
        return Result.ok({
          type: "number",
          value: parseFloat(token.value)
        });
      }
      case "string": {
        return Result.ok({
          type: "string",
          value: token.value
        });
      }
      case "keyword": {
        if (token.value === "true" || token.value === "false") {
          return Result.ok({
            type: "boolean",
            value: token.value === "true"
          });
        }
        if (token.value === "function") {
          let id = Option.none();
          if (this.peekNextToken()?.type === "identifier") {
            let idToken = this.expect("identifier");
            if (idToken.isErr()) return idToken.mapErr();
            id = Option.some(idToken.unwrap().value);
          }
          const parameters = [];
          this.expect("left_paren");
          while (this.peekNextToken()?.type !== "right_paren") {
            const param = this.expect("identifier");
            if (param.isErr()) return param.mapErr();
            parameters.push({
              name: param.unwrap().value
            });
            if (this.peekNextToken()?.type !== "right_paren") {
              this.expect("comma");
            }
          }
          this.expect("right_paren");
          const body = this.parseBlockStatement();
          if (body.isErr()) return body.mapErr();
          return Result.ok({
            type: "function",
            identifier: id,
            parameters,
            body: body.unwrap()
          });
        }
        if (token.value === "new") {
          const id = this.expect("identifier");
          if (id.isErr()) return id.mapErr();
          const args = [];
          const leftParen = this.expect("left_paren");
          if (leftParen.isErr()) return leftParen.mapErr();
          while (this.peekNextToken().type !== "right_paren") {
            const arg = this.parseExpression(0);
            if (arg.isErr()) return arg.mapErr();
            args.push(arg.unwrap());
            if (this.peekNextToken().type !== "right_paren") {
              this.expect("comma");
            }
          }
          const rightParen = this.expect("right_paren");
          if (rightParen.isErr()) return rightParen.mapErr();
          return Result.ok({
            type: "new",
            identifier: id.unwrap().value,
            arguments: args
          });
        }
        throw new Error("unexpected token: " + token.type + ": " + token.value);
      }
      case "left_brace": {
        this.index--;
        return this.parseObjectExpression();
      }
      case "left_bracket": {
        this.index--;
        return this.parseArrayExpression();
      }
      case "right_paren": {
        this.index--;
        this.index--;
        return this.parseArrowFunctionExpression();
      }
      case "not": {
        this.index--;
        return this.parseNotExpression();
      }
      case "spread": {
        const expr = this.parseExpression();
        if (expr.isErr()) return expr;
        return Result.ok({
          type: "spread",
          expression: expr.unwrap()
        });
      }
      case "decrement": {
        const expr = this.parseExpression();
        if (expr.isErr()) return expr;
        return Result.ok({
          type: "decrement",
          expression: expr.unwrap(),
          postfix: false
        });
      }
      case "increment": {
        const expr = this.parseExpression();
        if (expr.isErr()) return expr;
        return Result.ok({
          type: "decrement",
          expression: expr.unwrap(),
          postfix: false
        });
      }
      default:
        const err = "unexpected token: " + token.type + ": " + token.value + ` in ${token.filename}:${token.line}:${token.col}`;
        throw new Error(err);
    }
  }
  isOperatorTokenType(token) {
    if (!token) return false;
    return token.type in TOKEN_TO_OPERATOR;
  }
  parseExpression(precedence = 0) {
    let leftResult = this.parsePrimary();
    if (leftResult.isErr()) return leftResult.mapErr();
    let left = leftResult.unwrap();
    while (this.isOperatorTokenType(this.peekNextToken())) {
      const operatorToken = this.peekNextToken();
      const operator = getOperatorFromToken(operatorToken);
      const operatorPrecedence = OPERATOR_PRECEDENCE[operator];
      if (operatorPrecedence > precedence) {
        this.nextToken();
        const right = this.parseExpression(operatorPrecedence);
        if (right.isErr()) return right.mapErr();
        left = {
          type: "binary",
          operator,
          left,
          right: right.unwrap()
        };
      } else {
        break;
      }
    }
    return Result.ok(left);
  }
  parseVariableDeclaration() {
    const keywordResult = this.expect("keyword");
    if (keywordResult.isErr()) return keywordResult.mapErr();
    const keywordToken = keywordResult.unwrap();
    if (![
      "var",
      "const",
      "let"
    ].includes(keywordToken.value)) {
      return Result.err(unexpectedToken("eof", keywordToken));
    }
    const identifierResult = this.expect("identifier");
    if (identifierResult.isErr()) return identifierResult.mapErr();
    const identifierToken = identifierResult.unwrap();
    if (!this.nextTokenIsType("equals")) {
      if (keywordToken.value === "const") return Result.err({
        type: "syntax_error",
        message: "const declaration must have initial value"
      });
      return Result.ok({
        type: "variable_declaration",
        declarationType: "var",
        identifier: identifierToken.value,
        value: Option.none(),
        varType: keywordToken.value
      });
    }
    const equalsResult = this.expect("equals");
    if (equalsResult.isErr()) return equalsResult.mapErr();
    const valueResult = this.parseExpression(0);
    if (valueResult.isErr()) return valueResult.mapErr();
    return Result.ok({
      type: "variable_declaration",
      declarationType: "var",
      identifier: identifierToken.value,
      value: Option.some(valueResult.unwrap()),
      varType: keywordToken.value
    });
  }
  parseBlockStatement() {
    const leftBraceResult = this.expect("left_brace");
    if (leftBraceResult.isErr()) return leftBraceResult.mapErr();
    const body = [];
    while (!this.nextTokenIsType("right_brace")) {
      const result = this.parseStatement();
      if (result.isErr()) return result;
      body.push(result.unwrap());
    }
    this.index++;
    return Result.ok({
      type: "block",
      body
    });
  }
  parseExpressionStatement() {
    const expressionResult = this.parseExpression(0);
    if (expressionResult.isErr()) return expressionResult.mapErr();
    if (this.nextTokenIsType("semicolon")) {
      this.expect("semicolon");
    }
    return Result.ok({
      type: "expression",
      expression: expressionResult.unwrap()
    });
  }
  parseFunctionDeclarationStatement() {
    const returnResult = this.expectWithValue("keyword", "function");
    if (returnResult.isErr()) return returnResult.mapErr();
    const identifier = this.expect("identifier");
    if (identifier.isErr()) return identifier.mapErr();
    const leftParenResult = this.expect("left_paren");
    if (leftParenResult.isErr()) return leftParenResult.mapErr();
    const parameters = [];
    while (!this.nextTokenIsType("right_paren")) {
      const paramResult = this.expect("identifier");
      if (paramResult.isErr()) return paramResult.mapErr();
      parameters.push({
        name: paramResult.unwrap().value
      });
      if (this.nextTokenIsType("comma")) this.index++;
    }
    this.index++;
    const bodyResult = this.parseStatement();
    if (bodyResult.isErr()) return bodyResult.mapErr();
    return Result.ok({
      type: "function_declaration",
      identifier: identifier.unwrap().value,
      parameters,
      body: bodyResult.unwrap()
    });
  }
  parseIfStatement() {
    const ifKeyword = this.expectWithValue("keyword", "if");
    if (ifKeyword.isErr()) return ifKeyword.mapErr();
    const leftParen = this.expect("left_paren");
    if (leftParen.isErr()) return leftParen.mapErr();
    const condition = this.parseExpression(0);
    if (condition.isErr()) return condition.mapErr();
    const rightParen = this.expect("right_paren");
    if (rightParen.isErr()) return rightParen.mapErr();
    const ifBody = this.parseStatement();
    if (ifBody.isErr()) return ifBody;
    const elseBody = Option.none();
    if (this.nextTokenIsType("keyword")) {
      const keyword = this.expect("keyword");
      if (keyword.isErr()) return keyword.mapErr();
      if (keyword.unwrap().value === "else") {
        const elseStatement = this.parseStatement();
        if (elseStatement.isErr()) return elseStatement;
        elseBody.setValue(elseStatement.unwrap());
      } else {
        this.backup();
      }
    }
    return Result.ok({
      type: "if",
      condition: condition.unwrap(),
      ifBody: ifBody.unwrap(),
      elseBody
    });
  }
  parseWhileStatement() {
    const whileKeyword = this.expectWithValue("keyword", "while");
    if (whileKeyword.isErr()) return whileKeyword.mapErr();
    const leftParen = this.expect("left_paren");
    if (leftParen.isErr()) return leftParen.mapErr();
    const condition = this.parseExpression(0);
    if (condition.isErr()) return condition.mapErr();
    const rightParen = this.expect("right_paren");
    if (rightParen.isErr()) return rightParen.mapErr();
    const body = this.parseStatement();
    if (body.isErr()) return body;
    return Result.ok({
      type: "while",
      condition: condition.unwrap(),
      body: body.unwrap()
    });
  }
  parseParams() {
    const params = [];
    while (this.peekNextToken()?.type !== "right_paren") {
      if (this.peekNextToken()?.type === "spread") {
        this.expect("spread");
        const identifier = this.expect("identifier");
        if (identifier.isErr()) return identifier.mapErr();
        params.push({
          name: identifier.unwrap().value,
          spread: true
        });
        break;
      }
      const param = this.expect("identifier");
      if (param.isErr()) return param.mapErr();
      params.push({
        name: param.unwrap().value
      });
      if (this.peekNextToken()?.type !== "right_paren") {
        this.expect("comma");
      }
    }
    this.expect("right_paren");
    return Result.ok(params);
  }
  parseClassMethodDeclaration(isStatic) {
    const id = this.expect("identifier");
    if (id.isErr()) return id.mapErr();
    const leftParen = this.expect("left_paren");
    if (leftParen.isErr()) return leftParen.mapErr();
    const params = this.parseParams();
    if (params.isErr()) return params.mapErr();
    const body = this.parseBlockStatement();
    if (body.isErr()) return body.mapErr();
    return Result.ok({
      name: id.unwrap().value,
      parameters: params.unwrap(),
      body: body.unwrap(),
      static: isStatic
    });
  }
  parseClassPropertyDeclaration(isStatic) {
    const id = this.expect("identifier");
    if (id.isErr()) return id.mapErr();
    if (this.peekNextToken()?.type === "semicolon") {
      this.nextToken();
      return Result.ok({
        name: id.unwrap().value,
        static: isStatic
      });
    }
    const equals = this.expect("equals");
    if (equals.isErr()) return equals.mapErr();
    const value = this.parseExpression(0);
    if (value.isErr()) return value.mapErr();
    if (this.nextTokenIsType("semicolon")) {
      this.expect("semicolon");
    }
    return Result.ok({
      name: id.unwrap().value,
      value: value.unwrap(),
      static: isStatic
    });
  }
  parseClassDeclarationStatement() {
    const classKeyword = this.expectWithValue("keyword", "class");
    if (classKeyword.isErr()) return classKeyword.mapErr();
    const className = this.expect("identifier");
    if (className.isErr()) return className.mapErr();
    let superClass;
    if (this.peekNextToken().type === "keyword") {
      const next = this.nextToken();
      if (next.value !== "extends") {
        return Result.err(unexpectedToken("left_brace", next));
      }
      const identifier = this.expect("identifier");
      if (identifier.isErr()) return identifier.mapErr();
      superClass = identifier.unwrap().value;
    }
    const leftBrace = this.expect("left_brace");
    if (leftBrace.isErr()) return leftBrace.mapErr();
    const properties = [];
    const methods = [];
    while (this.peekNextToken()?.type !== "right_brace") {
      let peek = this.peekNextToken();
      let isStatic = false;
      if (peek?.type === "keyword" && peek.value === "static") {
        isStatic = true;
        this.nextToken();
      }
      const id = this.expect("identifier");
      if (id.isErr()) return id.mapErr();
      peek = this.peekNextToken();
      if (peek?.type === "left_paren" || peek?.type === "keyword" && peek?.value === "static") {
        this.backup();
        const method = this.parseClassMethodDeclaration(isStatic);
        if (method.isErr()) return method.mapErr();
        methods.push(method.unwrap());
      } else if (peek?.type === "semicolon" || peek?.type === "equals") {
        this.backup();
        const prop = this.parseClassPropertyDeclaration(isStatic);
        if (prop.isErr()) return prop.mapErr();
        properties.push(prop.unwrap());
      } else {
        return Result.err(unexpectedToken("eof", this.tokens[this.index]));
      }
    }
    const rightBrace = this.expect("right_brace");
    if (rightBrace.isErr()) return rightBrace.mapErr();
    return Result.ok({
      type: "class_declaration",
      identifier: className.unwrap().value,
      properties,
      methods,
      superClass
    });
  }
  parseSwitchStatement() {
    const returnResult = this.expectWithValue("keyword", "switch");
    if (returnResult.isErr()) return returnResult.mapErr();
    const leftParen = this.expect("left_paren");
    if (leftParen.isErr()) return leftParen.mapErr();
    const condition = this.parseExpression(0);
    if (condition.isErr()) return condition.mapErr();
    const rightParen = this.expect("right_paren");
    if (rightParen.isErr()) return rightParen.mapErr();
    const leftBrace = this.expect("left_brace");
    if (leftBrace.isErr()) return leftBrace.mapErr();
    const cases = [];
    while (this.peekNextToken()?.type === "keyword" && this.peekNextToken()?.text === "case") {
      const c = this.expectWithValue("keyword", "case");
      if (c.isErr()) return c.mapErr();
      const test = this.parseExpression();
      if (test.isErr()) return test.mapErr();
      const colon = this.expect("colon");
      if (colon.isErr()) return colon.mapErr();
      const body = this.parseStatement();
      cases.push({
        test: test.unwrap(),
        body: body.unwrap()
      });
    }
    let def = Option.none();
    if (this.peekNextToken().type === "keyword" && this.peekNextToken()?.value === "default") {
      this.expectWithValue("keyword", "default");
      const colon = this.expect("colon");
      if (colon.isErr()) return colon.mapErr();
      const body = this.parseStatement();
      if (body.isErr()) return body.mapErr();
      def = Option.some(body.unwrap());
    }
    const rightBrace = this.expect("right_brace");
    if (rightBrace.isErr()) return rightBrace.mapErr();
    return Result.ok({
      type: "switch",
      condition: condition.unwrap(),
      cases,
      default: def
    });
  }
  parseReturnStatement() {
    const returnResult = this.expectWithValue("keyword", "return");
    if (returnResult.isErr()) return returnResult.mapErr();
    if (this.peekNextToken().type === "semicolon") {
      this.expect("semicolon");
      return Result.ok({
        type: "return"
      });
    }
    const expressionResult = this.parseExpression(0);
    if (expressionResult.isErr()) return expressionResult.mapErr();
    const semicolonTokenResult = this.expect("semicolon");
    if (semicolonTokenResult.isErr()) return semicolonTokenResult.mapErr();
    return Result.ok({
      type: "return",
      expression: expressionResult.unwrap()
    });
  }
  parseBreakStatement() {
    const returnResult = this.expectWithValue("keyword", "break");
    if (returnResult.isErr()) return returnResult.mapErr();
    if (this.peekNextToken().type === "semicolon") {
      this.expect("semicolon");
    }
    return Result.ok({
      type: "break"
    });
  }
  parseStatement() {
    const token = this.tokens[this.index];
    switch (token.type) {
      case "semicolon":
        this.index++;
        return Result.ok({
          type: "empty"
        });
      case "number":
      case "string":
      case "identifier":
      case "left_paren":
      case "not":
      case "decrement":
      case "increment":
      case "spread":
        return this.parseExpressionStatement();
      case "keyword":
        if (token.value === "true" || token.value === "false" || token.value === "new") {
          return this.parseExpressionStatement();
        }
        if (token.value === "var" || token.value === "const" || token.value === "let") {
          const statement = this.parseVariableDeclaration();
          if (this.peekNextToken()?.type === "semicolon") {
            this.expect("semicolon");
          }
          return statement;
        }
        if (token.value === "if") {
          return this.parseIfStatement();
        }
        if (token.value === "while") {
          return this.parseWhileStatement();
        }
        if (token.value === "function") {
          return this.parseFunctionDeclarationStatement();
        }
        if (token.value === "return") {
          return this.parseReturnStatement();
        }
        if (token.value === "class") {
          return this.parseClassDeclarationStatement();
        }
        if (token.value === "switch") {
          return this.parseSwitchStatement();
        }
        if (token.value === "break") {
          return this.parseBreakStatement();
        }
        return Result.err(unexpectedToken("eof", token));
      case "left_brace": {
        const result = this.parseBlockStatement();
        if (result.isErr()) return result;
        return result;
      }
      default:
        return Result.err(unexpectedToken("eof", token));
    }
  }
  parse(tokens) {
    this.tokens = tokens;
    this.index = 0;
    const body = [];
    while (this.index < tokens.length) {
      const result = this.parseStatement();
      if (result.isErr()) return result.mapErr();
      body.push(result.unwrap());
    }
    return Result.ok({
      body
    });
  }
};

// src/jsjs.ts
var JSJS = class {
  lexer = new Lexer();
  parser = new Parser();
  interpreter = new Interpreter();
  parse(filename, source) {
    const tokens = this.lexer.run(filename, source);
    return this.parser.parse(tokens);
  }
  run(filename, source) {
    const parseResult = this.parse(filename, source);
    if (parseResult.isErr()) return parseResult.mapErr();
    const ast = parseResult.unwrap();
    console.log({
      ast
    });
    return this.interpreter.run(ast);
  }
};
export {
  JSJS
};
