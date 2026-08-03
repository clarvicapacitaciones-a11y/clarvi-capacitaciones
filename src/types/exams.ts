// Tipos del módulo de exámenes.
//
// `database.types.ts` es generado y deja `content` / `answer_key` como `Json`
// opaco. Aquí se les da forma por tipo de pregunta, en dos vistas distintas:
//   - `ExamQuestionDraft`: lo que edita el admin (incluye la respuesta correcta)
//   - `RunnerQuestion`: lo que recibe el usuario (saneado por el servidor)

import type { Database, Tables } from './database.types'

export type QuestionType = Database['public']['Enums']['question_type']

export type Exam = Tables<'exams'>
export type ExamQuestion = Tables<'exam_questions'>
export type ExamAttempt = Tables<'exam_attempts'>

export const QUESTION_TYPES: QuestionType[] = [
  'multiple_choice',
  'multiple_select',
  'true_false',
  'matching',
  'ordering',
  'fill_blank',
]

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Opción múltiple',
  multiple_select: 'Selección múltiple',
  true_false: 'Verdadero o falso',
  matching: 'Relacionar conceptos',
  ordering: 'Ordenar pasos',
  fill_blank: 'Completar la frase',
}

export const QUESTION_TYPE_HINTS: Record<QuestionType, string> = {
  multiple_choice: 'Varias opciones, una sola correcta.',
  multiple_select: 'Varias opciones, varias correctas. Se califica proporcionalmente.',
  true_false: 'El usuario elige verdadero o falso.',
  matching: 'El usuario empareja cada concepto de la izquierda con uno de la derecha.',
  ordering: 'El usuario acomoda los pasos en el orden correcto.',
  fill_blank: 'Escribe la frase y marca los huecos con {{1}}, {{2}}…',
}

// ── Piezas comunes ─────────────────────────────────────────────────────────

export interface ExamItem {
  id: string
  text: string
}

export interface BlankSlot {
  id: string
}

// ── Contenido (lo que se muestra) ──────────────────────────────────────────

export interface OptionsContent {
  options: ExamItem[]
}

export interface MatchingContent {
  left: ExamItem[]
  right: ExamItem[]
}

export interface OrderingContent {
  items: ExamItem[]
}

export interface FillBlankContent {
  text: string
  blanks: BlankSlot[]
  word_bank?: string[]
}

export type QuestionContent =
  | OptionsContent
  | MatchingContent
  | OrderingContent
  | FillBlankContent
  | Record<string, never>

// ── Respuesta correcta (solo del lado admin/servidor) ──────────────────────

export interface SingleChoiceKey {
  option_id: string
}

export interface MultiChoiceKey {
  option_ids: string[]
}

export interface TrueFalseKey {
  value: boolean
}

export interface MatchingKey {
  /** id del concepto izquierdo → id del concepto derecho */
  pairs: Record<string, string>
}

export interface OrderingKey {
  order: string[]
}

export interface FillBlankKey {
  /** id del hueco → respuestas aceptadas (se comparan sin acentos ni mayúsculas) */
  blanks: Record<string, string[]>
}

export type AnswerKey =
  | SingleChoiceKey
  | MultiChoiceKey
  | TrueFalseKey
  | MatchingKey
  | OrderingKey
  | FillBlankKey

// ── Borrador que edita el admin ────────────────────────────────────────────

export interface ExamQuestionDraft {
  /** null mientras la pregunta no se ha guardado. */
  id: string | null
  /** Identidad estable en el cliente, para que reordenar no remonte el editor. */
  key: string
  type: QuestionType
  prompt: string
  points: number
  explanation: string
  content: QuestionContent
  answer_key: AnswerKey
}

export interface ExamDraft {
  /** null mientras el examen no se ha guardado. */
  id: string | null
  title: string
  instructions: string
  passing_percent: number
  /** Cadena vacía = intentos ilimitados. */
  max_attempts: string
  requires_video_completed: boolean
  shuffle_questions: boolean
  is_published: boolean
  questions: ExamQuestionDraft[]
}

// ── Respuestas del usuario ─────────────────────────────────────────────────

export type QuestionResponse =
  | { option_id: string }
  | { option_ids: string[] }
  | { value: boolean }
  | { pairs: Record<string, string> }
  | { order: string[] }
  | { blanks: Record<string, string> }
  | Record<string, never>

/** Respuestas de un intento, indexadas por id de pregunta. */
export type AttemptAnswers = Record<string, QuestionResponse>

// ── Lo que devuelven los RPC ───────────────────────────────────────────────

export type BlockReason = 'not_published' | 'video_incomplete' | 'no_attempts_left'

export interface ExamStatus {
  has_exam: boolean
  exam_id?: string
  is_published?: boolean
  title?: string | null
  instructions?: string | null
  question_count?: number
  total_points?: number
  passing_percent?: number
  max_attempts?: number | null
  requires_video_completed?: boolean
  attempts_used?: number
  best_percent?: number | null
  passed?: boolean
  open_attempt_id?: string | null
  can_attempt?: boolean
  block_reason?: BlockReason | null
}

/** Pregunta ya saneada: nunca trae `answer_key`. */
export interface RunnerQuestion {
  id: string
  type: QuestionType
  prompt: string
  points: number
  content: QuestionContent
}

export interface StartedAttempt {
  attempt_id: string
  exam_id: string
  title: string | null
  instructions: string | null
  passing_percent: number
  questions: RunnerQuestion[]
}

export interface ReviewItem {
  question_id: string
  type: QuestionType
  prompt: string
  content: QuestionContent
  response: QuestionResponse
  correct_answer: AnswerKey
  is_correct: boolean
  points: number
  points_awarded: number
  explanation: string | null
}

export interface ExamResult {
  attempt_id: string
  score: number
  max_score: number
  percent: number
  passing_percent: number
  passed: boolean
  review: ReviewItem[]
}

// ── Reportes del admin ─────────────────────────────────────────────────────

export interface AttemptWithProfile extends ExamAttempt {
  profiles: {
    full_name: string
    areas: { nombre: string } | null
    sucursales: { nombre: string } | null
  } | null
}

/** Una fila por persona: su mejor resultado y cuántas veces lo presentó. */
export interface ExamineeSummary {
  userId: string
  fullName: string
  area: string
  sucursal: string
  attempts: number
  bestPercent: number
  passed: boolean
  lastSubmittedAt: string | null
}

export interface QuestionStat {
  questionId: string
  prompt: string
  type: QuestionType
  answered: number
  correct: number
  accuracy: number
}

// ── Fábricas ───────────────────────────────────────────────────────────────

/** Ids cortos y estables para opciones, conceptos y pasos dentro de una pregunta. */
export function newItemId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function newItem(text = ''): ExamItem {
  return { id: newItemId(), text }
}

/** Pregunta nueva con la estructura mínima que exige el servidor por tipo. */
export function emptyQuestion(type: QuestionType): ExamQuestionDraft {
  const base = {
    id: null,
    key: newItemId(),
    type,
    prompt: '',
    points: 1,
    explanation: '',
  }

  switch (type) {
    case 'multiple_choice': {
      const options = [newItem(), newItem()]
      return { ...base, content: { options }, answer_key: { option_id: '' } }
    }
    case 'multiple_select': {
      const options = [newItem(), newItem()]
      return { ...base, content: { options }, answer_key: { option_ids: [] } }
    }
    case 'true_false':
      return { ...base, content: {}, answer_key: { value: true } }
    case 'matching': {
      const left = [newItem(), newItem()]
      const right = [newItem(), newItem()]
      return {
        ...base,
        content: { left, right },
        answer_key: { pairs: { [left[0].id]: right[0].id, [left[1].id]: right[1].id } },
      }
    }
    case 'ordering': {
      const items = [newItem(), newItem(), newItem()]
      return {
        ...base,
        content: { items },
        answer_key: { order: items.map((item) => item.id) },
      }
    }
    case 'fill_blank':
      return {
        ...base,
        content: { text: '', blanks: [{ id: '1' }] },
        answer_key: { blanks: { '1': [''] } },
      }
  }
}

export function emptyExamDraft(): ExamDraft {
  return {
    id: null,
    title: '',
    instructions: '',
    passing_percent: 80,
    max_attempts: '',
    requires_video_completed: false,
    shuffle_questions: false,
    is_published: false,
    questions: [],
  }
}

// ── Utilidades de forma ────────────────────────────────────────────────────

export function isOptionsContent(content: QuestionContent): content is OptionsContent {
  return Array.isArray((content as OptionsContent).options)
}

export function isMatchingContent(content: QuestionContent): content is MatchingContent {
  return Array.isArray((content as MatchingContent).left)
}

export function isOrderingContent(content: QuestionContent): content is OrderingContent {
  return Array.isArray((content as OrderingContent).items)
}

export function isFillBlankContent(content: QuestionContent): content is FillBlankContent {
  return Array.isArray((content as FillBlankContent).blanks)
}

/**
 * Parte una frase con huecos en segmentos alternados de texto y hueco:
 * `"El pH es {{1}} a {{2}}"` → texto, hueco 1, texto, hueco 2.
 */
export type FraseSegment =
  | { kind: 'text'; text: string }
  | { kind: 'blank'; id: string }

export function splitBlanks(text: string): FraseSegment[] {
  const segments: FraseSegment[] = []
  const pattern = /\{\{\s*([^{}]+?)\s*\}\}/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', text: text.slice(lastIndex, match.index) })
    }
    segments.push({ kind: 'blank', id: match[1] })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    segments.push({ kind: 'text', text: text.slice(lastIndex) })
  }
  return segments
}

/** Ids de hueco en el orden en que aparecen en la frase, sin repetir. */
export function blankIdsFromText(text: string): string[] {
  const ids: string[] = []
  for (const segment of splitBlanks(text)) {
    if (segment.kind === 'blank' && !ids.includes(segment.id)) ids.push(segment.id)
  }
  return ids
}
