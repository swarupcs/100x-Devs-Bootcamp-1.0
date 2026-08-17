/*
  Implement a class `Todo` having below methods
    - add(todo): adds todo to list of todos
    - remove(indexOfTodo): remove todo from list of todos
    - update(index, updatedTodo): update todo at given index
    - getAll: returns all todos
    - get(indexOfTodo): returns todo at given index
    - clear: deletes all todos

  Once you've implemented the logic, test your code by running
  - `npm run test-todo-list`
*/

class Todo {
  constructor() {
    // Each instance gets its OWN array. Declaring it in the constructor (rather
    // than on the prototype or as a shared module-level variable) is what keeps
    // two Todo lists independent — a shared array would have every instance
    // silently mutating the same data.
    this.todos = [];
  }

  add(todo) {
    // No de-duplication: adding the same text twice is legitimate, because two
    // separate tasks can genuinely have the same description ("Task 1" appearing
    // twice is a valid list, not an error).
    this.todos.push(todo);
  }

  remove(indexOfTodo) {
    // Bounds check first. The tests call remove(5) on a 2-item list and expect
    // the list to be untouched, so an out-of-range index is a silent no-op
    // rather than an error.
    //
    // Without this guard, splice() would do something quietly wrong rather than
    // nothing: splice(-1, 1) removes the LAST element, so a negative index would
    // delete the wrong item instead of being ignored.
    if (!this._isValidIndex(indexOfTodo)) return;

    // splice(index, 1) removes exactly one element AND closes the gap, shifting
    // everything after it down by one. That re-indexing is the behaviour the
    // tests rely on: after remove(1) on [A, B, C], 'Task 3' becomes index 1.
    //
    // Contrast `delete this.todos[i]`, which would leave a hole — the array
    // length would stay 3 and index 1 would read back as `undefined`.
    this.todos.splice(indexOfTodo, 1);
  }

  update(index, updatedTodo) {
    // Same guard, and it matters even more here: assigning to an out-of-range
    // index (this.todos[5] = x on a 3-item array) does not throw — it silently
    // grows the array and leaves empty slots behind, corrupting the list.
    if (!this._isValidIndex(index)) return;

    this.todos[index] = updatedTodo;
  }

  getAll() {
    // A defensive COPY, not the internal array itself.
    //
    // Returning `this.todos` directly would hand the caller a live reference to
    // our private state — they could push or splice it and mutate the list
    // behind the class's back, bypassing every guard above. Returning a copy
    // keeps the encapsulation honest.
    //
    // This is a shallow copy, which is exactly right here since the elements are
    // strings (immutable primitives).
    return [...this.todos];
  }

  get(indexOfTodo) {
    // The tests require `null` for an out-of-range index, not `undefined`.
    //
    // The distinction is meaningful: `undefined` is what JavaScript hands back
    // when you read a slot that was never set, whereas an explicit `null`
    // communicates a deliberate "we looked, and there is nothing there."
    if (!this._isValidIndex(indexOfTodo)) return null;

    return this.todos[indexOfTodo];
  }

  clear() {
    // Reassigning to a fresh array is preferable to `this.todos.length = 0`
    // here: any copy previously handed out by getAll() is already independent,
    // and a new array avoids surprising anyone still holding the old reference.
    this.todos = [];
  }

  // Shared validation, factored out so every mutating method enforces exactly
  // the same rule. Centralising it means a future change to the bounds logic
  // can't accidentally be applied to two of the three call sites.
  //
  // The leading underscore is the conventional signal for "internal — not part
  // of the public API."
  _isValidIndex(index) {
    return Number.isInteger(index) && index >= 0 && index < this.todos.length;
  }
}

module.exports = Todo;
