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
}
const initial = validateProject(demoProject)
export const useEditorStore = create<EditorState>()(
  immer((set, get) => ({
    project: initial,
    pageId: initial.pages[0]!.id,
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
      set({
        project: valid,
        pageId: valid.pages[0]!.id,
        selectedId: undefined,
        history: new CommandHistory(valid),
        saveState: markDirty ? 'saving' : 'saved',
      })
    },
    updateTheme: (theme) => {
      const history = get().history
      set({ project: history.execute({ type: 'updateTheme', theme }), saveState: 'saving' })
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
