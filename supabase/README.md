# FarmAI Supabase foundation

`migrations/20261020_farmer_foundation.sql` is the database foundation for the Farmer Foundation release. It creates owner-scoped records for farms, fields, crop cycles, diary entries, private photo-case metadata, reminders, and weather alerts.

## Before applying it

1. Create the FarmAI Supabase project and enable the intended sign-in methods.
2. Apply the migration with the Supabase CLI or SQL Editor.
3. Create a **private** Storage bucket named `farmai-photo-cases`; upload only to an owner-prefixed path such as `<user-id>/<case-id>/<image-id>.webp`.
4. Add Storage policies that require the first path segment to equal `auth.uid()`. Do not make Crop Doctor images public.
5. Configure the production app with only the project URL and publishable/anon key. Keep the service-role key exclusively in protected server environments.

The migration intentionally contains no project URL, key, farmer data, or photo. It uses Row Level Security and ownership checks so records cannot be linked to another farmer's farm, field, crop cycle, or case.
