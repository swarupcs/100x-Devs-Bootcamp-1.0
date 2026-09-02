/**
 What if I tell you, given an input array, give me back all the eveb values from it
 */

// Example
// input: [1, 2, 3, 4] output: [2, 4]

const input = [1, 2, 3, 4];
const newArray = [];

for (let i = 0; i < input.length; i++) {
    if (input[i] % 2 === 0) {
        newArray.push(input[i]);
    }
}

console.log(newArray);

const ans = input.filter(function (n) {
    if (n % 2 === 0) {
        return true;
    }
    else {
        return false;
    }
})
console.log(ans);


// Now using filter function
// Filter takes a function as an argument

function isEven(element) {
    return element % 2 === 0;
}
const newArrayFilter = input.filter(isEven);
console.log(newArrayFilter);

// Now using filter function with arrow function
const newArrayFilterArrow = input.filter((element) => element % 2 === 0);
console.log(newArrayFilterArrow);

// Now using filter function with arrow function and inline 
const newArrayFilterArrowInline = input.filter((element) => {
    return element % 2 === 0;
});
console.log(newArrayFilterArrowInline);


// create a map function that takes an array and a transform function as input and returns the transformed array as output

function map(array, fn) {
  const newArray = [];
  for (let i = 0; i < array.length; i++) {
    newArray.push(fn(array[i]));
  }
  return newArray;
}


console.log(map([1, 2, 3, 4], (element) => element * 2));
// Output: [ 2, 4, 6, 8 ]

