// Problem Description – Deep Clone with Circular References
//
// You are required to implement deepClone(obj).
//
// Standard JSON cloning fails for circular references and complex objects.
// Your clone must correctly handle circular dependencies (e.g. obj.self = obj).
//
// Requirements:
// 1. Deeply clone objects and arrays
// 2. Preserve nested structures
// 3. Detect and handle circular references using a WeakMap

function deepClone(value, map = new WeakMap()) {
  // Primitives (number, string, boolean, null, undefined, symbol, bigint) are
  // immutable and copied by value, so they are already their own clone. This is
  // also the recursion's base case.
  if (value === null || typeof value !== "object") {
    return value;
  }

  // --- Circular reference handling -----------------------------------------
  // If we've already cloned this exact object, return the SAME clone we made
  // before rather than cloning it again.
  //
  // This does double duty. It terminates cycles (obj.self = obj would otherwise
  // recurse until the stack overflows), and it preserves shared identity: if two
  // properties point at one object in the source, they still point at ONE object
  // in the clone — the shape of the object graph survives, not just its values.
  if (map.has(value)) {
    return map.get(value);
  }

  // Handle a few built-ins that would otherwise be mangled into plain objects.
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);

  // Create the empty shell FIRST, matching the source's type.
  const clone = Array.isArray(value) ? [] : {};

  // Register it in the map BEFORE recursing into the children. This ordering is
  // the crux of the algorithm: when the recursion below eventually walks back
  // around to this same object, the lookup above must already find it. Register
  // afterwards and the cycle guard never fires.
  map.set(value, clone);

  // Recurse over own enumerable properties, threading the same map through every
  // level so identity is tracked across the whole graph.
  for (const key of Object.keys(value)) {
    clone[key] = deepClone(value[key], map);
  }

  return clone;

  // Why a WeakMap rather than a Map: its keys are held weakly, so registering a
  // huge source object here never prevents it from being garbage collected once
  // the clone is done. A plain Map would keep every visited object alive for as
  // long as the map lived.
  //
  // Why not JSON.parse(JSON.stringify(x)): it throws outright on circular
  // references, silently drops functions and `undefined` values, and converts
  // Dates into strings, Maps/Sets into `{}`, and NaN/Infinity into null.
  // (Modern runtimes also offer structuredClone(), which handles cycles
  // natively — but implementing it by hand is the point of the exercise.)
}

module.exports = deepClone;
