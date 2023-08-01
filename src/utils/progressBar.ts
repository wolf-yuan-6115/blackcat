export default function createProgressBar(
  current: number,
  total: number,
  charFilled = "▰",
  charEmpty = "▱",
  size = 20,
): string {
  if (current >= total) {
    return charFilled.repeat(size);
  }

  const percent = current / total;
  const filled = Math.round(size * percent);
  return charFilled.repeat(filled) + charEmpty.repeat(size - filled);
}
