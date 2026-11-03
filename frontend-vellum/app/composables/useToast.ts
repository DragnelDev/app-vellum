export interface Toast { id: number; text: string; type: 'ok' | 'error' }
let n = 0
export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])
  function push(text: string, type: Toast['type'] = 'ok') {
    const id = ++n
    toasts.value = [...toasts.value, { id, text, type }]
    setTimeout(() => (toasts.value = toasts.value.filter((t) => t.id !== id)), 4000)
  }
  return { toasts, ok: (t: string) => push(t, 'ok'), error: (t: string) => push(t, 'error') }
}
