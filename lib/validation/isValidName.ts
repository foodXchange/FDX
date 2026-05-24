const VOWELS = /[aeiouAEIOUאוי]/;

export function isValidName(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 2 || trimmed.length > 60) return false;

  const allSameChar = trimmed.length > 3 && new Set(trimmed.toLowerCase()).size === 1;
  const hasVowel = VOWELS.test(trimmed);
  const isShort = trimmed.length <= 4;

  if (allSameChar) return false;
  if (!hasVowel && !isShort && trimmed.length > 5) return false;
  return true;
}
