import { JSJS } from "./jsjs.ts";

const filename = Deno.args[0];

const source = Deno.readTextFileSync(filename);

const js = new JSJS();
const err = js.run(filename, source);
if (err.isErr()) {
  console.error(err.error());
}
