/** Quick replies for the agency lead inbox: warm Spanish with "tú" (and English). {nombre} = the lead's first name. */
export const QUICK_REPLIES: { id: string; label: [string, string]; es: string; en: string }[] = [
  { id: "visit", label: ["Proponer visita", "Offer a tour"], es: "¡Hola {nombre}! Gracias por escribir. ¿Te viene bien una visita esta semana?", en: "Hi {nombre}! Thanks for reaching out. Would a tour this week work for you?" },
  { id: "available", label: ["Sigue disponible", "Still available"], es: "¡Hola {nombre}! Sí, el inmueble sigue disponible. ¿Quieres que te cuente más detalles o prefieres verlo en persona?", en: "Hi {nombre}! Yes, the home is still available. Want more details, or would you rather see it in person?" },
  { id: "call", label: ["Llamada", "Call"], es: "¡Hola {nombre}! ¿Te llamo hoy para resolver tus dudas? Dime a qué hora te queda mejor.", en: "Hi {nombre}! Can I call you today to answer your questions? Let me know what time suits you." },
  { id: "qualify", label: ["Presupuesto y fechas", "Budget & timing"], es: "¡Gracias, {nombre}! Para ayudarte mejor: ¿cuál es tu presupuesto aproximado y para cuándo te gustaría mudarte?", en: "Thanks, {nombre}! To help you better: what's your approximate budget and when would you like to move?" },
  { id: "similar", label: ["Opciones similares", "Similar options"], es: "¡Hola {nombre}! Te preparé algunas opciones parecidas en la zona. ¿Te las envío por aquí?", en: "Hi {nombre}! I've put together a few similar options in the area. Shall I send them here?" },
];

/** Fills {nombre} with the first name. Without a name the placeholder and its comma go away ("¡Hola!", never "¡Hola !"). */
export function fillReply(text: string, name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? "";
  if (first) return text.replaceAll("{nombre}", first);
  return text.replace(/,? ?\{nombre\}/g, "").replace(/\s+([!?.,])/g, "$1");
}
