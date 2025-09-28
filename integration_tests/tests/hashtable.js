// deno-lint-ignore-file

class HashTable {
  constructor() {
    this.size = 10;
    this.keys = new Array(this.size);
    this.values = new Array(this.size);
  }

  put(key, data) {
    let index = this.hashFunction(key);
    while (this.keys[index] !== undefined) {
      if (this.keys[index] === key) {
        this.values[index] = data;
        return;
      }
      index++;
      index = index % this.size;
    }
    this.keys[index] = key;
    this.values[index] = data;
  }

  get(key) {
    let index = this.hashFunction(key);
    while (this.keys[index] !== undefined) {
      if (this.keys[index] === key) {
        return this.values[index];
      }
      index++;
      index = index % this.size;
    }
    return undefined;
  }

  hashFunction(key) {
    let sum = 0;
    for (let i = 0; i < key.length; i++) {
      sum = sum + key.charCodeAt(i);
    }
    return sum % this.size;
  }
}

const t = new HashTable();
t.put("apple", 10);
t.put("orange", 20);
t.put("banana", 30);
console.log(t.get("orange"));
