// Interruptores de funcionalidad que todavía no se abren a la gente.
//
// La infraestructura de diplomas ya está completa y funcionando: la base de
// datos los emite sola al aprobar el examen (o al completar el video cuando la
// capacitación no tiene examen) y los va acumulando. Lo único apagado es la
// interfaz. Poner `diplomas: true` enciende, de una vez:
//   · el bloque "Mis diplomas" del perfil,
//   · el botón de descarga en la ficha de la capacitación,
//   · la ruta /diploma/:id con el formato imprimible.

// El tipo se anota a mano (en vez de `as const`) para que las pantallas que
// dependen de una bandera apagada sigan siendo código vivo para el
// type-check: encenderla no debe destapar errores dormidos.
export const FEATURES: { diplomas: boolean } = {
  diplomas: false,
}
