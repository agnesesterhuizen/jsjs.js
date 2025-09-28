// deno-lint-ignore-file

const name = "world";
const a = 2;
const b = 3;

console.log(`hello ${name}!`);
console.log(`${a} + ${b} = ${a + b}`);
const multiLine = `first line
second line`;
console.log(multiLine);
const nested = `outer ${`inner ${a + b}`}`;
console.log(nested);
const escaped = `backtick: \``;
console.log(escaped);
