import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/kit/vite';
import path from 'path';

import 'dotenv/config';

const useNodeAdapter =
  process.env.IS_SELFHOSTED === 'true' && process.env.DEPLOYMENT_PROVIDER === 'docker';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: [vitePreprocess({})],

  kit: {
    adapter: adapter(),
    alias: {
      $lib: path.resolve('./src/lib'),
      $mail: path.resolve('./src/mail')
    }
  }
};

export default config;
