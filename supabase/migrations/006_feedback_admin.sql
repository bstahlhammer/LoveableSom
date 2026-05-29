-- Allow the admin user to read and update all feedback rows.
-- The insert policy from 001-feedback-capture already exists.

create policy "admin can read feedback"
  on feedback for select
  to authenticated
  using (auth.jwt() ->> 'email' = 'bstahlhammer@gmail.com');

create policy "admin can update feedback"
  on feedback for update
  to authenticated
  using  (auth.jwt() ->> 'email' = 'bstahlhammer@gmail.com')
  with check (auth.jwt() ->> 'email' = 'bstahlhammer@gmail.com');
