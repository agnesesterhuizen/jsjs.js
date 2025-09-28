// deno-lint-ignore-file

/* This is a multi-line comment
   that spans multiple lines
   and includes special characters like / and *
*/
const x = 42;

// This is a single-line comment
const y = /* inline multi-line comment */ "hello";

/* Another multi-line comment with your specific example:
   comment /
   /
   comment
*/
const z = true;

/* Final multi-line comment */
console.log(x, y, z);
