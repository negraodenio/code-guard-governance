-- handle_new_user() function and on_auth_user_created trigger
-- are defined in 99_fix_tenants_trigger.sql (canonical version).
-- That version creates the tenants row first, then the profile,
-- ensuring FK constraints are satisfied.

-- 1. Garante que RLS está habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Policy: SERVIÇO pode inserir profiles (via trigger)
DROP POLICY IF EXISTS "Service can insert profiles" ON public.profiles;
CREATE POLICY "Service can insert profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true); -- permite qualquer INSERT (trigger roda como service_role)

-- 5. Policy: usuário pode ver próprio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 6. Policy: usuário pode editar próprio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
