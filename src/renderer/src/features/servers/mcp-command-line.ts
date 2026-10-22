/**
 * The one "URL or command" line of the MCP form, and the words it stands for.
 *
 * A web address is a Streamable HTTP server. Anything else is a STDIO command line: the first word
 * is the program and the rest are its arguments. The line follows shell rules for quotes, so
 * `npx -y "@acme/my server"` is three words. A backslash escapes a space, a quote or another
 * backslash; before any other character it stays, so a Windows path such as `C:\tools\mcp.exe`
 * reads as typed.
 */

const NEEDS_QUOTES = /[\s"'\\]/;
const ESCAPABLE = /[\s"'\\]/;

/** Splits a command line into words. An unclosed quote runs to the end of the line. */
export function splitCommandLine(line: string): string[] {
  const words: string[] = [];
  let word = "";
  let inWord = false;
  let quote: '"' | "'" | null = null;
  for (let index = 0; index < line.length; index += 1) {
    const char = line.charAt(index);
    if (quote === "'") {
      if (char === "'") quote = null;
      else word += char;
      continue;
    }
    if (char === "\\") {
      const next = line.charAt(index + 1);
      const escapes = quote === '"' ? next === '"' || next === "\\" : next !== "" && ESCAPABLE.test(next);
      if (escapes) {
        word += next;
        index += 1;
      } else word += char;
      inWord = true;
      continue;
    }
    if (quote === '"') {
      if (char === '"') quote = null;
      else word += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      inWord = true;
      continue;
    }
    if (/\s/.test(char)) {
      if (inWord) words.push(word);
      word = "";
      inWord = false;
      continue;
    }
    word += char;
    inWord = true;
  }
  if (inWord) words.push(word);
  return words;
}

/** Joins words into one line that `splitCommandLine` reads back as the same words. */
export function joinCommandLine(words: readonly string[]): string {
  return words
    .map((word) => (word !== "" && !NEEDS_QUOTES.test(word) ? word : `"${word.replace(/[\\"]/g, "\\$&")}"`))
    .join(" ");
}
