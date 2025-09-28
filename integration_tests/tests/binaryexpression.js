const obj = { a: 1 };
const arr = [10, 20, 30];

console.log("--- Arithmetic ---");
console.log("5 + 2:", 5 + 2); // 7
console.log("5 - 2:", 5 - 2); // 3
console.log("5 * 2:", 5 * 2); // 10
console.log("5 / 2:", 5 / 2); // 2.5
console.log("5 % 2:", 5 % 2); // 1

console.log("--- Comparison ---");
console.log("5 < 2:", 5 < 2); // false
console.log("5 <= 5:", 5 <= 5); // true
console.log("5 > 2:", 5 > 2); // true
console.log("5 >= 6:", 5 >= 6); // false

// TODO: weird string stuff
// console.log("--- Equality ---");
// console.log("5 == '5':", 5 == "5"); // true
// console.log("5 === '5':", 5 === "5"); // false
// console.log("5 != '5':", 5 != "5"); // false
// console.log("5 !== '5':", 5 !== "5"); // true

console.log("--- Logical ---");
console.log("true || false:", true || false); // true
console.log("false && true:", false && true); // false
console.log("null ?? 'x':", null ?? "x"); // "x"
console.log("0 ?? 123:", 0 ?? 123); // 0

console.log("--- String Concatenation ---");
console.log("'hello' + ' world':", "hello" + " world"); // "hello world"
console.log("'num: ' + 5:", "num: " + 5); // "num: 5"

console.log("--- `in` operator ---");
console.log("'a' in obj:", "a" in obj); // true
console.log("'missing' in obj:", "missing" in obj); // false
console.log("0 in arr:", 0 in arr); // true
console.log("3 in arr:", 3 in arr); // false
console.log("'length' in arr:", "length" in arr); // true

// TODO:
// console.log("--- Edge coercions ---");
// console.log("true + true:", true + true); // 2
// console.log("false + 5:", false + 5); // 5
// console.log("null == undefined:", null == undefined); // true
// console.log("null === undefined:", null === undefined); // false
// console.log("'5' < 10:", "5" < 10); // true
// console.log("'abc' < 'abd':", "abc" < "abd"); // true
