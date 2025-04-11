import { dev } from '$app/environment';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { ROLE } from '$lib/utils/constants/roles';
import { ROUTE } from '$lib/utils/constants/routes';
import isPublicRoute from '$lib/utils/functions/routes/isPublicRoute';
import shouldRedirectOnAuth from '$lib/utils/functions/routes/shouldRedirectOnAuth';
import { supabase } from '$lib/utils/functions/supabase';
import { setTheme } from '$lib/utils/functions/theme';
import { handleLocaleChange } from '$lib/utils/functions/translations';
import { getOrganizations } from '$lib/utils/services/org';
import { identifyPosthogUser, initPosthog } from '$lib/utils/services/posthog';
import { initSentry, setSentryUser } from '$lib/utils/services/sentry';
import { currentOrg, currentOrgDomain } from '$lib/utils/store/org';
import { profile, user } from '$lib/utils/store/user';
import isEmpty from 'lodash/isEmpty';
import { get } from 'svelte/store';

export function setupAnalytics() {
  // Set up sentry
  initSentry();

  // Set up posthog
  initPosthog();

  // Disable umami on localhost
  if (dev) {
    localStorage.setItem('umami.disabled', '1');
  }
}

function setAnalyticsUser() {
  const profileStore = get(profile);

  if (!profileStore.id) return;

  setSentryUser({
    id: profileStore.id,
    username: profileStore.username,
    email: profileStore.email,
    fullname: profileStore.fullname
  });

  identifyPosthogUser(profileStore.id, {
    email: profileStore.email,
    name: profileStore.fullname
  });
}

export async function getProfile({
  path,
  queryParam,
  isOrgSite,
  orgSiteName
}: {
  path: string;
  queryParam: string;
  isOrgSite: boolean;
  orgSiteName: string;
}) {
  console.log('=== Starting getProfile function ===');
  console.log('Parameters:', { path, queryParam, isOrgSite, orgSiteName });

  const pageStore = get(page);
  const profileStore = get(profile);
  const currentOrgStore = get(currentOrg);
  const currentOrgDomainStore = get(currentOrgDomain);

  console.log('Current stores:', {
    pageStore: pageStore.url?.pathname,
    profileStoreId: profileStore.id,
    currentOrgStoreId: currentOrgStore.id,
    currentOrgDomain: currentOrgDomainStore
  });

  const params = new URLSearchParams(window.location.search);
  console.log('URL Search Params:', Object.fromEntries(params.entries()));

  // Get user profile
  console.log('Fetching user session...');
  const {
    data: { session }
  } = await supabase.auth.getSession();
  const { user: authUser } = session || {};
  console.log('Auth user:', authUser ? {
    id: authUser.id,
    email: authUser.email,
    providers: authUser.app_metadata?.providers
  } : 'No auth user found');

  if (!authUser && !isPublicRoute(pageStore.url?.pathname)) {
    console.log('No auth user and not public route, redirecting to login');
    return goto('/login?redirect=/' + path + queryParam);
  }

  // Check if user has profile
  console.log('Checking if user has profile...');
  let {
    data: profileData,
    error,
    status
  } = await supabase
    .from('profile')
    .select(`*`)
    .eq('id', authUser?.id)
    .single();
  console.log('Profile check result:', {
    profileData: profileData ? {
      id: profileData.id,
      username: profileData.username,
      email: profileData.email
    } : null,
    error,
    status
  });

  handleLocaleChange('pt');

  if (error && !profileData && status === 406 && authUser) {
    // User wasn't found, create profile
    console.log('=== Creating new profile ===');
    console.log('User not found, creating new profile');

    const [regexUsernameMatch] = [...(authUser.email?.matchAll(/(.*)@/g) || [])];
    console.log('Username regex match:', regexUsernameMatch);

    const isGoogleAuth = !!authUser.app_metadata?.providers?.includes('google');
    console.log('Is Google Auth:', isGoogleAuth);

    console.log('Inserting new profile into database...');
    const { data: newProfileData, error } = await supabase
      .from('profile')
      .insert({
        id: authUser.id,
        username: regexUsernameMatch[1] + `${new Date().getTime()}`,
        fullname: regexUsernameMatch[1],
        email: authUser.email,
        is_email_verified: isGoogleAuth,
        verified_at: isGoogleAuth ? new Date().toDateString() : undefined
      })
      .select();

    console.log('Profile creation result:', {
      newProfileData: newProfileData ? {
        id: newProfileData[0].id,
        username: newProfileData[0].username,
        email: newProfileData[0].email
      } : null,
      error
    });

    // Profile created, go to onboarding or lms
    if (!error && newProfileData) {
      console.log('Profile created successfully, updating user store');
      user.update((_user) => ({
        ..._user,
        fetchingUser: false,
        isLoggedIn: true,
        currentSession: authUser
      }));

      profile.set(newProfileData[0]);
      console.log('Profile store updated');

      setAnalyticsUser();
      console.log('Analytics user set');

      if (isOrgSite) {
        console.log('Organization site detected, adding user to organization');
        const { data, error } = await supabase
          .from('organizationmember')
          .insert({
            organization_id: currentOrgStore.id,
            profile_id: profileStore.id,
            role_id: 3
          })
          .select();

        console.log('Organization member creation result:', {
          data,
          error
        });

        if (error) {
          console.error('Error adding user to organisation:', error);
        } else {
          console.log('Success adding user to organisation:', data);
          const memberId = data?.[0]?.id || '';

          currentOrg.update((_currentOrg) => ({
            ..._currentOrg,
            memberId
          }));
        }

        if (params.get('redirect')) {
          console.log('Redirecting to:', params.get('redirect'));
          goto(params.get('redirect') || '');
        } else {
          console.log('Redirecting to /lms');
          goto('/lms');
        }
        return;
      }

      // On invite page, don't go to onboarding
      if (!path.includes('invite')) {
        console.log('Redirecting to onboarding');
        goto(ROUTE.ONBOARDING);
      }
    }

    user.update((_user) => ({
      ..._user,
      fetchingUser: false
    }));
  } else if (profileData) {
    // Profile exists, go to profile page
    console.log('=== Existing profile found ===');
    console.log('Updating user store with existing profile');
    user.update((_user) => ({
      ..._user,
      fetchingUser: false,
      isLoggedIn: true,
      currentSession: authUser
    }));

    profile.set(profileData);
    console.log('Profile store updated with existing profile');

    // Set user in sentry
    setAnalyticsUser();
    console.log('Analytics user set');

    console.log('Fetching organizations...');
    const orgRes = await getOrganizations(profileData.id, isOrgSite, orgSiteName);
    console.log('Organizations fetched:', {
      currentOrg: orgRes.currentOrg,
      orgsCount: orgRes.orgs?.length
    });

    const isStudentAccount = orgRes.currentOrg.role_id == ROLE.STUDENT;
    console.log('Is student account:', isStudentAccount);

    // student redirect
    if (isOrgSite) {
      console.log('Organization site redirect logic');
      if (params.has('redirect')) {
        console.log('Redirecting to:', params.get('redirect'));
        goto(params.get('redirect') || '');
      } else if (shouldRedirectOnAuth(path)) {
        console.log('Redirecting to /lms');
        goto('/lms');
      }
    } else {
      if (isStudentAccount) {
        console.log('Student account redirect logic');
        if (dev) {
          console.log('Development mode, redirecting to /lms');
          goto('/lms');
        } else {
          console.log('Production mode, redirecting to:', `${currentOrgDomainStore}/lms`);
          window.location.replace(`${currentOrgDomainStore}/lms`);
        }
      } else if (isEmpty(orgRes.orgs) && !path.includes('invite')) {
        console.log('No organizations and not on invite page, redirecting to onboarding');
        goto(ROUTE.ONBOARDING);
      } else if (params.has('redirect')) {
        console.log('Redirecting to:', params.get('redirect'));
        goto(params.get('redirect') || '');
      } else if (shouldRedirectOnAuth(path)) {
        console.log('Redirecting to first organization:', `/org/${orgRes.currentOrg.siteName}`);
        goto(`/org/${orgRes.currentOrg.siteName}`);
      }
    }

    console.log('Setting theme:', orgRes?.currentOrg?.theme);
    setTheme(orgRes?.currentOrg?.theme);
  }

  if (!profileData && !isPublicRoute(pageStore.url?.pathname)) {
    console.log('No profile data and not public route, redirecting to login');
    goto('/login?redirect=/' + path);
  }
  console.log('=== End of getProfile function ===');
}
