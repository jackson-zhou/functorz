import { create } from 'zustand'
import type { StoreApi, UseBoundStore } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { CommandHistory, type EditorCommand, findNode } from '@functorz/editor-core'
import { demoProject } from '@functorz/schema/fixtures'
import {
  deserializeProject,
  type ProjectSchema,
  type ThemeSchema,
  validateProject,
} from '@functorz/schema'

interface EditorState {
  project: ProjectSchema
  pageId: string
  selectedId?: string
  history: CommandHistory
  saveState: 'saved' | 'saving' | 'error'
  setPage: (id: string) => void
  select: (id?: string) => void
  execute: (command: EditorCommand) => void
  undo: () => void
  redo: () => void
  replace: (project: ProjectSchema, markDirty?: boolean) => void
  updateTheme: (theme: Partial<ThemeSchema>) => void
  addPage: (name: string, route: string) => void
  removePage: (pageId: string) => void
  renamePage: (pageId: string, name: string) => void
}
const initial = validateProject(demoProject)
const initialPageId = initial.pages.find((page) => page.name === '电商首页')?.id ?? initial.pages[0]!.id
function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}
export const useEditorStore = create<EditorState>()(
  immer((set, get) => ({
    project: initial,
    pageId: initialPageId,
    history: new CommandHistory(initial),
    saveState: 'saved',
    setPage: (pageId) => set({ pageId, selectedId: undefined }),
    select: (selectedId) => set({ selectedId }),
    execute: (command) => {
      const history = get().history
      set({ project: history.execute(command), saveState: 'saving' })
    },
    undo: () => {
      const history = get().history
      set({ project: history.undo(), saveState: 'saving' })
    },
    redo: () => {
      const history = get().history
      set({ project: history.redo(), saveState: 'saving' })
    },
    replace: (project, markDirty = true) => {
      const valid = validateProject(project)
      const currentPageId = get().pageId
      set({
        project: valid,
        pageId: valid.pages.some((page) => page.id === currentPageId)
          ? currentPageId
          : valid.pages[0]!.id,
        selectedId: undefined,
        history: new CommandHistory(valid),
        saveState: markDirty ? 'saving' : 'saved',
      })
    },
    updateTheme: (theme) => {
      const history = get().history
      set({ project: history.execute({ type: 'updateTheme', theme }), saveState: 'saving' })
    },
    addPage: (name, route) => {
      const project = get().project
      const newPage = {
        id: uuid(),
        name,
        route: route.startsWith('/') ? route : `/${route}`,
        root: {
          id: uuid(),
          type: 'Page' as const,
          props: {},
          children: [],
        },
      }
      const valid = validateProject({ ...project, pages: [...project.pages, newPage] })
      set({
        project: valid,
        pageId: newPage.id,
        selectedId: undefined,
        history: new CommandHistory(valid),
        saveState: 'saving',
      })
    },
    removePage: (pageId) => {
      const project = get().project
      if (project.pages.length <= 1) return
      const pageIndex = project.pages.findIndex((p) => p.id === pageId)
      if (pageIndex < 0) return
      const newPages = project.pages.filter((p) => p.id !== pageId)
      const valid = validateProject({ ...project, pages: newPages })
      set({
        project: valid,
        pageId: valid.pages[Math.min(pageIndex, valid.pages.length - 1)]!.id,
        selectedId: undefined,
        history: new CommandHistory(valid),
        saveState: 'saving',
      })
    },
    renamePage: (pageId, name) => {
      const project = get().project
      const pages = project.pages.map((p) => (p.id === pageId ? { ...p, name } : p))
      const valid = validateProject({ ...project, pages })
      set({ project: valid, saveState: 'saving' })
    },
  })),
) as unknown as UseBoundStore<StoreApi<EditorState>>
export const selectCurrentPage = (state: EditorState) =>
  state.project.pages.find((page) => page.id === state.pageId) ?? state.project.pages[0]!
export const selectSelectedNode = (state: EditorState) =>
  state.selectedId ? findNode(state.project, state.selectedId)?.node : undefined
export function importProjectJson(json: string): ProjectSchema {
  return deserializeProject(json)
}
