import {fileURLToPath, URL} from 'node:url'

import {defineConfig, splitVendorChunkPlugin} from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
	build: {
		rollupOptions: {
			output: {
				entryFileNames: `static/[name].js`,
				chunkFileNames: `static/[name].js`,
				assetFileNames: `static/[name].[ext]`
			}
		}
	},
	server: {
		host: '0.0.0.0'
	},
	plugins: [
		splitVendorChunkPlugin(),
		vue(),
	],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url))
		}
	}
})
