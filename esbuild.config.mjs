import esbuild from 'esbuild';
import { builtinModules } from 'node:module';
import process from 'process';
import { readFileSync } from 'node:fs';

const production = process.argv[2] === 'production';
const context = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: ['obsidian', 'electron', ...builtinModules],
  format: 'cjs',
  target: 'es2021',
  logLevel: 'info',
  sourcemap: production ? false : 'inline',
  treeShaking: true,
  outfile: 'main.js',
  minify: production,
  banner: { js: '/* WaveSign for Obsidian — source: https://github.com/roloport/wavesign-obsidian\n'
    + 'Bundled fflate license:\n' + readFileSync(new URL('./node_modules/fflate/LICENSE', import.meta.url), 'utf8') + '\n*/' },
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
