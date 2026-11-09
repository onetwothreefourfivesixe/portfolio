import adapter from '@sveltejs/adapter-netlify';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			// Netlify adapter set explicitly, so `npm run build` writes build/ (and the server function)
			// both on Netlify and locally for `netlify deploy` when GitHub-triggered builds aren't available.
			adapter: adapter()
		})
	]
});
