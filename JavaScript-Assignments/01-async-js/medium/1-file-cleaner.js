// ## File cleaner
// Read a file, remove all the extra spaces and write it back to the same file.

// For example, if the file input was
// ```
// hello     world    my    name   is       raman
// ```
//
// After the program runs, the output should be
//
// ```
// hello world my name is raman
// ```

// Run with:  node medium/1-file-cleaner.js

const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "messy.txt");

// Seed a messy input file on first run so the script is self-contained.
if (!fs.existsSync(filePath)) {
  fs.writeFileSync(
    filePath,
    "hello     world    my    name   is       raman\n\n\nthis   line    is  also     messy\n"
  );
}

// READ -> TRANSFORM -> WRITE BACK.
//
// The write is nested inside the read callback out of necessity, not style: we
// cannot write the cleaned text until we actually have the original text. That
// data dependency forces the sequencing.
//
// It also makes this a read-modify-write cycle on a single file, which is worth
// naming: if two processes ran this simultaneously, one could overwrite the
// other's result. Real tools avoid that by writing to a temp file and renaming
// (rename is atomic at the filesystem level).
fs.readFile(filePath, "utf-8", (err, data) => {
  if (err) {
    console.error("Could not read the file:", err.message);
    return;
  }

  console.log("Before:\n" + data);

  const cleaned = data
    // \s+  matches one OR MORE consecutive whitespace characters (spaces, tabs,
    //      newlines). The `+` is what does the collapsing — it consumes an
    //      entire run of whitespace as a single match and replaces it with one
    //      space, so ten spaces and one space both become one space.
    // /g   applies it to every occurrence, not just the first. Without the g
    //      flag only the very first run would be collapsed.
    .replace(/\s+/g, " ")
    // The replace above also flattens newlines into spaces, so the whole file
    // becomes one line. trim() then removes the leading/trailing space that a
    // trailing newline in the source would have left behind.
    .trim();

  // Note: if preserving line structure mattered, you would instead split on
  // newlines and collapse each line independently:
  //     data.split("\n").map(line => line.replace(/ +/g, " ").trim()).join("\n")
  // The single-line version is what this assignment's example asks for.

  fs.writeFile(filePath, cleaned + "\n", "utf-8", (writeErr) => {
    if (writeErr) {
      console.error("Could not write the file:", writeErr.message);
      return;
    }
    console.log("After:\n" + cleaned);
    console.log("\nFile cleaned successfully.");
  });
});

console.log("(This logs first — both fs calls are asynchronous.)");
