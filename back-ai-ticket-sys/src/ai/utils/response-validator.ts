import { Severity, TicketType, Impact, Category } from '@prisma/client';
import { TicketClassification } from '../interfaces/classifier.interface';

const VALID_SEVERITIES: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const VALID_TYPES: TicketType[] = ['CORRECTIVE', 'PREVENTIVE'];
const VALID_IMPACTS: Impact[] = ['HIGH', 'MEDIUM', 'LOW'];
const VALID_CATEGORIES: Category[] = [
  'PRODUCTION',
  'TECHNICAL',
  'ADMINISTRATIVE',
  'INFRASTRUCTURE',
  'OTHER',
];

export function parseClassificationResponse(
  raw: string,
): Omit<TicketClassification, 'provider'> {
  let cleaned = raw.trim();

  // Eliminar code fences si vinieran
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  }

  // Si hay texto antes/después, extraer solo el primer objeto JSON
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) cleaned = match[0];

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `AI response is not valid JSON: ${raw.substring(0, 200)}`,
    );
  }

  if (!VALID_SEVERITIES.includes(parsed.severity as Severity)) {
    throw new Error(`Invalid severity: ${parsed.severity}`);
  }
  if (!VALID_TYPES.includes(parsed.type as TicketType)) {
    throw new Error(`Invalid type: ${parsed.type}`);
  }
  if (!VALID_IMPACTS.includes(parsed.impact as Impact)) {
    throw new Error(`Invalid impact: ${parsed.impact}`);
  }
  if (!VALID_CATEGORIES.includes(parsed.category as Category)) {
    throw new Error(`Invalid category: ${parsed.category}`);
  }

  let confidence = Number(parsed.confidence);
  if (isNaN(confidence) || confidence < 0 || confidence > 1) {
    confidence = 0.5; // default si viene mal
  }

  return {
    severity: parsed.severity as Severity,
    type: parsed.type as TicketType,
    impact: parsed.impact as Impact,
    category: parsed.category as Category,
    confidence,
  };
}