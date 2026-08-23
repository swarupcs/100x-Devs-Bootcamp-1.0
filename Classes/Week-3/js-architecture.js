// function sum (a, b) {
//     return a + b;
// }


// function sub(a, b) {
//     sum(a, b);
//     return a - b;
// }


// let x = sum(1, 2);
// let y = sub(1, 2);

// console.log(x);
// console.log(y);


function callback() {
    console.log("Callback function is called");
}

setTimeout(callback, 1000);
setTimeout(callback, 2000);
setTimeout(callback, 3000);
setTimeout(callback, 4000);


let x = 0;
for(let i = 0; i < 1000000; i++) {
    x = x + i;
}
console.log(x);