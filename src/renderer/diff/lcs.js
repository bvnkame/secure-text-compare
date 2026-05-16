function buildLcsMatrix(left, right) {
  const matrix = Array.from({ length: left.length + 1 }, () => new Uint32Array(right.length + 1));

  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      matrix[i][j] = left[i] === right[j]
        ? matrix[i + 1][j + 1] + 1
        : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
    }
  }

  return matrix;
}

export function diffWords(left, right) {
  const matrix = buildLcsMatrix(left, right);
  const rows = [];
  let i = 0;
  let j = 0;
  let group = 0;

  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) {
      rows.push({
        type: "equal",
        left: left[i],
        right: right[j],
        leftIndex: i + 1,
        rightIndex: j + 1
      });
      i += 1;
      j += 1;
      continue;
    }

    group += 1;
    const removed = [];
    const added = [];
    const startLeft = i + 1;
    const startRight = j + 1;

    while (i < left.length || j < right.length) {
      if (i < left.length && j < right.length && left[i] === right[j]) {
        break;
      }

      if (j >= right.length || (i < left.length && matrix[i + 1][j] >= matrix[i][j + 1])) {
        removed.push({ text: left[i], index: i + 1 });
        i += 1;
      } else {
        added.push({ text: right[j], index: j + 1 });
        j += 1;
      }
    }

    const max = Math.max(removed.length, added.length);
    for (let index = 0; index < max; index += 1) {
      const leftItem = removed[index] || null;
      const rightItem = added[index] || null;
      rows.push({
        type: leftItem && rightItem ? "changed" : leftItem ? "removed" : "added",
        group,
        startLeft,
        startRight,
        removedCount: removed.length,
        addedCount: added.length,
        left: leftItem ? leftItem.text : "",
        right: rightItem ? rightItem.text : "",
        leftIndex: leftItem ? leftItem.index : null,
        rightIndex: rightItem ? rightItem.index : null
      });
    }
  }

  return rows;
}
