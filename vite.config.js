import { defineConfig } from 'vite';
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import * as sass from 'sass-embedded';

const siteBase = '/sistemasoperativosUNET/';

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
  base: siteBase,
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

        const customTheme = sass.compile(new URL('./css/theme/source/unet.scss', import.meta.url).pathname).css;
        writeFileSync(new URL('./build/dist/theme/unet-custom.css', import.meta.url), customTheme);

        for (const page of slidePages) {
          const outputPath = new URL(`./build/${page}`, import.meta.url);
          rmSync(new URL(`./build/dist/${page}`, import.meta.url), { force: true });

          const html = readFileSync(outputPath, 'utf8');
          const stylesheets = [
            'dist/reset.css',
            'dist/reveal.css',
            'dist/theme/moon.css',
            'dist/theme/unet-custom.css',
          ].map((path) => `<link rel="stylesheet" href="${siteBase}${path}">`).join('\n\t\t');

          writeFileSync(outputPath, html.replace('<!-- Theme used for syntax highlighting of code -->', `${stylesheets}\n\t\t<!-- Theme used for syntax highlighting of code -->`));
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
