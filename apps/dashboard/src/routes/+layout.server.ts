import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { IS_SELFHOSTED } from '$env/static/private';
import { blockedSubdomain } from '$lib/utils/constants/app';
import { getSupabase, supabase } from '$lib/utils/functions/supabase';
import { getCurrentOrg } from '$lib/utils/services/org';
import type { CurrentOrg } from '$lib/utils/types/org';
import { redirect } from '@sveltejs/kit';
import type { MetaTagsProps } from 'svelte-meta-tags';

if (!supabase) {
  getSupabase();
}

interface LoadOutput {
  orgSiteName: string;
  isOrgSite: boolean;
  skipAuth: boolean;
  org: CurrentOrg | null;
  baseMetaTags: MetaTagsProps;
  serverLang: string;
}

const APP_SUBDOMAINS = env.PRIVATE_APP_SUBDOMAINS.split(',');

export const load = async ({ url, cookies, request }) => {
  console.log('=== Iniciando load() em +layout.server.ts ===');
  console.log('URL completa:', url.href);
  console.log('Host:', url.host);
  console.log('Pathname:', url.pathname);
  console.log('Search params:', url.searchParams.toString());

  const response: LoadOutput = {
    orgSiteName: '',
    isOrgSite: false,
    skipAuth: false,
    org: null,
    baseMetaTags: getBaseMetaTags(url),
    serverLang: 'pt'
  };

  console.log('Valores iniciais:', {
    isOrgSite: response.isOrgSite,
    orgSiteName: response.orgSiteName,
    skipAuth: response.skipAuth
  });

  // Selfhosted logic
  if (IS_SELFHOSTED === 'true') {
    console.log('Modo selfhosted ativado');
    const subdomain = getSubdomain(url);
    console.log('Subdomínio detectado:', subdomain);

    if (subdomain) {
      console.log('Processando subdomínio para organização...');
      const org = (await getCurrentOrg(subdomain, true)) || null;
      console.log('Organização encontrada:', org);

      if (!org) {
        console.log('Organização não encontrada para subdomínio:', subdomain);
        return response;
      }

      response.org = org;
      response.isOrgSite = true;
      response.orgSiteName = subdomain;
      console.log('Configuração selfhosted aplicada:', {
        isOrgSite: response.isOrgSite,
        orgSiteName: response.orgSiteName
      });
    }
    return response;
  }

  console.log('Verificando domínio personalizado...');
  if (isURLCustomDomain(url)) {
    console.log('Domínio personalizado detectado');
    response.org = (await getCurrentOrg(url.host, true, true)) || null;
    console.log('Organização para domínio personalizado:', response.org);

    if (!response.org) {
      console.log('Redirecionando para página 404 (organização não encontrada)');
      throw redirect(307, 'https://app.classroomio.com/404?type=org');
    }

    response.isOrgSite = true;
    response.orgSiteName = response.org?.siteName || '';
    console.log('Configuração de domínio personalizado aplicada:', {
      isOrgSite: response.isOrgSite,
      orgSiteName: response.orgSiteName
    });
    return response;
  }

  const subdomain = getSubdomain(url) || '';
  console.log('Subdomínio detectado:', subdomain);

  if (!blockedSubdomain.includes(subdomain)) {
    console.log('Subdomínio não está bloqueado');
    if (APP_SUBDOMAINS.includes(subdomain)) {
      console.log('Subdomínio é um app domain (ignorando)');
      return response;
    }

    response.isOrgSite = !!subdomain;
    response.orgSiteName = subdomain;
    response.org = (await getCurrentOrg(response.orgSiteName, true)) || null;
    console.log('Configuração de subdomínio aplicada:', {
      isOrgSite: response.isOrgSite,
      orgSiteName: response.orgSiteName,
      org: response.org
    });

    if (!response.org) {
      console.log('Organização não encontrada para subdomínio');
      if (!dev) {
        console.log('Redirecionando para página 404 (produção)');
        throw redirect(307, 'https://app.classroomio.com/404?type=org');
      }
    }
  } else if (subdomain === 'play') {
    console.log('Modo play ativado (skipAuth=true)');
    response.skipAuth = true;
  }

  console.log('=== Finalizando load() ===', {
    isOrgSite: response.isOrgSite,
    orgSiteName: response.orgSiteName,
    skipAuth: response.skipAuth,
    org: !!response.org
  });
  return response;
};

function isURLCustomDomain(url: URL) {
  if (url.host.includes('localhost')) {
    return false;
  }

  const notCustomDomainHosts = [env.PRIVATE_APP_HOST || '', 'classroomio.com', 'vercel.app'].filter(
    Boolean
  );

  return !notCustomDomainHosts.some((host) => url.host.endsWith(host));
}

function getBaseMetaTags(url: URL) {
  return Object.freeze({
    title: 'SovietIO | The Open Source Learning Management System for Companies',
    description:
      'A flexible, user-friendly platform for creating, managing, and delivering courses for companies and training organisations',
    canonical: new URL(url.pathname, url.origin).href,
    openGraph: {
      type: 'website',
      url: new URL(url.pathname, url.origin).href,
      locale: 'pt_BR',
      title: 'SovietIO | The Open Source Learning Management System for Companies',
      description:
        'A flexible, user-friendly platform for creating, managing, and delivering courses for companies and training organisations',
      siteName: 'SovietIO',
      images: [
        {
          url: 'https://brand.cdn.clsrio.com/og/classroomio-og.png',
          alt: 'SovietIO OG Image',
          width: 1920,
          height: 1080,
          secureUrl: 'https://brand.cdn.clsrio.com/og/classroomio-og.png',
          type: 'image/jpeg'
        }
      ]
    },
    twitter: {
      handle: '@classroomio',
      site: '@classroomio',
      cardType: 'summary_large_image' as const,
      title: 'SovietIO | The Open Source Learning Management System for Companies',
      description:
        'A flexible, user-friendly platform for creating, managing, and delivering courses for companies and training organisations',
      image: 'https://brand.cdn.clsrio.com/og/classroomio-og.png',
      imageAlt: 'SovietIO OG Image'
    }
  });
}

function getSubdomain(url: URL) {
  const host = url.host.replace('www.', '');
  const parts = host.split('.');

  if (host.endsWith(env.PRIVATE_APP_HOST)) {
    return parts.length >= 3 ? parts[0] : null;
  }

  return null;
}
