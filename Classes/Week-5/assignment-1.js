/**
 * 1. Reads the contents of a file
2. Trims the extra space from the left and right
3. Writes it back to the file
 * 
 * 
 */

// Approach-1 (Callback based sync approach)

const fs = require('fs');

// function cleanFile(filePath, cb) {
//     let contents = fs.readFileSync(filePath, "utf-8")
//     const trimmedContents = contents.trim();
//     fs.writeFileSync(filePath, trimmedContents, "utf-8");
//     cb();
// }

// cleanFile(__dirname + "/a.txt", function () {
//     console.log("File cleaned successfully");
// });

// Approach-2


// function cleanFile(filePath, cb) {
//     fs.readFile(filePath, "utf-8", function (err, contents) {
//         if (err) {
//             console.error(err);
//             return;
//         }
//         const trimmedContents = contents.trim();
//         fs.writeFile(filePath, trimmedContents, function () {
//             cb();
//         });
//     });
// }


// cleanFile(__dirname + "/a.txt", function () {
//     console.log("File cleaned successfully");
// })



// Approach - 3 (promisified version, no async-await)

// function cleanFile(filePath) {
//     return new Promise(function(resolve, reject) {
//         fs.readFile(filePath, "utf-8", function(err, contents) {
//             if(err) {
//                 reject(err);
//             }
//             else {
//                 const trimmedContents = contents.trim();
//                 fs.writeFile(filePath, trimmedContents, "utf-8", function(err) {
//                     if(err) {
//                         reject(err);
//                     }
//                     else {
//                         resolve();
//                     }
//                 });
//             }
//         });
//     });
// }


// cleanFile(__dirname + "/a.txt").then(function () {
//     console.log("File cleaned successfully");
// })
// .catch(function() {
//     console.log("Error cleaning file");
// })
// .finally(function() {
//     console.log("Finally block");
// })



// Approach - 4  - (Promise based, using async-await)


async function cleanFile(filePath) {
    const contents = await fs.readFile(filePath, "utf-8");
    const trimmedContents = contents.trim();
    await fs.writeFile(filePath, trimmedContents, "utf-8");
}


cleanFile(__dirname + "/a.txt").then(function () {
    console.log("File cleaned successfully");
})
.catch(function() {
    console.log("Error cleaning file");
})
.finally(function() {
    console.log("Finally block");
})
