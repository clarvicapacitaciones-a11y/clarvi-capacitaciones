// Diplomas. Los emite la base de datos al cumplirse el requisito de la
// capacitación (examen aprobado o video completado); desde el cliente solo se
// leen: no hay forma de fabricarse uno.

import { supabase } from '@/services/supabase'
import type { CertificateWithSnapshot } from '@/types/domain'

export async function listMyCertificates(
  userId: string,
): Promise<CertificateWithSnapshot[]> {
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as unknown as CertificateWithSnapshot[]
}

export async function getCertificate(
  id: string,
): Promise<CertificateWithSnapshot | null> {
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as unknown as CertificateWithSnapshot | null
}

/** El diploma de una capacitación para una persona (null si no lo ha ganado). */
export async function getCertificateForTraining(
  trainingId: string,
  userId: string,
): Promise<CertificateWithSnapshot | null> {
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('training_id', trainingId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as unknown as CertificateWithSnapshot | null
}

/** Diplomas emitidos de una capacitación (admin). */
export async function listCertificatesForTraining(
  trainingId: string,
): Promise<CertificateWithSnapshot[]> {
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('training_id', trainingId)
    .order('earned_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as unknown as CertificateWithSnapshot[]
}
