import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// UI fixtures stub their own requests; this preview deliberately has no Worker or service secrets.
export default defineConfig({ plugins:[react()], server:{host:'127.0.0.1',port:5175,strictPort:true} });
