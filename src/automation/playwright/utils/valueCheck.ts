export function stringValueProvided(value: string): boolean {
  return (
    value !== null && value !== undefined && value !== '' && value !== 'N/A'
  );
}
