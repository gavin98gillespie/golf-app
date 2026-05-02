import { Filter } from 'bad-words';

const filter = new Filter();

// App-specific additions; extend as needed.
filter.addWords('test_blocked_word');

export function containsProfanity(input: string): boolean {
  if (!input) return false;
  return filter.isProfane(input);
}

export function explainProfanity(input: string): string | null {
  return containsProfanity(input) ? 'That contains language not allowed here.' : null;
}
