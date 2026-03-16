import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-uuid',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the latest firmware
    const { data: firmware, error } = await supabase
      .from('firmware')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !firmware) {
      console.log('No firmware available')
      return new Response(
        JSON.stringify({ 
          version: '1.0.0',
          url: null,
          changelog: 'Initial version',
          message: 'No firmware updates available'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Firmware available: v${firmware.version}`)

    return new Response(
      JSON.stringify({
        version: firmware.version,
        url: firmware.url,
        changelog: firmware.changelog,
        created_at: firmware.created_at
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Get firmware error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
