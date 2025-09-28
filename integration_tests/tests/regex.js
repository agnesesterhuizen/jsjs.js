// deno-lint-ignore-file

const re = /hello (\w+)/g;
const inputs = [
  "hello world",
  "hello there",
  "no match",
  "hello regex hello runtime",
];

for (let i = 0; i < inputs.length; i++) {
  const input = inputs[i];
  re.lastIndex = 0;
  const result = re.exec(input);
  if (result) {
    console.log(result[0]);
    console.log(result[1]);
    console.log(re.lastIndex);
  } else {
    console.log("no-match");
  }
}

console.log(re.source);
console.log(re.flags);
console.log(re.toString());

const escapeRe = /[-\/\\^$*+?.()|[\]{}]/g;
console.log(escapeRe.test("slash/"));
console.log(escapeRe.test("noclass"));
escapeRe.lastIndex = 0;
console.log(escapeRe.toString());
console.log(escapeRe.source);
console.log(escapeRe.flags);
