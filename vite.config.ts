import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import devtools from 'solid-devtools/vite';

export default defineConfig({
  plugins: [
    solidPlugin({ ssr: false }),
    devtools({
      autoname: true,
    }),
  ],
  build: {
    target: 'esnext',
    sourcemap: true,
  },
});