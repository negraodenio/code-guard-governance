-- Consolidated trigger to create tenant and profile for new users
-- This ensures that every user has a valid tenant_id that exists in the tenants table.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id uuid;
BEGIN
  new_tenant_id := gen_random_uuid();
  
  -- 1. Create the tenant record first (required for FK constraints)
  -- Use dynamic name or default
  INSERT INTO public.tenants (id, name)
  VALUES (new_tenant_id, 'Personal Workspace')
  ON CONFLICT (id) DO NOTHING;

  -- 2. Create the profile record
  INSERT INTO public.profiles (id, email, tenant_id, role)
  VALUES (
    NEW.id,
    NEW.email,
    new_tenant_id,
    'admin' -- First user is admin of their own tenant
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    tenant_id = EXCLUDED.tenant_id;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
