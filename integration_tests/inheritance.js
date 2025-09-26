function Animal(name) {
  this.name = name;
  this.type = "animal";
}

Animal.prototype.describe = function () {
  return "Animal named " + this.name;
};

Animal.prototype.getType = function () {
  return this.type;
};

function Dog(name, breed) {
  Animal.call(this, name);
  this.breed = breed;
  this.type = "dog";
}

Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;

Dog.prototype.describe = function () {
  return "Dog named " + this.name + " (" + this.breed + ")";
};

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
