import { assertEquals } from "jsr:@std/assert/equals";
import { Lexer } from "../src/lexer.ts";
import { Parser } from "../src/parser.ts";

type OverwriteOption = "snapshots" | "ast" | "all";
const OVERWRITE = Deno.env.get("OVERWRITE") as OverwriteOption | undefined;

const TEST_DIR = "./integration_tests";

const getTests = () => {
  const dir = Deno.readDirSync(TEST_DIR);

  const tests: string[] = [];

  for (const f of dir) {
    if (f.isFile && f.name.endsWith(".js")) {
      tests.push(f.name.split(".js")[0]);
    }
  }

  return tests;
};

const getAst = (filename: string, src: string) => {
  const lexer = new Lexer();
  const tokens = lexer.run(filename, src);
  const parser = new Parser();
  return parser.parse(tokens);
};

const tests = getTests();

Deno.test(`integration:`, async (t) => {
  for (const name of tests) {
    await t.step(name, async () => {
      const filename = `${TEST_DIR}/${name}.js`;
      const astFileName = `${TEST_DIR}/${name}.ast.json`;
      const outputFileName = `${TEST_DIR}/${name}.output`;
      const src = Deno.readTextFileSync(filename);
      const ast = getAst(filename, src);

      if (OVERWRITE === "all" || OVERWRITE === "ast") {
        Deno.writeTextFileSync(astFileName, JSON.stringify(ast, null, 2));
      }

      const expectedAst = Deno.readTextFileSync(astFileName);

      assertEquals(JSON.stringify(ast, null, 2), expectedAst);

      const command = new Deno.Command("deno", {
        args: ["run", "-A", "src/main.ts", filename],
      });
      const { success, stdout, stderr } = await command.output();

      assertEquals(
        success,
        true,
        "failed to run test file: \n" + new TextDecoder().decode(stderr)
      );

      const out = new TextDecoder().decode(stdout);

      if (OVERWRITE === "all" || OVERWRITE === "snapshots") {
        Deno.writeTextFileSync(outputFileName, out);
      }

      const expectedOut = Deno.readTextFileSync(outputFileName);

      assertEquals(out, expectedOut);
    });
  }
});
