  -- Private bucket for invoice PDFs shared via WhatsApp (signed URLs, 7-day TTL in app)
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'invoice-pdfs',
    'invoice-pdfs',
    false,
    10485760,
    array['application/pdf']::text[]
  )
  on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

  -- Uploads go through the service-role API route after session auth.
  -- Allow authenticated users to read objects under their org folder (optional; signed URLs also work).
  drop policy if exists "invoice_pdfs_select_own_org" on storage.objects;
  create policy "invoice_pdfs_select_own_org"
    on storage.objects for select
    to authenticated
    using (
      bucket_id = 'invoice-pdfs'
      and (storage.foldername(name))[1] = public.current_org_id()::text
    );
