declare module 'miniprogram-ci' {
  export class Project {
    constructor(options: Record<string, unknown>)
  }
  export function preview(options: Record<string, unknown>): Promise<unknown>
}
