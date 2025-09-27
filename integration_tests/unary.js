// deno-lint-ignore-file

// Logical NOT operator (!)
console.log(!true); // false
console.log(!false); // true
console.log(!0); // true
console.log(!1); // false
console.log(!""); // true
console.log(!"hello"); // false
console.log(!null); // true
console.log(!undefined); // true

// typeof operator
console.log(typeof undefined); // "undefined"
console.log(typeof null); // "object"
console.log(typeof true); // "boolean"
console.log(typeof 42); // "number"
console.log(typeof "hello"); // "string"
console.log(typeof {}); // "object"
console.log(typeof []); // "object"

function testFunc() {}
console.log(typeof testFunc); // "function"

// Unary plus operator (+)
console.log(+42); // 42
console.log(+"42"); // 42
console.log(+true); // 1
console.log(+false); // 0
console.log(+null); // 0
console.log(+undefined); // NaN
console.log(+"hello"); // NaN

// Unary minus operator (-)
console.log(-42); // -42
console.log(-(-42)); // 42
console.log(-"42"); // -42
console.log(-true); // -1
console.log(-false); // -0
console.log(-null); // -0
console.log(-undefined); // NaN

// void
console.log("void 123 = ", void 123); // undefined
console.log("void 'hello' = ", void "hello"); // undefined
console.log("void true = ", void true); // undefined
console.log("void null = ", void null); // undefined
console.log("void undefined = ", void undefined); // undefined
console.log("void {} = ", void {}); // undefined
console.log("void [1, 2, 3] = ", void [1, 2, 3]); // undefined
console.log("void function() {} = ", void function () {}); // undefined

// Complex expressions
console.log(!!42); // true
console.log(typeof typeof 42); // "string"
console.log(+(+"42")); // 42
console.log(-+42); // -42
