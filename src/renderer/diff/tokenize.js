export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function normalizeOneLine(text) {
  return text.trim().replace(/\s+/g, " ");
}

export function splitWords(text) {
  const normalized = normalizeOneLine(text);
  return normalized ? normalized.split(" ") : [];
}

export function splitSourceTokens(text) {
  return text.match(/(\s+|\S+)/g) || [];
}
