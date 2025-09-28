console.log("null ?? 'fallback':", null ?? "fallback"); // "fallback"
console.log("undefined ?? 'fallback':", undefined ?? "fallback"); // "fallback"

// --- Non-nullish values just return left side
console.log("0 ?? 123:", 0 ?? 123); // 0
console.log("'' ?? 'hi':", "" ?? "hi"); // ""
console.log("false ?? true:", false ?? true); // false

// --- Nested coalescing
console.log("null ?? undefined ?? 'ok':", null ?? undefined ?? "ok"); // "ok"

// --- With other operators
console.log("(null ?? 1) + 2:", (null ?? 1) + 2); // 3
console.log("(0 ?? 1) + 2:", (0 ?? 1) + 2); // 2

// --- Parentheses required if mixing with || or &&
console.log("true || (null ?? 'x'):", true || (null ?? "x")); // true
console.log("false && (null ?? 'x'):", false && (null ?? "x")); // false
