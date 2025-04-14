<script lang="ts">
  import {
    lesson,
    lessonByTranslation
  } from '$lib/components/Course/components/Lesson/store/lessons';
  import HtmlRender from '$lib/components/HTMLRender/HTMLRender.svelte';
  import { isHtmlValueEmpty } from '$lib/utils/functions/toHtml';
  import { lessonFallbackNote, t } from '$lib/utils/functions/translations';

  export let lessonId: string;

  $: content = lessonFallbackNote(
    $lesson.materials.note,
    $lessonByTranslation[lessonId],
    $lesson.locale
  );
  $: hasAtLeastOneTranslation = Object.values($lessonByTranslation[lessonId] || {}).some(
    (c) => !!c?.length
  );
</script>

{#if !isHtmlValueEmpty(content)}
  <HtmlRender className="m-auto">
    <svelte:fragment slot="content">
      <div>
        {@html content}
      </div>
    </svelte:fragment>
  </HtmlRender>
{:else if hasAtLeastOneTranslation}
  <div class="flex flex-col items-center justify-center text-center">
    <h3 class="py-2 text-lg font-normal italic dark:text-white">
      {$t('course.navItem.lessons.materials.no_translation')}
    </h3>
  </div>
{/if}
