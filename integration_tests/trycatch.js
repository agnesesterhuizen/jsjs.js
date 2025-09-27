console.log("start");

try {
  console.log("inside try 1");
  throw "oops";
} catch (err) {
  console.log("caught 1: " + err);
} finally {
  console.log("finally 1");
}

function testReturn() {
  try {
    console.log("try return");
    return "return value";
  } finally {
    console.log("finally after return");
  }
}

console.log("returned: " + testReturn());

try {
  try {
    console.log("nested try");
    throw "inner error";
  } finally {
    console.log("nested finally");
  }
} catch (e) {
  console.log("outer catch: " + e);
}

try {
  try {
    console.log("before rethrow");
    throw "rethrow";
  } catch (e) {
    console.log("caught before rethrow: " + e);
    throw "rethrown";
  }
} catch (e) {
  console.log("outer after rethrow: " + e);
}

function testFinallyOverride() {
  try {
    console.log("try before return 2");
    return "try";
  } finally {
    console.log("finally return override");
    return "finally";
  }
}

console.log("finally override result: " + testFinallyOverride());
