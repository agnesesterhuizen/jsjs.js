// deno-lint-ignore-file

const person = {
  name: "Alice",
  age: 30,
  address: { city: "Wonderland", zip: 12345 },
  extras: "extra",
};

const { name, age } = person;
console.log("basic:", name, age);

const {
  address: { city },
  nickname = "Traveler",
} = person;
console.log("nested:", city, nickname);

let aliasName;
let aliasCity;
({
  name: aliasName,
  address: { city: aliasCity },
} = person);
console.log("assignment:", aliasName, aliasCity);

const {
  name: firstName,
  address: { city: homeCity },
  ...restProps
} = person;
console.log(
  "rest:",
  firstName,
  homeCity,
  restProps.age,
  restProps.extras,
  restProps.address
);

const people = [
  person,
  {
    name: "Bob",
    age: 25,
    address: { city: "Builderland", zip: 54321 },
  },
];

for (const {
  name: loopName,
  address: { city: loopCity },
} of people) {
  console.log("loop:", loopName, loopCity);
}
