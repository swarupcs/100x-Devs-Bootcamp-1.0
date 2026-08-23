const fs = require("fs");
const path = require("path");

function fileReadCallBack(err, data) {
    console.log(data);
}

console.log("started reading");
fs.readFile(path.join(__dirname, "a.txt"), "utf-8", fileReadCallBack);
console.log("finished reading");
console.log("done");

let s = 0;

for (let i = 0; i < 10000000; i++) {
    s += i;
}

console.log(s);

/**
started reading
finished reading
done
49999995000000
hii!! there
 */