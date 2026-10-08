import type { CertificateValues, Student } from '@/types'
import { previousLevelOf, titleOf, type GraduationSystem } from './graduationSystems'

export interface EventValues {
  date: string
  location: string
  signerName: string
}

/**
 * Valores de um certificado: os dados do aluno, com títulos e cores do sistema de graduação,
 * e os do evento. Sem graduação anterior escolhida, usa a que vem antes no sistema.
 */
export function studentValues(
  student: Student,
  system: GraduationSystem | null | undefined,
  event: EventValues,
): CertificateValues {
  const previous = student.previousGraduation ?? previousLevelOf(system, student.graduation)
  return {
    name: student.name,
    graduation: student.graduation,
    graduationTitle: titleOf(system, student.graduation),
    previousGraduation: previous,
    previousGraduationTitle: previous ? titleOf(system, previous) : '',
    graduationPalette: system?.colors ?? [],
    date: event.date,
    location: event.location,
    signerName: event.signerName,
  }
}
