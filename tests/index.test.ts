import { describe, it, expect } from 'vitest'
import { greet, add } from '../src/index.js'

describe('greet', () => {
  it('should return greeting message', () => {
    expect(greet('World')).toBe('Hello, World!')
  })

  it('should handle empty string', () => {
    expect(greet('')).toBe('Hello, !')
  })
})

describe('add', () => {
  it('should add two numbers', () => {
    expect(add(2, 3)).toBe(5)
  })

  it('should handle negative numbers', () => {
    expect(add(-1, 1)).toBe(0)
  })
})
