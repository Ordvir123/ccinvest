-- Create the two admin users for CC Invest.
-- Run this in your Supabase project: SQL Editor → New query → Run.
-- Requires the pgcrypto extension (enabled by default on Supabase).

-- Helper: insert a confirmed email/password user into auth.users + auth.identities
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
    -- Skip if the user already exists
    if exists (select 1 from auth.users where email = v_user.email) then
      raise notice 'User % already exists, skipping', v_user.email;
      continue;
    end if;

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

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', v_user.email, 'email_verified', true),
      'email', now(), now(), now()
    );

    raise notice 'Created user %', v_user.email;
  end loop;
end $$;
