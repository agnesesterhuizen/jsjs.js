const numbers = [1, 2, 3, 4];
let total = 0;
for (let value of numbers) {
  total = total + value;
}
console.log(total);

const bucket = { first: undefined };
for (bucket.first of ["alpha", "beta"]) {
  console.log(bucket.first);
}
