-- Nodely Supabase Schema
-- Run this in your Supabase SQL Editor to set up the database

-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');

-- 2. Create devices table
CREATE TABLE public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_uuid text NOT NULL UNIQUE,
  hardware_id text NOT NULL,
  device_name text,
  owner_id uuid,
  relay_state boolean DEFAULT false,
  locked boolean DEFAULT false,
  firmware_version text DEFAULT '1.0.0',
  last_seen timestamptz,
  claimed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- 3. Create firmware table
CREATE TABLE public.firmware (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  url text NOT NULL,
  changelog text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.firmware ENABLE ROW LEVEL SECURITY;

-- 4. Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL DEFAULT 'customer',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 6. Create has_role function (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 7. Create handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$$;

-- 8. Attach trigger to auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. RLS Policies for devices
CREATE POLICY "Admins can view all devices" ON public.devices FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert devices" ON public.devices FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all devices" ON public.devices FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view their own devices" ON public.devices FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can update their own devices" ON public.devices FOR UPDATE USING (owner_id = auth.uid());

-- 10. RLS Policies for firmware
CREATE POLICY "Anyone can view firmware" ON public.firmware FOR SELECT USING (true);
CREATE POLICY "Admins can manage firmware" ON public.firmware FOR ALL USING (has_role(auth.uid(), 'admin'));

-- 11. RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- 12. RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- 13. Enable Realtime for devices
ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;
