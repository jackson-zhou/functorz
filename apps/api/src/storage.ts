import { mkdir, writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
export interface Asset {
  key: string
  url: string
  size: number
  contentType: string
}
export interface AssetProvider {
  put(ownerId: string, name: string, contentType: string, data: Uint8Array): Promise<Asset>
}
const allowed = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
export class LocalAssetProvider implements AssetProvider {
  constructor(
    private root: string,
    private maxBytes = 5 * 1024 * 1024,
  ) {}
  async put(ownerId: string, name: string, contentType: string, data: Uint8Array) {
    if (!allowed.has(contentType)) throw new Error('UNSUPPORTED_MEDIA_TYPE')
    if (data.byteLength > this.maxBytes) throw new Error('FILE_TOO_LARGE')
    const ext = extname(name).toLowerCase()
    if (!['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext))
      throw new Error('INVALID_FILE_NAME')
    const key = `${ownerId}/${randomUUID()}${ext}`
    const path = resolve(this.root, key)
    if (!path.startsWith(`${resolve(this.root)}/`)) throw new Error('INVALID_PATH')
    await mkdir(join(this.root, ownerId), { recursive: true })
    await writeFile(path, data)
    return { key, url: `/assets/${key}`, size: data.byteLength, contentType }
  }
}
