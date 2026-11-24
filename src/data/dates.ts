/** Today's date as YYYY-MM-DD, in UTC. ISO dates compare correctly as strings. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
