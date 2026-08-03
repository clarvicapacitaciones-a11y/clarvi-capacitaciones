// Acceso a datos del módulo de exámenes.
//
// El admin lee y escribe las preguntas completas (RLS se lo permite); el
// usuario nunca toca `exam_questions`: abre y entrega su examen por RPC, que
// es donde vive la calificación.

import { supabase } from '@/services/supabase'
import type { Json } from '@/types/database.types'
import type {
  AnswerKey,
  AttemptAnswers,
  AttemptWithProfile,
  ExamDraft,
  ExamineeSummary,
  ExamResult,
  ExamStatus,
  ExamQuestionDraft,
  QuestionContent,
  QuestionStat,
  QuestionType,
  StartedAttempt,
} from '@/types/exams'

// ── Constructor (admin) ────────────────────────────────────────────────────

/** Examen de una capacitación con sus preguntas, listo para editar. */
export async function getExamForEdit(
  trainingId: string,
): Promise<ExamDraft | null> {
  const { data: exam, error } = await supabase
    .from('exams')
    .select('*')
    .eq('training_id', trainingId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!exam) return null

  const { data: questions, error: questionsError } = await supabase
    .from('exam_questions')
    .select('*')
    .eq('exam_id', exam.id)
    .order('position', { ascending: true })
  if (questionsError) throw new Error(questionsError.message)

  return {
    id: exam.id,
    title: exam.title ?? '',
    instructions: exam.instructions ?? '',
    passing_percent: exam.passing_percent,
    max_attempts: exam.max_attempts === null ? '' : String(exam.max_attempts),
    requires_video_completed: exam.requires_video_completed,
    shuffle_questions: exam.shuffle_questions,
    is_published: exam.is_published,
    questions: questions.map((question) => ({
      id: question.id,
      key: question.id,
      type: question.type,
      prompt: question.prompt,
      points: question.points,
      explanation: question.explanation ?? '',
      content: question.content as unknown as QuestionContent,
      answer_key: question.answer_key as unknown as AnswerKey,
    })),
  }
}

/**
 * Guarda el examen completo. El servidor valida la forma de cada pregunta y
 * reconcilia altas, cambios y bajas en una sola transacción.
 */
export async function saveExam(
  trainingId: string,
  draft: ExamDraft,
): Promise<string> {
  // El id del examen no viaja: la capacitación es su clave (training_id unique).
  const { questions, ...settings } = draft
  // Los argumentos jsonb están tipados como `Json` (índice abierto); nuestros
  // tipos de dominio son más estrictos, así que el cast va aquí, en la frontera.
  const { data, error } = await supabase.rpc('save_exam', {
    p_training_id: trainingId,
    p_exam: {
      title: settings.title,
      instructions: settings.instructions,
      passing_percent: settings.passing_percent,
      max_attempts: settings.max_attempts,
      requires_video_completed: settings.requires_video_completed,
      shuffle_questions: settings.shuffle_questions,
      is_published: settings.is_published,
    },
    p_questions: questions.map(toQuestionPayload) as unknown as Json,
  })
  if (error) throw new Error(error.message)
  return data
}

function toQuestionPayload(question: ExamQuestionDraft) {
  return {
    id: question.id ?? '',
    type: question.type,
    prompt: question.prompt,
    points: question.points,
    explanation: question.explanation,
    content: question.content,
    answer_key: question.answer_key,
  }
}

/** Borra el examen; los intentos se van con él (cascade). */
export async function deleteExam(trainingId: string): Promise<void> {
  const { error } = await supabase
    .from('exams')
    .delete()
    .eq('training_id', trainingId)
  if (error) throw new Error(error.message)
}

// ── Aplicación (usuario) ───────────────────────────────────────────────────

export async function getExamStatus(trainingId: string): Promise<ExamStatus> {
  const { data, error } = await supabase.rpc('exam_status_for_training', {
    p_training_id: trainingId,
  })
  if (error) throw new Error(error.message)
  return data as unknown as ExamStatus
}

/** Abre el examen (o retoma el intento sin entregar) y trae las preguntas. */
export async function startAttempt(trainingId: string): Promise<StartedAttempt> {
  const { data, error } = await supabase.rpc('start_exam_attempt', {
    p_training_id: trainingId,
  })
  if (error) throw new Error(error.message)
  return data as unknown as StartedAttempt
}

export async function submitAttempt(
  attemptId: string,
  answers: AttemptAnswers,
): Promise<ExamResult> {
  const { data, error } = await supabase.rpc('submit_exam_attempt', {
    p_attempt_id: attemptId,
    p_answers: answers as unknown as Json,
  })
  if (error) throw new Error(error.message)
  return data as unknown as ExamResult
}

// ── Reportes (admin) ───────────────────────────────────────────────────────

export async function listExamAttempts(
  examId: string,
): Promise<AttemptWithProfile[]> {
  const { data, error } = await supabase
    .from('exam_attempts')
    .select('*, profiles(full_name, areas(nombre), sucursales(nombre))')
    .eq('exam_id', examId)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as unknown as AttemptWithProfile[]
}

/** Una fila por persona con su mejor resultado (agregado en el cliente). */
export function summarizeByExaminee(
  attempts: AttemptWithProfile[],
): ExamineeSummary[] {
  const byUser = new Map<string, ExamineeSummary>()

  for (const attempt of attempts) {
    const current = byUser.get(attempt.user_id)
    const percent = attempt.score_percent ?? 0
    if (!current) {
      byUser.set(attempt.user_id, {
        userId: attempt.user_id,
        fullName: attempt.profiles?.full_name ?? '—',
        area: attempt.profiles?.areas?.nombre ?? '—',
        sucursal: attempt.profiles?.sucursales?.nombre ?? '—',
        attempts: 1,
        bestPercent: percent,
        passed: attempt.passed === true,
        lastSubmittedAt: attempt.submitted_at,
      })
      continue
    }
    current.attempts += 1
    current.bestPercent = Math.max(current.bestPercent, percent)
    current.passed = current.passed || attempt.passed === true
    // listExamAttempts viene ordenado por fecha desc: el primero es el último.
  }

  return [...byUser.values()].sort((a, b) => b.bestPercent - a.bestPercent)
}

interface AnswerStatRow {
  question_id: string | null
  is_correct: boolean
  question_snapshot: { prompt?: string; type?: QuestionType } | null
}

/**
 * Porcentaje de acierto por pregunta, para detectar temas mal entendidos.
 * Recibe los intentos que ya cargó listExamAttempts en vez de volver a
 * resolverlos con un join.
 */
export async function questionStats(
  attemptIds: string[],
): Promise<QuestionStat[]> {
  if (attemptIds.length === 0) return []

  const { data, error } = await supabase
    .from('exam_attempt_answers')
    .select('question_id, is_correct, question_snapshot')
    .in('attempt_id', attemptIds)
  if (error) throw new Error(error.message)

  const rows = data as unknown as AnswerStatRow[]
  const byQuestion = new Map<string, QuestionStat>()

  for (const row of rows) {
    // question_id es null si la pregunta se borró después; el snapshot la
    // conserva, así que el reporte histórico no pierde el renglón.
    const key = row.question_id ?? `snapshot:${row.question_snapshot?.prompt ?? ''}`
    const stat = byQuestion.get(key) ?? {
      questionId: key,
      prompt: row.question_snapshot?.prompt ?? 'Pregunta eliminada',
      type: row.question_snapshot?.type ?? 'multiple_choice',
      answered: 0,
      correct: 0,
      accuracy: 0,
    }
    stat.answered += 1
    if (row.is_correct) stat.correct += 1
    stat.accuracy = (stat.correct / stat.answered) * 100
    byQuestion.set(key, stat)
  }

  return [...byQuestion.values()].sort((a, b) => a.accuracy - b.accuracy)
}
