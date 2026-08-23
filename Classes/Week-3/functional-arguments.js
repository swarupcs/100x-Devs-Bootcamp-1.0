function sum(a, b) {
    return a + b;
}

function sub(a, b) {
    return a - b;
}


function doArithmetic(a, b, fn) {
    return fn(a, b);
}


const ans1 = doArithmetic(1, 2, sum);
const ans2 = doArithmetic(1, 2, sub);
console.log(ans1, ans2);