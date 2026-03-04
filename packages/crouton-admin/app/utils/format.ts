export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString()
}
