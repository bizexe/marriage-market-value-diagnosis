import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'x-admin-password');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Auth check
  const pw = req.headers['x-admin-password'];
  if (!pw || pw !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Fetch all results
    const { data, error } = await supabase
      .from('diagnosis_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ results: data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
