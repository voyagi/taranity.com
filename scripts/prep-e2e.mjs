// Copies axe-core into the built site so the e2e suite can load it from the
// site's own origin ('self'). This keeps the production CSP strict (no CDN in
// script-src) while still running the axe a11y scan in tests.
import { copyFileSync, existsSync } from 'node:fs';

if (!existsSync('dist')) {
  console.error('dist/ not found — run `npm run build` before `npm run e2e`.');
  process.exit(1);
}
copyFileSync('node_modules/axe-core/axe.min.js', 'dist/axe-test.js');
console.log('prep-e2e: copied axe-core to dist/axe-test.js');
