-- Local dev seed: creates the dev user with the same ID as prod (PHIL_ID).
-- The auth trigger auto-creates the profiles row on insert.
-- Email: dev@local.test  Password: devpassword

insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  role,
  aud,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change_token_current,
  email_change,
  phone,
  phone_confirmed_at
) values (
  '4c850486-c632-4f10-b328-14b2400edc0e',
  '00000000-0000-0000-0000-000000000000',
  'dev@local.test',
  crypt('devpassword', gen_salt('bf')),
  now(),
  'authenticated',
  'authenticated',
  now(),
  now(),
  '{"provider":"phone","providers":["phone","email"]}',
  '{"full_name":"Phil"}',
  '',
  '',
  '',
  '',
  '',
  '+11234567890',
  now()
) on conflict (id) do nothing;

-- Ensure the identity row exists (required for email/password sign-in)
insert into auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  created_at,
  updated_at,
  last_sign_in_at
) values (
  '4c850486-c632-4f10-b328-14b2400edc0e',
  '4c850486-c632-4f10-b328-14b2400edc0e',
  'dev@local.test',
  'email',
  jsonb_build_object('sub', '4c850486-c632-4f10-b328-14b2400edc0e', 'email', 'dev@local.test'),
  now(),
  now(),
  now()
) on conflict (provider, provider_id) do nothing;
