const fs = require("fs");
const path = require("path");

const contents = fs.readFileSync(path.join(__dirname, "a.txt"), "utf-8");

console.log(contents);

