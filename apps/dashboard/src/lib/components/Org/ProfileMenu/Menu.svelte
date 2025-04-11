<script>
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/utils/functions/supabase';
  import { t } from '$lib/utils/functions/translations';
  import { capturePosthogEvent } from '$lib/utils/services/posthog';
  import { globalStore } from '$lib/utils/store/app';
  import {
    currentOrg,
    currentOrgDomain,
    currentOrgPath,
    defaultCurrentOrgState,
    orgs
  } from '$lib/utils/store/org';
  import { defaultProfileState, defaultUserState, profile, user } from '$lib/utils/store/user';
  import { Settings } from 'carbon-icons-svelte';
  import Logout from 'carbon-icons-svelte/lib/Logout.svelte';
  import posthog from 'posthog-js';
  import { profileMenu } from '../store';

  async function logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error logging out: ', error);
    }

    currentOrg.set(defaultCurrentOrgState);
    orgs.set([]);
    user.set(defaultUserState);
    profile.set(defaultProfileState);

    capturePosthogEvent('user_logged_out');
    posthog.reset();

    closeMenu();

    goto('/login');
  }

  function closeMenu() {
    $profileMenu.open = false;
  }
</script>

<div class="cursor-pointer rounded-md px-2 py-2 md:px-4 md:py-4">
  <div class="space-y-4 border-b py-3">
    <p class="text-xs font-semibold text-gray-500">{$t('profileMenu.profile')}</p>
    <a
      href={`${!$globalStore.isOrgSite ? $currentOrgPath : '/lms'}/settings`}
      class="flex items-center justify-between hover:no-underline"
      on:click={closeMenu}
    >
      <span class="flex max-w-[70%] items-center gap-2">
        <img src={$profile.avatar_url} alt="profile" class="h-8 w-8 rounded-full" />
        <div>
          <p class="w-[80%] truncate text-sm font-semibold">{$profile.fullname}</p>
          <p class="w-[80%] truncate text-xs">{$profile.email}</p>
        </div>
      </span>
      <div>
        <Settings size={20} />
      </div>
    </a>
  </div>
  {#if !$globalStore.isOrgSite}
    <div class="space-y-4 border-b py-3">
      <p class="text-xs font-semibold text-gray-500">{$t('profileMenu.current_org')}</p>
      <a
        href={`${$currentOrgPath}/settings?tab=org`}
        class="flex items-center justify-between hover:no-underline"
        on:click={closeMenu}
      >
        <span class="flex max-w-[70%] items-center gap-2">
          <div
            class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900 p-4 font-semibold text-white"
          >
            {$currentOrg.shortName}
          </div>
          <div>
            <p class="w-[80%] truncate text-sm font-semibold">{$currentOrg.name}</p>
            <p class="w-[80%] truncate text-xs">
              {$currentOrgDomain}
            </p>
          </div>
        </span>
        <div>
          <Settings size={20} />
        </div>
      </a>
    </div>
  {/if}

  <button on:click={logout} class="w-full space-y-4 pt-3">
    <span class="flex items-center gap-2">
      <Logout />
      <p class="text-sm font-semibold">{$t('settings.profile.logout')}</p>
    </span>
  </button>
</div>
