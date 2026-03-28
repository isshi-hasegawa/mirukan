drop policy if exists "owners can update their manual works" on public.works;

create policy "owners can update their own works"
on public.works
for update
to authenticated
using (
  created_by = auth.uid()
)
with check (
  created_by = auth.uid()
);
