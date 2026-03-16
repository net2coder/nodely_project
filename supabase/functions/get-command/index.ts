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
    const deviceUuid = req.headers.get('x-device-uuid')

    if (!deviceUuid) {
      return new Response(
        JSON.stringify({ error: 'x-device-uuid header is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: device, error } = await supabase
      .from('devices')
      .select('relay_state, locked')
      .eq('device_uuid', deviceUuid)
      .single()

    if (error || !device) {
      console.error('Device not found:', error)
      return new Response(
        JSON.stringify({ error: 'Device not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If device is locked, always return OFF
    const command = device.locked ? 'OFF' : (device.relay_state ? 'ON' : 'OFF')

    console.log(`Command for ${deviceUuid}: ${command} (locked: ${device.locked})`)

    return new Response(
      JSON.stringify({
        command,
        locked: device.locked
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Get command error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
