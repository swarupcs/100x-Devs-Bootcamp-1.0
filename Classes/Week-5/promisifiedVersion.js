// Create a promisified version of fs.readFile
// Create a promisified version of fs.setTimeout
// Create a promisified version of fs.writeFile

const fs = require('fs');

function fsReadFilePromisified(fileName, encoding) {
    return new Promise(function(resolve, reject) {
        fs.readFile(fileName, encoding, function(err, data) {
            if(err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
}

fsReadFilePromisified(__dirname + '/a.txt', 'utf-8')
  .then(function (data) {
    console.log(data);
  })
  .catch(function (err) {
    console.log(err);
  });

function setTimeoutPromisified(delay) {
    return new Promise(function (resolve, reject) {
        setTimeout(function() {
            resolve();
        }, delay)
    })

}


setTimeoutPromisified(1000).then(function() {
    console.log("1 second passed")
});


/**
 Let  you have fsReadFilePromisified and fsWriteFilePromisified with you , 
 now implement fsReadAndWriteFilePromisified (file_name,file_content,delay) , so it read the file write the content in it after the delay.
 Use the function which i have given you and don't use fs native function. 
 */


 function fsWriteFilePromisified(fileName, fileContent) {
    return new Promise(function(resolve, reject) {
        fs.writeFile(fileName, fileContent, function(err) {
            if(err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
 }

 function fsReadAndWriteFilePromisified(filePath, encoding) {
    return new Promise(function (resolve, reject) {
        fsReadFilePromisified(filePath, encoding)
        .then*function(contents) {
            contents = contents.toUpperCase();
            fsWriteFilePromisified(filePath, contents);
            resolve();
        }
    })
 }

 fsReadAndWriteFilePromisified(__dirname + '/a.txt', 'utf-8')
  .then(function () {
    console.log('File read and written successfully');
  })
  .catch(function (err) {
    console.log(err);
  });

  /**
   * 
   * resolve a promise multiple times -> it only resolve once
   */

  let p = new Promise((resolve)=> {
    resolve("1")
    resolve("2")
    resolve("3")
  })

  p.then((data) => {
    console.log("promise resolved " + data)
  })


  /**
   * 
   * finally with promises
   */

  function setTimeoutPromisified(delay) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        resolve();
      }, delay);
    });
  }

  setTimeoutPromisified(1000).then(function () {
    console.log('1 second passed');
  })
  .catch(function() {
    console.log("Error handled")
  })
  .finally(function () {
    console.log("Finally block");
  })
