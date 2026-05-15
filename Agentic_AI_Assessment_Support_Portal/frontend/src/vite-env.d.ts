/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_SUPPORT__URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
