// given an array, given me back a new array in which value is multiplied by 2

//Example
// input: [1, 2, 3, 4]  output: [2, 4, 6, 8]

const input = [1, 2, 3, 4];
const newArray = [];

for (let i = 0; i < input.length; i++) {
    newArray.push(input[i] * 2);
}

console.log(newArray);



// Now using map function
// Map takes a function as an argument

function double(element) {
    return element * 2;
}
const newArrayMap = input.map(double);
console.log(newArrayMap);

// Now using map function with arrow function
const newArrayMapArrow = input.map((element) => element * 2);
console.log(newArrayMapArrow);

// create a map function that takes 2 inputs an array, and a transformation callback/function, and transforms the array into a new one using the transformation function

function map(array, fn) {
    const newArray = [];
    for (let i = 0; i < array.length; i++) {
        newArray.push(fn(array[i]));
    }
    return newArray;
}


console.log(map(input, (element) => element * 2));
