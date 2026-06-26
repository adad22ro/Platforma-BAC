import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logError } from '@/lib/log-error'

export async function POST(req: NextRequest) {
  let evt
  try {
    evt = await verifyWebhook(req)
  } catch (err) {
    console.error('Clerk webhook verification failed:', err)
    await logError('clerk-webhook', 'Verification failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return new Response('Verification failed', { status: 400 })
  }

  if (evt.type === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data
    const email = email_addresses[0]?.email_address
    const full_name = `${first_name ?? ''} ${last_name ?? ''}`.trim() || null

    const { error } = await supabaseAdmin.from('users').insert({
      id: crypto.randomUUID(),
      clerk_id: id,
      email,
      full_name,
    })

    if (error) {
      console.error('Supabase insert error:', error)
      await logError('clerk-webhook', 'Supabase insert error', {
        type: evt.type,
        clerk_id: id,
        code: error.code,
        message: error.message,
      })
      return new Response('Database error', { status: 500 })
    }
  }

  if (evt.type === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data
    const email = email_addresses[0]?.email_address
    const full_name = `${first_name ?? ''} ${last_name ?? ''}`.trim() || null

    const { error } = await supabaseAdmin
      .from('users')
      .update({ email, full_name })
      .eq('clerk_id', id)

    if (error) console.error('Supabase update error:', error)
  }

  if (evt.type === 'user.deleted') {
    const { id } = evt.data
    if (id) {
      const { error } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('clerk_id', id)

      if (error) console.error('Supabase delete error:', error)
    }
  }

  return new Response('OK', { status: 200 })
}
