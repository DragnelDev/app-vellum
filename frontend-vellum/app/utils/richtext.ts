/**
 * Formato de comentarios (seguro): primero se ESCAPA todo el HTML y después se aplican
 * marcas simples. **negrita**, *cursiva*, ~~tachado~~, ||spoiler||, `código`, enlaces http(s).
 */
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export function renderRich(input: string): string {
  let t = esc(input)
  t = t.replace(/`([^`\n]+)`/g, '<code class="rounded bg-surface-2 px-1">$1</code>')
  t = t.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
  t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  t = t.replace(/~~([^~\n]+)~~/g, '<s>$1</s>')
  t = t.replace(/\|\|([^|\n]+)\|\|/g, '<span class="spoiler" data-spoiler>$1</span>')
  t = t.replace(
    /(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer nofollow ugc" class="text-accent underline">$1</a>',
  )
  return t.replace(/\n/g, '<br>')
}

export function timeAgo(date: string | Date): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 1000))
  const units: [number, string][] = [[31536000, 'a'], [2592000, 'mes'], [86400, 'd'], [3600, 'h'], [60, 'min']]
  for (const [secs, label] of units) if (s >= secs) return `hace ${Math.floor(s / secs)} ${label}`
  return 'ahora'
}

export const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ''))

export const TIPO_LABEL: Record<string, string> = { manga: 'Manga', manhwa: 'Manhwa', manhua: 'Manhua', novela: 'Novela' }
export const ESTADO_LABEL: Record<string, string> = {
  en_emision: 'En emisión', finalizado: 'Finalizado', pausado: 'Pausado', cancelado: 'Cancelado',
}
