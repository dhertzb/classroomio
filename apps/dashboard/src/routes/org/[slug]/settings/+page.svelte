<script>
  import OrgSettings from '$lib/components/Org/Settings/index.svelte';
  import { t } from '$lib/utils/functions/translations';
</script>

<svelte:head>
  <title>Settings - SovietIO</title>
</svelte:head>

<section class="mx-auto w-full md:max-w-4xl">
  <div class="px-5 py-10">
    <div class="mb-10 flex items-center justify-between">
      <h1 class="text-3xl font-bold dark:text-white">{$t('settings.heading')}</h1>
    </div>

    <OrgSettings />
  </div>
</section>
