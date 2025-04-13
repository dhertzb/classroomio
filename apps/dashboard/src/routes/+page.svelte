<script>
  import { goto } from '$app/navigation';
  import { getSupabase } from '$lib/utils/functions/supabase';
  import { onMount } from 'svelte';

  const supabase = getSupabase();

  onMount(async () => {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (session) {
      goto('/lms');
    } else {
      goto('/login');
    }
  });
</script>
