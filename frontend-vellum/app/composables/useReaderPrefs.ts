export interface Prefs {
  tema: "oscuro" | "claro";
  colorFondo: string;
  colorAcento: string;
  anchoPagina: number;
  separacionVinetas: "sin_espacio" | "fina" | "amplia";
  brillo: number;
  gestosTactiles: boolean;
  ocultarBarras: boolean;
  tamanoFuente: number;
  modoLectura: "vertical" | "paginado" | "paginado_rtl";
}

export const DEFAULT_PREFS: Prefs = {
  tema: "oscuro",
  colorFondo: "#0f172a",
  colorAcento: "#f59e0b",
  anchoPagina: 800,
  separacionVinetas: "sin_espacio",
  brillo: 100,
  gestosTactiles: true,
  ocultarBarras: true,
  tamanoFuente: 18,
  modoLectura: "vertical",
};

const LS_KEY = "vellum:prefs";

function luminance(hex: string) {
  const h = hex.replace("#", "");
  const f =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h.slice(0, 6);
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(f.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function useReaderPrefs() {
  const prefs = useState<Prefs>("reader:prefs", () => ({ ...DEFAULT_PREFS }));
  const { api } = useApi();
  const { isLogged } = useAuth();

  /** Aplica colores a <html>: toda la web adopta la paleta elegida. */
  function apply() {
    if (import.meta.server) return;
    const s = document.documentElement;
    s.dataset.tema = prefs.value.tema;
    s.style.setProperty("--v-bg", prefs.value.colorFondo);
    s.style.setProperty("--v-accent", prefs.value.colorAcento);
    s.style.setProperty(
      "--v-on-accent",
      luminance(prefs.value.colorAcento) > 0.45 ? "#0f172a" : "#ffffff",
    );
    document
      .querySelector("meta[name=theme-color]")
      ?.setAttribute("content", prefs.value.colorFondo);
  }

  function loadLocal() {
    if (import.meta.server) return;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) prefs.value = { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    } catch {
      /* almacenamiento no disponible */
    }
    apply();
  }

  async function loadRemote() {
    if (!isLogged.value) return;
    try {
      prefs.value = {
        ...DEFAULT_PREFS,
        ...(await api<Partial<Prefs>>("/preferencias")),
      };
      persistLocal();
      apply();
    } catch {
      /* se mantienen las locales */
    }
  }
  async function pushRemote() {
    if (!isLogged.value) return;
    try {
      await api("/preferencias", { method: "PUT", body: prefs.value });
    } catch {
      /* reintentará en el próximo cambio */
    }
  }
  function persistLocal() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(prefs.value));
    } catch {
      /* noop */
    }
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  /** Cambia preferencias: aplica en vivo, guarda local y sincroniza (debounce) con la cuenta. */
  function update(patch: Partial<Prefs>) {
    prefs.value = { ...prefs.value, ...patch };
    persistLocal();
    apply();
    clearTimeout(timer);
    timer = setTimeout(pushRemote, 800);
  }
  function reset() {
    update({ ...DEFAULT_PREFS });
  }

  return { prefs, update, reset, apply, loadLocal, loadRemote, pushRemote };
}
