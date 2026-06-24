-- Create or repair the two admin users for CC Invest.
-- Run this in your Supabase project: SQL Editor → New query → Run.
-- Safe to re-run: existing users are confirmed and their passwords are reset.
-- Requires the pgcrypto extension (enabled by default on Supabase).

-- Helper: upsert confirmed email/password users into auth.users + auth.identities.
do $$
declare
  v_user record;
  v_id uuid;
begin
  for v_user in
    select * from (values
      ('sarah@ccinvest.co.il',   'Dvir1408'),
      ('corinne@ccinvest.co.il', 'Rubensa26')
    ) as t(email, password)
  loop
    select id into v_id from auth.users where lower(email) = lower(v_user.email) limit 1;

    if v_id is null then
      v_id := gen_random_uuid();

      insert into auth.users (
        instance_id, id, aud, role, email,
        encrypted_password, email_confirmed_at,
        created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_user.email,
        crypt(v_user.password, gen_salt('bf')), now(),
        now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
        '', '', '', ''
      );

      raise notice 'Created confirmed user %', v_user.email;
    else
      update auth.users
      set encrypted_password = crypt(v_user.password, gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          confirmation_sent_at = null,
          confirmation_token = '',
          recovery_token = '',
          email_change_token_new = '',
          email_change = '',
          aud = 'authenticated',
          role = 'authenticated',
          raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
          banned_until = null,
          deleted_at = null,
          updated_at = now()
      where id = v_id;

      raise notice 'Repaired confirmed user % and reset password', v_user.email;
    end if;

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      v_id, v_id, v_user.email,
      jsonb_build_object('sub', v_id::text, 'email', v_user.email, 'email_verified', true),
      'email', now(), now(), now()
    )
    on conflict (provider, provider_id) do update
      set user_id = excluded.user_id,
          identity_data = excluded.identity_data,
          updated_at = now();
  end loop;
end $$;
