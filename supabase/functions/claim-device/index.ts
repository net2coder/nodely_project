import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { device_uuid, device_name } = await req.json()

    if (!device_uuid) {
      return new Response(
        JSON.stringify({ error: 'device_uuid is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if device exists and is unclaimed
    const { data: device, error: fetchError } = await supabase
      .from('devices')
      .select('*')
      .eq('device_uuid', device_uuid)
      .single()

    if (fetchError || !device) {
      console.error('Device not found:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Device not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (device.claimed) {
      return new Response(
        JSON.stringify({ error: 'Device already claimed' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Claim the device
    const { error: updateError } = await supabase
      .from('devices')
      .update({
        owner_id: user.id,
        claimed: true,
        device_name: device_name || `Device ${device_uuid.slice(0, 8)}`
      })
      .eq('device_uuid', device_uuid)
      .eq('claimed', false)

    if (updateError) {
      console.error('Failed to claim device:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to claim device' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Device claimed: ${device_uuid} by user ${user.id}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        device_uuid,
        message: 'Device claimed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Claim device error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
