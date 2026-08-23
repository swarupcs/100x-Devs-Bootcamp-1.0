const fs = require("fs");
const path = require("path");

function fileReadCallBack(err, data) {
    console.log(data);
}

console.log("started reading");
fs.readFile(path.join(__dirname, "a.txt"), "utf-8", fileReadCallBack);
console.log("finished reading");
console.log("done");

/**
 started reading
finished reading
done
hii!! there
 */