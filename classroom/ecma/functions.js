function sumAll(...args) {
  let sum = 0;
  for (let i = 0; i < args.length; i++) {
    sum += args[i];
  }
  return sum;
}

console.log(sumAll());           // [] -> args | Output: 0
console.log(sumAll(1));          // [1] -> args | Output: 1
console.log(sumAll(1, 2, 3, 4)); // [1, 2, 3, 4] -> args | Output: 10

function sumAllArgs() {
  let sum = 0;
  for (let i = 0; i < arguments.length; i++) {
    sum += arguments[i];
  }
  return sum;
}
