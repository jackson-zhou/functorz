import { describe, expect, it } from 'vitest'
import { demoProject } from '@functorz/schema/fixtures'
import { generateProject, generateZip } from './index.js'
describe('generator', () => {
  it('is deterministic', () =>
    expect([...generateProject(demoProject).files]).toEqual([
      ...generateProject(demoProject).files,
    ]))
  it('creates deterministic zip', async () =>
    expect(await generateZip(demoProject)).toEqual(await generateZip(demoProject)))
  it('rejects unsafe routes', () => {
    const p = structuredClone(demoProject)
    p.pages[0]!.route = '/pages/../bad'
    expect(() => generateProject(p)).toThrow()
  })
  it('contains a standalone Taro runtime and platform configuration', () => {
    const files = generateProject(demoProject).files
    expect(files.has('src/runtime.tsx')).toBe(true)
    expect(files.has('config/index.ts')).toBe(true)
    expect(files.has('src/pages/home/index.tsx')).toBe(true)
    expect(files.get('src/runtime.tsx')).toContain("from '@tarojs/components'")
    expect([...files.keys()].some((path) => path.includes('studio'))).toBe(false)
  })
})
