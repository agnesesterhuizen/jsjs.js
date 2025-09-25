import { JSJS } from "./jsjs";
import { readFileSync } from "fs";

const filename = process.argv[2];

const source = readFileSync(filename, { encoding: "utf-8" });

const js = new JSJS();
const err = js.run(filename, source);
if (err.isErr) {
  console.error(err.error());
}
