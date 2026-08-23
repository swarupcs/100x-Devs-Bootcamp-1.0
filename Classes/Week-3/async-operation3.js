const a = 1;
const b = 2;

console.log(a);
console.log(b);

// wait for 1 second
// let beforeTime = Date.now();
// for(let i = 0; i < 100000000; i++) {
//     let currentTime = Date.now();
//     if(currentTime - beforeTime >= 1000) {
//         console.log("1 second passed");
//         break;
//     }
// }

// console.log(a + b);


// Async way

// function callback() {
//   console.log(a + b);
// }

// setTimeout(callback, 1000);


let sum = 0;
function callback() {
    // console.log(a + b);
    for(let i = 0; i < 100000000; i++) {
        sum += i;
    }
    console.log(sum);
}

setTimeout(callback, 1000);

