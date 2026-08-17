/**
 Write a promisified function that takes a file prefix as an input (a)
 and cleans ({prefix}1.txt, {prefix}2.txt, {prefix}3.txt, etc) of all the files
 */

const fs = require('fs').promises;
const path = require('path');


function cleanFile(filePath) {
    return new Promise(function(resolve, reject) {
        fs.readFile(filePath, 'utf-8', function (err, contents) {
            if(err) {
                reject();
            } else {
                const trimmedContents = contents.trim();
                fs.writeFile(filePath, trimmedContents, 'utf-8', function(err) {
                    if(err) {
                        reject();
                    }
                    else {
                        resolve();
                    }
                });
            }
        })
    })
}

// async function cleanFile(filePath) {
//     const contents = await fs.readFile(filePath, "utf-8");
//     const trimmedContents = contents.trim();
//     await fs.writeFile(filePath, trimmedContents, "utf-8");
// }


// Approach - 1
// function cleanManyFiles(prefix) {
//     return new Promise(async function(resolve, reject) {
//         try {
//             await cleanFile(path.join(__dirname, prefix + "1.txt"));
//             await cleanFile(path.join(__dirname, prefix + "2.txt"));
//             await cleanFile(path.join(__dirname, prefix + "3.txt"));
//             resolve();
//         } catch (e) {
//             reject(e);  
//         }
//     });
// }





cleanManyFiles("a").then(function () {
    console.log("all 3 files have been cleaned");
})
.catch(function(err) {
    console.log(err);
})
.finally(function() {
    console.log("Finally block");
})


let p = cleanManyFiles("a");
console.log(p);
