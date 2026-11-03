import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  vite: { plugins: [tailwindcss()] },

  runtimeConfig: {
    // URL interna de la API para SSR (opcional; si no, se usa la pública)
    apiBase: process.env.NUXT_API_BASE ?? "",
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? "http://localhost:3001/api",
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    },
  },

  // SEO + rendimiento: páginas públicas con SSR y caché stale-while-revalidate (Cloudflare/Nitro).
  // El HTML cacheado NUNCA contiene datos de usuario: sesión y preferencias se resuelven en el cliente.
  routeRules: {
    "/": { swr: 60 },
    "/catalogo": { swr: 60 },
    "/obra/**": { swr: 120 },
    "/leer/**": { swr: 300 },
    "/biblioteca": { ssr: false },
    "/admin/**": { ssr: false },
  },

  app: {
    head: {
      htmlAttrs: { lang: "es" },
      titleTemplate: "%s · Vellum",
      meta: [
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1, viewport-fit=cover",
        },
        { name: "theme-color", content: "#0f172a" },
        {
          name: "description",
          content: "Lee manga, manhwa, manhua y novelas ligeras en Vellum.",
        },
      ],
      link: [
        { rel: "manifest", href: "/manifest.webmanifest" },
        { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
        { rel: "icon", type: "image/svg+xml", href: "/icons/icon.svg" },
      ],
      // Aplica preferencias guardadas antes del primer render: sin parpadeo de tema.
      script: [
        {
          tagPosition: "head",
          innerHTML: `try{var p=JSON.parse(localStorage.getItem('vellum:prefs')||'null');if(p){var s=document.documentElement;s.dataset.tema=p.tema||'oscuro';if(p.colorFondo)s.style.setProperty('--v-bg',p.colorFondo);if(p.colorAcento)s.style.setProperty('--v-accent',p.colorAcento)}}catch(e){}`,
        },
      ],
    },
  },

  typescript: { strict: true },
});
