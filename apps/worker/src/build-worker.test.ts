import { describe, expect, it } from 'vitest'
import { demoProject } from '@functorz/schema/fixtures'
import { BuildWorker, MockWeChatCiProvider } from './build-worker.js'
describe('build worker', () => {
  it('runs all mock preview stages', async () => {
    const result = await new BuildWorker(new MockWeChatCiProvider()).process({
      id: 'job-1',
      project: demoProject,
      options: { version: '1.0.0', description: 'test' },
    })
    expect(result.status).toBe('success')
    expect(result.stages).toEqual(['queued', 'generating', 'building', 'uploading', 'success'])
    expect(result.qrCode).toMatch(/^data:image/)
  }, 30_000)
})
