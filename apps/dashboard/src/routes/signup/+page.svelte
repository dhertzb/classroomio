<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import AuthUI from '$lib/components/AuthUI/index.svelte';
  import TextField from '$lib/components/Form/TextField.svelte';
  import PrimaryButton from '$lib/components/PrimaryButton/index.svelte';
  import SenjaEmbed from '$lib/components/Senja/Embed.svelte';
  import { SIGNUP_FIELDS } from '$lib/utils/constants/authentication';
  import { getSupabase } from '$lib/utils/functions/supabase';
  import { t } from '$lib/utils/functions/translations';
  import {
    authValidation,
    getConfirmPasswordError,
    getDisableSubmit
  } from '$lib/utils/functions/validator';
  import { capturePosthogEvent } from '$lib/utils/services/posthog';
  import { globalStore } from '$lib/utils/store/app';
  import { currentOrg } from '$lib/utils/store/org';

  let supabase = getSupabase();
  let fields = Object.assign({}, SIGNUP_FIELDS);
  let loading = false;
  let success = false;
  let errors: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  } = {};
  let submitError: string;
  let disableSubmit = false;
  let formRef: HTMLFormElement;

  let query = new URLSearchParams($page.url.search);
  let redirect = query.get('redirect');

  async function handleSubmit() {
    console.log('Starting signup process');
    console.log('Form fields:', fields);
    const validationRes = authValidation(fields);
    console.log('Validation result:', validationRes);

    if (Object.keys(validationRes).length) {
      console.log('Validation errors found:', validationRes);
      errors = Object.assign(errors, validationRes);
      return;
    }

    try {
      console.log('Attempting to sign up user');
      loading = true;

      const { data, error } = await supabase.auth.signUp({
        email: fields.email,
        password: fields.password
      });

      if (error) {
        console.error('Signup error:', error);
        throw error;
      }

      const authUser = data.user;

      if (!authUser) {
        console.error('No auth user created');
        throw 'Error creating user';
      }

      console.log('Auth user created:', authUser);

      if (!$currentOrg.id) {
        console.log('No current org ID, skipping org-related steps');
        return;
      }

      const [regexUsernameMatch] = [...(authUser.email?.matchAll(/(.*)@/g) || [])];
      console.log('Username match:', regexUsernameMatch);

      console.log('Capturing posthog events');
      capturePosthogEvent('user_signed_up', {
        distinct_id: authUser.id,
        email: authUser.email,
        username: regexUsernameMatch[1]
      });

      if ($globalStore.isOrgSite) {
        console.log('Capturing student signup event');
        capturePosthogEvent('student_signed_up', {
          distinct_id: authUser.id,
          email: authUser.email,
          username: regexUsernameMatch[1]
        });
      }

      console.log('Signup successful, redirecting...');
      if (redirect) {
        console.log('Redirecting to:', redirect);
        goto(redirect);
      } else {
        console.log('Redirecting to login page');
        goto('/login');
      }

      formRef?.reset();
      success = true;
      fields = Object.assign({}, SIGNUP_FIELDS);
    } catch (error: any) {
      console.error('Signup process failed:', error);
      submitError = error?.error_description || error?.message;
      loading = false;
    }
  }

  $: console.log('Confirm password error:', errors.confirmPassword);
  $: console.log('Submit disabled:', disableSubmit);
  $: errors.confirmPassword = getConfirmPasswordError(fields);
  $: disableSubmit = getDisableSubmit(fields);
</script>

<svelte:head>
  <title>Join SovietIO</title>
</svelte:head>

<SenjaEmbed id="aa054658-1e15-4d00-8920-91f424326c4e" />

<AuthUI {supabase} isLogin={false} {handleSubmit} isLoading={loading} bind:formRef>
  <div class="mt-4 w-full">
    <p class="mb-6 text-lg font-semibold dark:text-white">Create a free account</p>
    <!-- <TextField
      label="Full Name"
      bind:value={fields.name}
      type="text"
      autoFocus={true}
      placeholder="e.g Joke Silva"
      className="mb-6"
      inputClassName="w-full"
      isDisabled={loading}
      errorMessage={errors.name}
      isRequired
    /> -->
    <TextField
      label={$t('login.fields.email')}
      bind:value={fields.email}
      type="email"
      placeholder="you@domain.com"
      className="mb-6"
      inputClassName="w-full"
      isDisabled={loading}
      errorMessage={$t(errors.email ?? '')}
      isRequired
    />
    <TextField
      label={$t('login.fields.password')}
      bind:value={fields.password}
      type="password"
      placeholder="************"
      className="mb-6"
      inputClassName="w-full"
      isDisabled={loading}
      errorMessage={$t(errors.password ?? '')}
      helperMessage={$t('login.fields.password_helper_message')}
      isRequired
    />
    <TextField
      label={$t('login.fields.confirm_password')}
      bind:value={fields.confirmPassword}
      type="password"
      placeholder="************"
      className="mb-6"
      inputClassName="w-full"
      isDisabled={loading}
      errorMessage={errors.confirmPassword}
      isRequired
    />
    {#if submitError}
      <p class="text-sm text-red-500">{submitError}</p>
    {/if}
  </div>

  <div class="my-4 flex w-full items-center justify-end">
    <PrimaryButton
      label={$t('login.create_account')}
      type="submit"
      className="sm:w-full w-full"
      isDisabled={disableSubmit || loading}
      isLoading={loading}
    />
  </div>
</AuthUI>
