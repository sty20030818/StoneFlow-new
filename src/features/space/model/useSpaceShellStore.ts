import { create } from 'zustand'

type SpaceShellState = {
  currentSpaceId: string
}

export const useSpaceShellStore = create<SpaceShellState>(() => ({
  currentSpaceId: 'default',
}))

export const selectCurrentSpaceId = (state: SpaceShellState) =>
  state.currentSpaceId
