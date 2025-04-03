import { config, loadTranslations } from '$lib/utils/functions/translations';
import { profile } from '$lib/utils/store/user';
import { get } from 'svelte/store';

const SUPPORTED_LANGUAGES = config?.loaders?.map((loader) => loader.locale) || [];

export const load = async ({ url, data }) => {
  const { pathname } = url;
  
  // Always use Portuguese as the language
  await loadTranslations('pt', pathname);

  return data;
};

function getInitialLocale(lang: string): string {
  const locale = lang.split('-')[0];

  if (SUPPORTED_LANGUAGES.includes(locale)) return locale;

  return 'pt';
}
