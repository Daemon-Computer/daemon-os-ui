export function formatTimestamp(timestampMs: string | undefined | null): string {
  if (!timestampMs) return 'N/A';
  try {
    const date = new Date(parseInt(timestampMs));
    if (isNaN(date.getTime())) return 'Invalid Date'; // Check if date is valid
    // Example format: "4/17/2024, 2:30:15 PM"
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
  } catch (e) {
    return 'Invalid Date - ' + e;
  }
}
