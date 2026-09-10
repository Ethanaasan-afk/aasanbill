  -- Optional IMEI/serial on catalog products (Mobile Shop).
  -- Paste in Supabase SQL Editor if product save complains about imei_serial.

  alter table public.products
    add column if not exists imei_serial text;

  notify pgrst, 'reload schema';
