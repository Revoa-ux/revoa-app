import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
    expect(cn('foo', undefined, 'bar', null)).toBe('foo bar');
    expect(cn('foo', false && 'bar', true && 'baz')).toBe('foo baz');
  });

  it('handles conditional classes', () => {
    const result = cn(
      'base',
      { 'is-active': true },
      { 'is-disabled': false }
    );
    expect(result).toBe('base is-active');
  });

  it('handles array inputs', () => {
    const result = cn(['foo', 'bar'], ['baz']);
    expect(result).toBe('foo bar baz');
  });

  it('handles Tailwind classes correctly', () => {
    const result = cn(
      'px-4 py-2',
      'text-sm font-medium',
      {
        'bg-blue-500': true,
        'text-white': true,
        'opacity-50': false
      }
    );
    expect(result).toBe('px-4 py-2 text-sm font-medium bg-blue-500 text-white');
  });

  it('handles empty or falsy inputs', () => {
    expect(cn('')).toBe('');
    expect(cn(null)).toBe('');
    expect(cn(undefined)).toBe('');
    expect(cn(false)).toBe('');
  });

  it('deduplicates class names', () => {
    const result = cn('foo', 'foo', 'bar', 'bar');
    expect(result).toBe('foo bar');
  });
});