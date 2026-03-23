import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

And add to your `.env.local` file (create it if it doesn't exist, in the project root):
```
NEXT_PUBLIC_SUPABASE_URL=https://bouzdjjpliizwwwxsgrc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_O2WwTTRcy5YG-TAJ8MjqSw_EoHpK94K