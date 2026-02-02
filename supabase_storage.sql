-- Create the storage bucket for products
insert into storage.buckets (id, name, public)
values ('products', 'products', true);

-- Policy to allow public read access to product images
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'products' );

-- Policy to allow authenticated users to upload product images
create policy "Authenticated Upload"
  on storage.objects for insert
  with check ( bucket_id = 'products' and auth.role() = 'authenticated' );

-- Policy to allow authenticated users to update their uploads (optional, usually for replacing)
create policy "Authenticated Update"
  on storage.objects for update
  with check ( bucket_id = 'products' and auth.role() = 'authenticated' );

-- Policy to allow authenticated users to delete their uploads
create policy "Authenticated Delete"
  on storage.objects for delete
  using ( bucket_id = 'products' and auth.role() = 'authenticated' );
