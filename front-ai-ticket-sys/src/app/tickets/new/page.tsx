'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { AxiosError } from 'axios';
import {
  Sparkles,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import {
  severityConfig,
  typeConfig,
  impactConfig,
  categoryConfig,
  Severity,
  TicketType,
  Impact,
  Category,
} from '@/lib/ticket-labels';

interface FormData {
  title: string;
  description: string;
  assignedToId: string;
}

interface UserOption {
  uuid: string;
  username: string;
  role: 'ADMIN' | 'CLIENTE';
}

interface AiSuggestion {
  severity: Severity;
  type: TicketType;
  impact: Impact;
  category: Category;
  confidence: number;
}

export default function NewTicketPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [classification, setClassification] = useState<AiSuggestion | null>(null);
  const [editing, setEditing] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>();

  const title = watch('title');
  const description = watch('description');
  const canClassify = (title?.length ?? 0) >= 3 && (description?.length ?? 0) >= 10;

  // Cargar lista de usuarios y verificar autenticación
  useEffect(() => {
    if (!authStorage.isAuthenticated()) {
      router.push('/login');
      return;
    }
    api
      .get<UserOption[]>('/users')
      .then((res) => setUsers(res.data))
      .catch(() => {
        // si falla, no bloqueamos la creación (asignación es opcional)
      });
  }, [router]);

  const handleClassify = async () => {
    if (!canClassify) return;
    setClassifying(true);
    setServerError('');
    try {
      const res = await api.post<AiSuggestion>('/tickets/classify', {
        title,
        description,
      });
      setAiSuggestion(res.data);
      setClassification(res.data); // arranca igual; editing puede cambiarlo
      setEditing(false);
    } catch {
      setServerError('No se pudo obtener la sugerencia de IA. Intenta de nuevo.');
    } finally {
      setClassifying(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!classification) {
      setServerError('Primero solicita la clasificación con IA');
      return;
    }
    setSubmitting(true);
    setServerError('');
    try {
      await api.post('/tickets', {
        title: data.title,
        description: data.description,
        severity: classification.severity,
        type: classification.type,
        impact: classification.impact,
        category: classification.category,
        assignedToId: data.assignedToId || undefined,
        aiSuggested: true,
        aiConfidence: aiSuggestion?.confidence,
        aiPayload: aiSuggestion,
      });
      router.push('/dashboard');
    } catch (error) {
      if (error instanceof AxiosError) {
        setServerError(
          error.response?.data?.message?.toString() ??
            'No se pudo crear el ticket',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-sm text-muted-light hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al dashboard
        </button>

        <div className="rounded-2xl border border-card-border bg-card">
          {/* Card header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Nueva incidencia
            </h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-muted hover:text-foreground transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
            {/* Título */}
            <div>
              <label htmlFor="title" className="block text-sm font-semibold mb-2">
                Título de la incidencia <span className="text-danger">*</span>
              </label>
              <input
                id="title"
                type="text"
                placeholder="Servidor principal caído en producción"
                {...register('title', {
                  required: 'El título es obligatorio',
                  minLength: { value: 3, message: 'Mínimo 3 caracteres' },
                  maxLength: { value: 200, message: 'Máximo 200 caracteres' },
                })}
                className={`w-full px-3 py-3 bg-input rounded-lg outline-none transition-colors focus:border-primary border ${
                  errors.title ? 'border-danger' : 'border-input-border'
                }`}
              />
              {errors.title && (
                <p className="mt-1 text-xs text-danger">{errors.title.message}</p>
              )}
            </div>

            {/* Descripción */}
            <div>
              <label htmlFor="description" className="block text-sm font-semibold mb-2">
                Descripción — qué ocurrió y cómo
              </label>
              <textarea
                id="description"
                rows={4}
                placeholder="El servidor de producción principal dejó de responder a las 08:42. Los logs indican un fallo en el proceso de base de datos..."
                {...register('description', {
                  required: 'La descripción es obligatoria',
                  minLength: { value: 10, message: 'Mínimo 10 caracteres' },
                  maxLength: { value: 2000, message: 'Máximo 2000 caracteres' },
                })}
                className={`w-full px-3 py-3 bg-input rounded-lg outline-none transition-colors focus:border-primary border resize-none ${
                  errors.description ? 'border-danger' : 'border-input-border'
                }`}
              />
              {errors.description && (
                <p className="mt-1 text-xs text-danger">{errors.description.message}</p>
              )}
            </div>

            {/* Botón de clasificar con IA (mientras no haya clasificación) */}
            {!classification && (
              <button
                type="button"
                onClick={handleClassify}
                disabled={!canClassify || classifying}
                className="w-full py-3 px-4 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {classifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analizando con IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Sugerir clasificación con IA
                  </>
                )}
              </button>
            )}

            {/* Caja de clasificación sugerida */}
            {classification && (
              <div className="px-4 py-4 rounded-xl bg-primary/10 border border-primary/30">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold text-primary">
                    Clasificación sugerida por IA
                  </p>
                </div>

                {/* Chips */}
                <div className="flex flex-wrap gap-2">
                  <Chip {...severityConfig[classification.severity]} />
                  <Chip {...typeConfig[classification.type]} />
                  <Chip {...impactConfig[classification.impact]} />
                  <Chip {...categoryConfig[classification.category]} />
                </div>

                {/* Confianza y editar */}
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-light">
                    Confianza:{' '}
                    <span className="text-primary font-semibold">
                      {Math.round((aiSuggestion?.confidence ?? 0) * 100)}%
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditing(!editing)}
                    className="text-primary hover:underline"
                  >
                    {editing ? 'Cerrar edición' : 'Editar clasificación'}
                  </button>
                </div>

                {/* Dropdowns de edición */}
                {editing && (
                  <div className="mt-4 grid grid-cols-2 gap-3 pt-4 border-t border-primary/20">
                    <EditSelect
                      label="Severidad"
                      value={classification.severity}
                      options={Object.entries(severityConfig).map(([v, c]) => ({
                        value: v,
                        label: c.label,
                      }))}
                      onChange={(v) =>
                        setClassification({
                          ...classification,
                          severity: v as Severity,
                        })
                      }
                    />
                    <EditSelect
                      label="Tipo"
                      value={classification.type}
                      options={Object.entries(typeConfig).map(([v, c]) => ({
                        value: v,
                        label: c.label,
                      }))}
                      onChange={(v) =>
                        setClassification({
                          ...classification,
                          type: v as TicketType,
                        })
                      }
                    />
                    <EditSelect
                      label="Impacto"
                      value={classification.impact}
                      options={Object.entries(impactConfig).map(([v, c]) => ({
                        value: v,
                        label: c.label,
                      }))}
                      onChange={(v) =>
                        setClassification({
                          ...classification,
                          impact: v as Impact,
                        })
                      }
                    />
                    <EditSelect
                      label="Categoría"
                      value={classification.category}
                      options={Object.entries(categoryConfig).map(([v, c]) => ({
                        value: v,
                        label: c.label,
                      }))}
                      onChange={(v) =>
                        setClassification({
                          ...classification,
                          category: v as Category,
                        })
                      }
                    />
                  </div>
                )}
              </div>
            )}

            {/* Asignar a */}
            <div>
              <label htmlFor="assignedToId" className="block text-sm font-semibold mb-2">
                Asignar a <span className="text-muted text-xs font-normal">(opcional)</span>
              </label>
              <select
                id="assignedToId"
                {...register('assignedToId')}
                className="w-full px-3 py-3 bg-input border border-input-border rounded-lg outline-none focus:border-primary transition-colors"
              >
                <option value="">Sin asignar</option>
                {users.map((u) => (
                  <option key={u.uuid} value={u.uuid}>
                    {u.username} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Error del servidor */}
            {serverError && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-danger-bg border border-danger/30">
                <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                <p className="text-sm text-danger">{serverError}</p>
              </div>
            )}
          </form>

          {/* Footer con botones */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-card-border">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-card border border-card-border hover:bg-input rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={submitting || !classification}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Crear ticket
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

// --- Componentes auxiliares ---

function Chip({ label, chipClass }: { label: string; chipClass: string }) {
  return (
    <span
      className={`px-3 py-1 text-xs font-semibold rounded-full border ${chipClass}`}
    >
      {label}
    </span>
  );
}

function EditSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-muted-light mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-2 text-sm bg-input border border-input-border rounded-lg outline-none focus:border-primary transition-colors"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}