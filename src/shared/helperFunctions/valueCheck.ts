export function stringValueProvided(value: string | null): value is string {
  return (
    value !== null && value !== undefined && value !== '' && value !== 'N/A'
  );
}
