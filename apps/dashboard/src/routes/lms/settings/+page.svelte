<script>
  import { page } from '$app/stores';
  import Profile from '$lib/components/LMS/components/Profile.svelte';
  import { t } from '$lib/utils/functions/translations';
  import { Tab, TabContent, Tabs } from 'carbon-components-svelte';

  let selected = 0;
  let tabs = [];
  $: tabs = [
    {
      key: 0,
      label: $t('settings.tabs.profile_tab'),
      tabKey: '',
      href: $page.url.pathname
    }
  ];
</script>

<section class="mx-auto w-full max-w-6xl">
  <div class="px-5 py-10">
    <div class="mb-10 flex items-center justify-between">
      <h1 class="text-3xl font-bold dark:text-white">{$t('settings.heading')}</h1>
    </div>

    <div class="">
      <Tabs autoWidth bind:selected>
        {#each tabs as tab}
          <Tab label={tab.label} href={tab.href} />
        {/each}
        <svelte:fragment slot="content">
          <TabContent>
            <Profile />
          </TabContent>
        </svelte:fragment>
      </Tabs>
    </div>
  </div>
</section>
