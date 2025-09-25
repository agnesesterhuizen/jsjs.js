function quickSort(arr) {
  if (arr.length <= 1) {
    return arr;
  }

  const pivot = arr[Math.floor(arr.length / 2)];
  const left = [];
  const right = [];
  const equal = [];

  for (let i = 0; i < arr.length; i++) {
    const el = arr[i];

    if (el < pivot) {
      left.push(el);
    } else if (el > pivot) {
      right.push(el);
    } else {
      equal.push(el);
    }
  }

  return quickSort(left).concat(equal).concat(quickSort(right));
}

console.log(quickSort([3, 6, 8, 10, 1, 2, 1]));
