class Animal {
  constructor(name) {
    this.name = name;
    this.type = "animal";
  }

  describe() {
    return "Animal named " + this.name;
  }

  getType() {
    return this.type;
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name);
    this.breed = breed;
    this.type = "dog";
  }

  describe() {
    return "Dog named " + this.name + " (" + this.breed + ")";
  }
}

const rover = new Dog("Rover", "Collie");

console.log("name:", rover.name);
console.log("breed:", rover.breed);
console.log("type:", rover.getType());
console.log("describe:", rover.describe());
console.log(
  "describe from prototype:",
  Animal.prototype.describe.call({ name: "Shadow" })
);
console.log("constructor:", rover.constructor === Dog);
console.log(
  "proto === Dog.prototype:",
  Object.getPrototypeOf(rover) === Dog.prototype
);
console.log(
  "proto chain reaches Animal.prototype:",
  Object.getPrototypeOf(Object.getPrototypeOf(rover)) === Animal.prototype
);
