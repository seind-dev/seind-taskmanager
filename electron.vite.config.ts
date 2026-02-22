import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

// Load .env manually (no extra dependency needed)
function loadEnvFile(): Record<string, string> {
  const envPath = resolve(__dirname, '.env');
  if (!existsSync(envPath)) return {};
  const content = readFileSync(envPath, 'utf-8');
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    result[trimmed.slice(0, eqIndex)] = trimmed.slice(eqIndex + 1);
  }
  return result;
}

const envVars = loadEnvFile();

export default defineConfig({
  main: {
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/main/main.ts')
        }
      }
    },
    define: {
      'process.env.SUPABASE_URL': JSON.stringify(envVars.SUPABASE_URL || ''),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(envVars.SUPABASE_ANON_KEY || ''),
    },
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
        '@main': resolve(__dirname, 'src/main')
      }
    }
  },
  preload: {
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: {
          preload: resolve(__dirname, 'src/preload/preload.ts')
        }
      }
    },
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared')
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      outDir: resolve(__dirname, 'dist/renderer'),
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        }
      }
    },
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
        '@renderer': resolve(__dirname, 'src/renderer')
      }
    },
    plugins: [react()]
  }
});
