const obj = {
  x: {
    y: {
      z: 42,
      fn() {
        return "called!";
      },
    },
  },
};

const nil = null;

// --- Member expressions
console.log("obj?.x?.y?.z:", obj?.x?.y?.z); // 42
console.log("obj?.missing?.z:", obj?.missing?.z); // undefined
console.log("nil?.x:", nil?.x); // undefined

// --- Mixed (optional member + call)
console.log("obj?.x?.y.fn():", obj?.x?.y.fn()); // "called!"

// --- Nested deeper
console.log("obj?.x?.y?.missing?.fn:", obj?.x?.y?.missing?.fn); // undefined

// TODO: optional calls like obj?.x?.y?.fn?.()
