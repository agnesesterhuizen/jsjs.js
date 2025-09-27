import { JSJS } from "./jsjs.ts";
import { parseArgs } from "@std/cli/parse-args";
import { Lexer } from "./lexer.ts";
import { Parser } from "./parser.ts";

const filename = Deno.args[0];
const source = Deno.readTextFileSync(filename);

const flags = parseArgs(Deno.args, {
  boolean: ["ast"],
  default: { ast: false },
});

if (flags.ast) {
  const lexer = new Lexer();
  const tokens = lexer.run(filename, source);

  const parser = new Parser();
  const ast = parser.parse(tokens);
  console.log(JSON.stringify(ast, null, 2));

  Deno.exit();
}

const js = new JSJS();
js.run(filename, source);
