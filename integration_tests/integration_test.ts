import { assertEquals } from "@std/assert/equals";

type OverwriteOption = "snapshots" | "ast" | "all";
const OVERWRITE = Deno.env.get("OVERWRITE") as OverwriteOption | undefined;

const TEST_DIR = "./integration_tests/tests";

const runCmd = (cmd: string, args: string[] = []) => {
  const command = new Deno.Command(cmd, {
    args,
  });
  return command.output();
};

const cli = async (filename: string, flag?: string) => {
  const args = [filename];
  if (flag) {
    args.push(flag);
  }

  const {
    success,
    stdout: stdoutbuf,
    stderr: stderrbuf,
  } = await runCmd("dist/jsjs", args);

  const stdout = new TextDecoder().decode(stdoutbuf);
  const stderr = new TextDecoder().decode(stderrbuf);

  return { success, stdout, stderr };
};

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

const getAst = (filename: string) => {
  return cli(filename, "--ast");
};

const tests = getTests();

Deno.test(`integration:`, async (t) => {
  // build cli first
  const buildResult = await runCmd("deno", ["task", "build"]);
  if (!buildResult.success) {
    assertEquals(buildResult.success, true, "failed to build cli");
    Deno.exit(1);
  }

  for (const name of tests) {
    await t.step(name, async () => {
      const filename = `${TEST_DIR}/${name}.js`;
      const astFileName = `${TEST_DIR}/${name}.ast.json`;
      const outputFileName = `${TEST_DIR}/${name}.output`;
      const {
        success: astSuccess,
        stdout: astOut,
        stderr: astErr,
      } = await getAst(filename);

      if (!astSuccess) {
        console.error(`failed to get ast for ${filename}: \n` + astErr);
        assertEquals(astSuccess, true);
        return;
      }

      if (OVERWRITE === "all" || OVERWRITE === "ast") {
        Deno.writeTextFileSync(astFileName, astOut);
      }

      const expectedAst = Deno.readTextFileSync(astFileName);

      assertEquals(astOut, expectedAst);

      const { success, stdout, stderr } = await cli(filename);

      assertEquals(success, true, "failed to run test file: \n" + stderr);

      if (OVERWRITE === "all" || OVERWRITE === "snapshots") {
        Deno.writeTextFileSync(outputFileName, stdout);
      }

      const expectedOut = Deno.readTextFileSync(outputFileName);

      assertEquals(stdout, expectedOut);
    });
  }
});
