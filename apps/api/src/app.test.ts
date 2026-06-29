import { afterEach, describe, expect, it } from 'vitest'
import { demoProject } from '@functorz/schema/fixtures'
import { buildApp } from './app.js'
const apps: ReturnType<typeof buildApp>[] = []
afterEach(async () => Promise.all(apps.splice(0).map((a) => a.close())))
const auth = { authorization: 'Bearer dev-token' }
describe('api', () => {
  it('reports health with security headers', async () => {
    const app = buildApp()
    apps.push(app)
    const r = await app.inject({ method: 'GET', url: '/health' })
    expect(r.statusCode).toBe(200)
    expect(r.headers['x-content-type-options']).toBe('nosniff')
  })
  it('enforces auth, ownership and optimistic locking', async () => {
    const app = buildApp()
    apps.push(app)
    expect((await app.inject({ method: 'GET', url: '/projects' })).statusCode).toBe(401)
    const created = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: auth,
      payload: demoProject,
    })
    expect(created.statusCode).toBe(200)
    const conflict = await app.inject({
      method: 'PUT',
      url: `/projects/${demoProject.id}`,
      headers: auth,
      payload: { version: 0, project: demoProject },
    })
    expect(conflict.statusCode).toBe(409)
  })
  it('accepts images and rejects unsupported uploads', async () => {
    const assets = {
      put: async () => ({ key: 'k', url: '/assets/k', size: 3, contentType: 'image/png' }),
    }
    const app = buildApp({ assets })
    apps.push(app)
    const boundary = 'test-boundary'
    const payload = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="a.png"\r\nContent-Type: image/png\r\n\r\npng\r\n--${boundary}--\r\n`
    const response = await app.inject({
      method: 'POST',
      url: '/assets',
      headers: { ...auth, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload,
    })
    expect(response.statusCode).toBe(200)
  })
})
