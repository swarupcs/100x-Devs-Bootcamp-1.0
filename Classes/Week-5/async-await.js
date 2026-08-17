const fs = require('fs');

function fsReadFilePromisified(fileName, encoding) {
  return new Promise(function (resolve, reject) {
    fs.readFile(fileName, encoding, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

// Problem

fsReadFilePromisified(__dirname + '/a.txt', 'utf-8').then(function (data) {
  console.log(data);
  fsReadFilePromisified(__dirname + '/b.txt', 'utf-8').then(function (data) {
    console.log(data);
    fsReadFilePromisified(__dirname + '/c.txt', 'utf-8').then(function (data) {
      console.log(data);
    });
  });
});


// Solution

async function main() {
    let file1Contents = await fsReadFilePromisified("a.txt", "utf-8");
    let file2Contents = await fsReadFilePromisified("b.txt", "utf-8");
    let file3Contents = await fsReadFilePromisified("c.txt", "utf-8");


    console.log(file1Contents);
    console.log(file2Contents);
    console.log(file3Contents);
}

main();