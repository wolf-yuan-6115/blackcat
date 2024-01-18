// https://github.com/jer-0/seconds-to-duration.js/blob/main/index.ts

export default function secondsToDuration(seconds: number, delimiter = ":"): string {
  return [Math.floor(seconds / 60 / 60), Math.floor((seconds / 60) % 60), Math.floor(seconds % 60)]
    .join(delimiter)
    .replace(/\b(\d)\b/g, "0$1")
    .replace(/^00:/, "");
}
