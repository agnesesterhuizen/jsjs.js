import { parseArgs } from "@std/cli/parse-args";
import { JSJS } from "./jsjs.ts";

const filename = Deno.args[0];
const source = Deno.readTextFileSync(filename);

const flags = parseArgs(Deno.args, {
  boolean: ["ast", "tokens"],
  default: { ast: false, tokens: false },
});

const js = new JSJS();

if (flags.tokens) {
  const tokens = js.tokens(filename, source);
  console.log(JSON.stringify(tokens, null, 2));
  Deno.exit();
}

if (flags.ast) {
  const ast = js.parse(filename, source);
  console.log(JSON.stringify(ast, null, 2));
  Deno.exit();
}

js.run(filename, source);
