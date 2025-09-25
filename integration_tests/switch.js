const x = "test";

switch (x) {
  case "x":
    break;
  case "y": {
    break;
  }

  // deno-lint-ignore no-fallthrough
  case "test": {
    console.log("match");
  }

  case "after": {
    console.log("next case");
    break;
  }

  case "after break": {
    console.log("error: fell though after break");
    break;
  }

  default:
    console.log("default");
}
