import { useMemo } from "react";
import { splitWords } from "../diff/tokenize.js";
import { diffWords } from "../diff/lcs.js";
import { groupRows } from "../diff/group.js";

export function useDiff(leftText, rightText) {
  return useMemo(() => {
    const leftWords = splitWords(leftText);
    const rightWords = splitWords(rightText);
    const rows = diffWords(leftWords, rightWords);
    const groups = groupRows(rows);
    const changedGroupSet = new Set(rows.filter((row) => row.group).map((row) => row.group));
    return {
      rows,
      groups,
      leftWordCount: leftWords.length,
      rightWordCount: rightWords.length,
      changedGroupCount: changedGroupSet.size,
      changedRowCount: rows.filter((row) => row.type !== "equal").length
    };
  }, [leftText, rightText]);
}
