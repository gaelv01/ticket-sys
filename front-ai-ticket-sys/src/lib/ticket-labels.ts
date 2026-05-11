export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type TicketType = 'CORRECTIVE' | 'PREVENTIVE';
export type Impact = 'HIGH' | 'MEDIUM' | 'LOW';
export type Category =
  | 'PRODUCTION'
  | 'TECHNICAL'
  | 'ADMINISTRATIVE'
  | 'INFRASTRUCTURE'
  | 'OTHER';

export interface ChipConfig {
  label: string;
  chipClass: string;
}

export const severityConfig: Record<Severity, ChipConfig> = {
  CRITICAL: { label: 'Crítico',  chipClass: 'bg-red-500/15 text-red-300 border-red-500/30' },
  HIGH:     { label: 'Alto',     chipClass: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
  MEDIUM:   { label: 'Medio',    chipClass: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  LOW:      { label: 'Bajo',     chipClass: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30' },
};

export const typeConfig: Record<TicketType, ChipConfig> = {
  CORRECTIVE: { label: 'Correctivo', chipClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  PREVENTIVE: { label: 'Preventivo', chipClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
};

export const impactConfig: Record<Impact, ChipConfig> = {
  HIGH:   { label: 'Impacto alto',  chipClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  MEDIUM: { label: 'Impacto medio', chipClass: 'bg-amber-500/10 text-amber-200 border-amber-500/20' },
  LOW:    { label: 'Impacto bajo',  chipClass: 'bg-amber-500/5 text-amber-200/70 border-amber-500/15' },
};

export const categoryConfig: Record<Category, ChipConfig> = {
  PRODUCTION:     { label: 'Producción',     chipClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  TECHNICAL:      { label: 'Técnica',        chipClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  ADMINISTRATIVE: { label: 'Administrativa', chipClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  INFRASTRUCTURE: { label: 'Infraestructura', chipClass: 'bg-pink-500/15 text-pink-300 border-pink-500/30' },
  OTHER:          { label: 'Otro',           chipClass: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30' },
};