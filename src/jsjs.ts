import { newJSLexer } from "./lexer";

const fs = require("fs");

const src = fs.readFileSync("jsjs.js", "utf8");

const l = newJSLexer();
const res = l.getTokens(src);

console.log(JSON.stringify(res, null, 2));

export {};
