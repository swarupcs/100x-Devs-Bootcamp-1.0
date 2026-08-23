// let counter = 0;

// function callback() {
//     console.log(counter);
//     counter = counter + 1;
// }

// setInterval(callback, 1000);


/**

0
1
2
3
4
5
6
7
8
9
...
*/

let counter = 0;

function callback() {
    console.log(counter);
    counter = counter + 1;
}

setInterval(callback, 1000);

let x = 0;
for(let i = 0; i < 1000000; i++) {
    x = x + i;
}
console.log(x);

/**
 Output :
 499999500000
 0
 1
 2
 ...
 */