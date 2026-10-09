import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';


// Retired loopback configuration routes must not bypass administrator authorization.
export default defineConfig({ plugins: [{name:'retired-local-settings',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url?.startsWith('/__local/')){res.writeHead(403);res.end('Access denied');}else next();});}}, react(), cloudflare()], server: { port: 5173, strictPort: true }, build: { rollupOptions: { output: { manualChunks(id) { const normalized=id.split(String.fromCharCode(92)).join('/'); const locale=normalized.match(/i18n\/catalogs\/(en|zh|pt|ja|es)\.json$/); if(locale)return 'locale-'+locale[1]; if(normalized.includes('/node_modules/three/'))return 'three'; } } } } });
