import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const compiler = require.resolve('typescript/bin/tsc');
const build = spawn(process.execPath, [compiler, '-p', 'tsconfig.build.json'], {
  stdio: 'inherit',
});
const status = await new Promise((resolve) => build.on('exit', resolve));
if (status !== 0) process.exit(status ?? 1);
// Nest requires TypeScript decorator metadata; tsx does not emit it.
const children = [
  spawn(
    process.execPath,
    [compiler, '-p', 'tsconfig.build.json', '--watch', '--preserveWatchOutput'],
    { stdio: 'inherit' },
  ),
  spawn(process.execPath, ['--watch', 'dist/main.js'], { stdio: 'inherit' }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
for (const child of children) {
  child.on('error', (error) => {
    console.error(error);
    stop(1);
  });
  child.on('exit', (code) => stop(code ?? 1));
}
