import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface TimerState {
    seconds: number
    isRunning: boolean
    isVisible: boolean
    intervalId: ReturnType<typeof setInterval> | null

    startTimer: () => void
    pauseTimer: () => void
    resetTimer: () => void
    toggleVisibility: (visible?: boolean) => void
}

export const useTimerStore = create<TimerState>()(
    persist(
        (set, get) => ({
            seconds: 0,
            isRunning: false,
            isVisible: false,
            intervalId: null,

            startTimer: () => {
                const { isRunning, intervalId } = get()
                // Only skip if it's already running AND has an active interval
                if (isRunning && intervalId) return

                const id = setInterval(() => {
                    set((state) => ({ seconds: state.seconds + 1 }))
                }, 1000)

                set({ isRunning: true, isVisible: true, intervalId: id })
            },

            pauseTimer: () => {
                const { intervalId } = get()
                if (intervalId) {
                    clearInterval(intervalId)
                }
                set({ isRunning: false, intervalId: null })
            },

            resetTimer: () => {
                const { intervalId } = get()
                if (intervalId) {
                    clearInterval(intervalId)
                }
                set({ seconds: 0, isRunning: false, intervalId: null })
            },

            toggleVisibility: (visible) => {
                set((state) => ({ isVisible: visible ?? !state.isVisible }))
            }
        }),
        {
            name: 'timer-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                seconds: state.seconds,
                isRunning: state.isRunning,
                isVisible: state.isVisible,
            }),
        }
    )
)
