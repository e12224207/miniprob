//@ts-check
import * as esbuild from 'esbuild';
import { writeFileSync } from 'fs';
import { join } from 'path';

const watch = process.argv.includes('--watch');
const minify = process.argv.includes('--minify');

function padZeroes(i) {
  return i.toString().padStart(2, '0');
}
function getTime() {
  const d = new Date();
  return `[${padZeroes(d.getHours())}:${padZeroes(d.getMinutes())}:${padZeroes(d.getSeconds())}] `;
}
const plugins = [{
  name: 'watch-plugin',
  setup(build) {
    build.onEnd(result => {
      if (result.errors.length === 0) {
        console.log(
          getTime() +
          (watch ? 'Watch build succeeded' : 'Build succeeded') +
          (minify ? ' (minified)' : '')
        );
      }
    });
  }
}];

const ctx = await esbuild.context({
  entryPoints: {
    'extension/main': 'src/extension/main.ts',
    'language/main': 'src/language/main.ts'
  },

  bundle: true,
  outdir: 'out',

  // Produce CommonJS for Node (VS Code)
  platform: 'node',
  format: 'cjs',
  target: 'ES2017',

  external: ['vscode'],
  loader: { '.ts': 'ts' },
  outExtension: { '.js': '.js' },
  // Source maps only when not minifying
  sourcemap: !minify,
  minify,
  plugins
});

if (watch) {
  await ctx.watch();
} else {
  await ctx.rebuild();

  const pkgDir = join(process.cwd(), 'out', 'extension');
  writeFileSync(
    join(pkgDir, 'package.json'),
    JSON.stringify({ type: 'commonjs' }, null, 2)
  );
  const langPkgDir = join(process.cwd(), 'out', 'language');
  writeFileSync(
    join(langPkgDir, 'package.json'),
    JSON.stringify({ type: 'commonjs' }, null, 2)
  );

  ctx.dispose();
}
