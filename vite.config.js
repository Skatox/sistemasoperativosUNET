import { defineConfig } from 'vite';
import { cpSync, readdirSync, rmSync } from 'node:fs';
import { relative } from 'node:path';

const slidePages = [
  '01-Introduccion.html',
  '02-Procesos.html',
  '03-Hilos.html',
  '04-GestionProcesos.html',
  '05-SincronizacionProcesos.html',
  '06-Interbloqueo.html',
  '07-GestionMemoria.html',
  '08-PaginacionSegmentacion.html',
  '09-MemoriaVirtual.html',
  '10-Archivos.html',
  '11-SistemaArchivos.html',
  '12-Discos.html',
  '13-EntradaSalida.html',
  '14-Seguridad.html',
];

const slidePageNames = new Set(slidePages);

export default defineConfig({
  base: '/sistemasoperativosUNET/',
  // Static slide assets live alongside the root HTML sources, outside public/.
  publicDir: false,
  plugins: [
    {
      name: 'serve-current-slide-pages',
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          const path = new URL(request.url ?? '/', 'http://localhost').pathname;
          const page = path.slice(1);

          if (slidePageNames.has(page)) {
            response.setHeader('Cache-Control', 'no-store');
          }
          next();
        });
      },
      generateBundle(_options, bundle) {
        for (const page of slidePages) {
          delete bundle[`public/${page}`];
        }
      },
      closeBundle() {
        // Keep the classic HTML asset URLs (dist/ and img/) working in the
        // production output without maintaining a second source tree.
        copyDirectory(new URL('./dist', import.meta.url), new URL('./build/dist', import.meta.url), false);
        copyDirectory(new URL('./img', import.meta.url), new URL('./build/img', import.meta.url));
        for (const page of slidePages) {
          rmSync(new URL(`./build/dist/${page}`, import.meta.url), { force: true });
        }
      },
    },
  ],
  // `dist/` is the checked-in Reveal.js runtime used by the slide sources;
  // `build/` is only the generated static site output.
  build: {
    outDir: 'build',
    emptyOutDir: true,
    rollupOptions: {
      input: [
        'index.html',
        ...slidePages,
      ],
    },
  },
});

function copyDirectory(source, destination, omitSlidePages = false) {
  const sourcePath = source.pathname;
  rmSync(destination, { recursive: true, force: true });
  cpSync(sourcePath, destination.pathname, {
    recursive: true,
    filter: (path) => !omitSlidePages || !slidePageNames.has(relative(sourcePath, path)),
  });
}
