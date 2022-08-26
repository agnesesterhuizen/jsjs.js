import { newJSLexer } from "./js-lexer";
import { JSJS } from "./jsjs";
import { Parser } from "./parser";

const fs = require("fs");

const src = fs.readFileSync("jsjs.js", "utf8");

// const l = newJSLexer();
// const res = l.getTokens('console.log("hello world");');

// // console.log(" -- tokens --");
// // console.log(JSON.stringify(res.unwrap(), null, 2));
// // console.log("\n");

// const p = new Parser();
// const parseResult = p.parse(res.unwrap());

// if (parseResult.isErr()) {
//   console.log(" -- parse error -- ", parseResult);
//   console.error(parseResult.error());
// } else {
//   console.log(" -- ast --");
//   console.log(JSON.stringify(parseResult.unwrap(), null, 2));
//   console.log("\n");
// }

const jsjs = new JSJS();
const res = jsjs.run(`
1+2 + 3;
  `);
if (res.isErr()) {
  console.log(" -- error -- ", res.error());
} else {
  console.log(" -- success -- ");
  console.log(res.unwrap());
}

export {};
