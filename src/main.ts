import { JSJS } from "./jsjs";

const js = new JSJS();
const err = js.run(`console.log(1 + 2);`);
if (err.isErr) {
  console.error(err.error());
}
