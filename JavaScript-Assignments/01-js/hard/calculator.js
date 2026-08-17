/*
  Implement a class `Calculator` having below methods
    - initialise a result variable in the constructor and keep updating it after every arithmetic operation
    - add: takes a number and adds it to the result
    - subtract: takes a number and subtracts it from the result
    - multiply: takes a number and multiply it to the result
    - divide: takes a number and divide it to the result
    - clear: makes the `result` variable to 0
    - getResult: returns the value of `result` variable
    - calculate: takes a string expression which can take multi-arithmetic operations and give its result
      example input: `10 +   2 *    (   6 - (4 + 1) / 2) + 7`
      Points to Note:
        1. the input can have multiple continuous spaces, you're supposed to avoid them and parse the expression correctly
        2. the input can have invalid non-numerical characters like `5 + abc`, you're supposed to throw error for such inputs

  Once you've implemented the logic, test your code by running
  - `npm run test-calculator`
*/

class Calculator {
  constructor() {
    // A single accumulator that every operation mutates — this is the classic
    // desk-calculator model, where each keypress transforms a running total.
    this.result = 0;
  }

  // --- Simple accumulator operations ---------------------------------------

  add(num) {
    this.result += num;
  }

  subtract(num) {
    this.result -= num;
  }

  multiply(num) {
    this.result *= num;
  }

  divide(num) {
    // Guard BEFORE mutating. This ordering matters: JavaScript would happily
    // evaluate 3 / 0 as Infinity rather than throwing, and once Infinity lands
    // in `result` it poisons every subsequent operation (Infinity - 5 is still
    // Infinity). Throwing first leaves the accumulator untouched, which is why
    // the test can assert the result is still 3 after a failed divide.
    if (num === 0) {
      throw new Error("Division by zero is not allowed");
    }
    this.result /= num;
  }

  clear() {
    this.result = 0;
  }

  getResult() {
    return this.result;
  }

  // --- Expression evaluation -------------------------------------------------

  calculate(expression) {
    const tokens = this._tokenize(expression);

    // Parsing starts at position 0 and consumes tokens as it goes. The cursor is
    // held on `this` so the mutually-recursive parse methods below can share it.
    this._tokens = tokens;
    this._position = 0;

    const value = this._parseExpression();

    // If the parser stopped before consuming everything, the leftovers are
    // garbage — this is what catches a stray closing paren like '10 + 2) + 3'.
    // Without the check, the parser would happily evaluate '10 + 2', ignore the
    // rest, and return a plausible-looking wrong answer.
    if (this._position < this._tokens.length) {
      throw new Error(`Unexpected token: ${this._tokens[this._position]}`);
    }

    this.result = value;
    return value;
  }

  // --- Step 1: Tokenizer -----------------------------------------------------
  //
  // Turn the raw string into a flat list of meaningful symbols: numbers,
  // operators, and parentheses. Doing this as a separate pass is what makes the
  // parser below simple — it never has to think about characters or whitespace.
  _tokenize(expression) {
    if (typeof expression !== "string") {
      throw new Error("Expression must be a string");
    }

    const tokens = [];
    let i = 0;

    while (i < expression.length) {
      const char = expression[i];

      // Whitespace carries no meaning, so it is simply skipped. Because we skip
      // in a loop rather than matching a single space, runs of consecutive
      // spaces are handled automatically — that's requirement 1.
      if (char === " " || char === "\t" || char === "\n") {
        i++;
        continue;
      }

      // Operators and parentheses are single-character tokens.
      if ("+-*/()".includes(char)) {
        tokens.push(char);
        i++;
        continue;
      }

      // A number: consume every consecutive digit and at most one decimal point.
      // Multi-digit numbers are why we scan ahead here instead of treating each
      // character as its own token — '15' must become one token, not '1','5'.
      if (this._isDigit(char) || char === ".") {
        let numberText = "";
        let seenDot = false;

        while (i < expression.length) {
          const c = expression[i];
          if (this._isDigit(c)) {
            numberText += c;
            i++;
          } else if (c === "." && !seenDot) {
            // The `seenDot` flag rejects malformed literals like '1.2.3'.
            seenDot = true;
            numberText += c;
            i++;
          } else {
            break;
          }
        }

        const value = Number(numberText);
        if (Number.isNaN(value)) {
          throw new Error(`Invalid number: ${numberText}`);
        }

        tokens.push(value);
        continue;
      }

      // Anything else — a letter, a symbol, anything unrecognised — is invalid.
      // This is requirement 2, and validating here rather than during parsing
      // means '5 + abc' is rejected up front with a precise message, instead of
      // silently becoming NaN and propagating through the arithmetic. (NaN never
      // throws; it just quietly contaminates every result it touches, which is
      // exactly the failure mode we want to avoid.)
      throw new Error(`Invalid character in expression: ${char}`);
    }

    if (tokens.length === 0) {
      throw new Error("Empty expression");
    }

    return tokens;
  }

  _isDigit(char) {
    return char >= "0" && char <= "9";
  }

  // --- Step 2: Recursive-descent parser --------------------------------------
  //
  // Three mutually recursive methods, one per precedence level. The GRAMMAR is
  // what encodes operator precedence — there is no precedence table anywhere:
  //
  //   expression := term (('+' | '-') term)*        <- lowest precedence
  //   term       := factor (('*' | '/') factor)*    <- binds tighter
  //   factor     := number | '(' expression ')' | '-' factor
  //
  // Because `expression` can only combine whole `term`s, and a `term` greedily
  // absorbs all its `*` and `/` operands first, '2 + 3 * 4' necessarily parses
  // as 2 + (3 * 4) = 14 rather than (2 + 3) * 4 = 20. Precedence falls out of
  // the structure for free.
  //
  // And because the loops are left-to-right, operators of equal precedence are
  // left-associative — '10 - 4 - 3' is (10 - 4) - 3 = 3, not 10 - (4 - 3) = 9.

  _parseExpression() {
    let value = this._parseTerm();

    while (this._peek() === "+" || this._peek() === "-") {
      const operator = this._next();
      const right = this._parseTerm();
      value = operator === "+" ? value + right : value - right;
    }

    return value;
  }

  _parseTerm() {
    let value = this._parseFactor();

    while (this._peek() === "*" || this._peek() === "/") {
      const operator = this._next();
      const right = this._parseFactor();

      if (operator === "*") {
        value *= right;
      } else {
        // Same reasoning as the divide() method: fail loudly rather than letting
        // Infinity leak into the result.
        if (right === 0) {
          throw new Error("Division by zero is not allowed");
        }
        value /= right;
      }
    }

    return value;
  }

  _parseFactor() {
    const token = this._next();

    // Unary minus, so expressions like '-5 + 3' or '2 * -3' work. It recurses
    // into _parseFactor (not _parseTerm) so that '-2 * 3' parses as (-2) * 3 —
    // the negation binds only to the immediately following factor.
    if (token === "-") {
      return -this._parseFactor();
    }

    // A parenthesised sub-expression: recurse back to the TOP of the grammar,
    // which is what lets parentheses override precedence to any nesting depth.
    if (token === "(") {
      const value = this._parseExpression();

      // The matching ')' must be here. This check is what catches unbalanced
      // input like '10 + (2 + 3' — we ran out of tokens while still inside a
      // group.
      if (this._next() !== ")") {
        throw new Error("Mismatched parentheses: expected ')'");
      }

      return value;
    }

    if (typeof token === "number") {
      return token;
    }

    // Reaching here means we found an operator or a ')' where a value belonged —
    // this is what rejects ')10 + 2('.
    throw new Error(`Unexpected token: ${token}`);
  }

  // --- Cursor helpers --------------------------------------------------------

  // Look at the current token without consuming it. Returns undefined past the
  // end, which conveniently terminates the while-loops above.
  _peek() {
    return this._tokens[this._position];
  }

  // Consume and return the current token, advancing the cursor.
  _next() {
    return this._tokens[this._position++];
  }
}

module.exports = Calculator;
