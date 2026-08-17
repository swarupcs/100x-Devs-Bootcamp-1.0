// Problem Description – Rotting Oranges Grid Monitor (BFS + Async)
//
// You are given a grid where:
// 2 = rotten orange, 1 = fresh orange, 0 = empty cell.
//
// Rot spreads to adjacent fresh oranges (up, down, left, right) every minute.
// Your task is to implement timeToRot(grid).
//
// Requirements:
// 1. Use BFS level-by-level traversal
// 2. Each BFS level (minute) must be processed as an async step using await
// 3. Return the minimum time required to rot all oranges, or -1 if impossible

async function timeToRot(grid) {
  const rows = grid.length;
  const cols = grid[0].length;

  // BFS frontier: every cell that became rotten in the most recent minute.
  //
  // Why BFS and not DFS: rot spreads outward from ALL rotten cells at the same
  // rate, one ring per minute. BFS explores in exactly that order — level by
  // level — so the level number IS the elapsed time. DFS would dive down one
  // path first and give no meaningful notion of "minutes".
  let queue = [];
  let freshCount = 0;

  // Seed the frontier with every initially-rotten orange at once. This is a
  // MULTI-SOURCE BFS: several sources expand simultaneously, and each fresh
  // orange is naturally reached by whichever source is nearest — which is what
  // makes the answer the true minimum rather than the distance from one
  // arbitrary source.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 2) queue.push([r, c]);
      else if (grid[r][c] === 1) freshCount++;
    }
  }

  // No fresh oranges means the job is already done — zero minutes.
  // (Checked before the loop so a grid of only rotten/empty cells returns 0.)
  if (freshCount === 0) return 0;

  const directions = [
    [-1, 0], // up
    [1, 0], // down
    [0, -1], // left
    [0, 1], // right
  ];

  let minutes = 0;

  // Each iteration of this loop is exactly one minute.
  while (queue.length > 0 && freshCount > 0) {
    // Yield to the event loop between levels, as the task requires. In a real
    // "grid monitor" this is where you would await a tick, push a progress
    // update to a UI, or persist the intermediate state — and on a large grid it
    // keeps a long BFS from blocking everything else.
    await new Promise((resolve) => setTimeout(resolve, 0));

    minutes++;

    // Build the NEXT frontier from scratch rather than pushing onto the current
    // one. Keeping the levels in separate arrays is what makes the level
    // boundary — and therefore the minute count — unambiguous.
    const nextQueue = [];

    for (const [r, c] of queue) {
      for (const [dr, dc] of directions) {
        const nr = r + dr;
        const nc = c + dc;

        // Skip out-of-bounds, empty cells, and cells that are already rotten.
        // That last check doubles as the "visited" set: marking a cell as 2 both
        // records the state change and guarantees we never process it twice, so
        // no separate visited structure is needed.
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (grid[nr][nc] !== 1) continue;

        grid[nr][nc] = 2;
        freshCount--;
        nextQueue.push([nr, nc]);
      }
    }

    queue = nextQueue;
  }

  // If any fresh orange is left, it was unreachable — walled off by empty cells
  // with no rotten neighbour path. The spread has stopped and it never will rot.
  return freshCount === 0 ? minutes : -1;
}

module.exports = timeToRot;
