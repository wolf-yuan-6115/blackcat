export default function (url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (_error: unknown) {
    return false;
  }
}
