// Text-to-emoji shortcuts. Longer patterns first so they take precedence.
export const EMOJI_SHORTCUTS: { pattern: string; emoji: string }[] = [
  { pattern: "hahaha", emoji: "🤣" },
  { pattern: "haha", emoji: "😂" },
  { pattern: "<3", emoji: "❤️" },
  { pattern: ":')", emoji: "🥲" },
  { pattern: ":'(", emoji: "😢" },
  { pattern: ":-)", emoji: "🙂" },
  { pattern: ":)", emoji: "🙂" },
  { pattern: "(:", emoji: "🙃" },
  { pattern: ":-(", emoji: "🙁" },
  { pattern: ":(", emoji: "🙁" },
  { pattern: ":D", emoji: "😄" },
  { pattern: "xD", emoji: "😆" },
  { pattern: "XD", emoji: "😆" },
  { pattern: ":P", emoji: "😛" },
  { pattern: ":p", emoji: "😛" },
  { pattern: ";)", emoji: "😉" },
  { pattern: ":o", emoji: "😮" },
  { pattern: ":O", emoji: "😮" },
  { pattern: "-_-", emoji: "😑" },
  { pattern: "o_o", emoji: "😳" },
  { pattern: "O_O", emoji: "😳" },
  { pattern: "T_T", emoji: "😭" },
  { pattern: ":|", emoji: "😐" },
  { pattern: ":/", emoji: "😕" },
];

// Replace any shortcut occurrence in text with its emoji.
export function applyEmojiShortcuts(text: string): string {
  let out = text;
  for (const { pattern, emoji } of EMOJI_SHORTCUTS) {
    if (!out.includes(pattern)) continue;
    out = out.split(pattern).join(emoji);
  }
  return out;
}
