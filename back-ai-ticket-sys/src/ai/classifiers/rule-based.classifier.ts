import { Injectable } from '@nestjs/common';
import { Severity, TicketType, Impact, Category } from '@prisma/client';
import {
  TicketClassifier,
  TicketClassification,
} from '../interfaces/classifier.interface';

@Injectable()
export class RuleBasedClassifier implements TicketClassifier {
  readonly name = 'rule-based';

  isAvailable(): boolean {
    return true; // siempre disponible
  }

  async classify(
    title: string,
    description: string,
  ): Promise<TicketClassification> {
    const text = `${title} ${description}`.toLowerCase();
    return {
      severity: this.detectSeverity(text),
      type: this.detectType(text),
      impact: this.detectImpact(text),
      category: this.detectCategory(text),
      confidence: this.calculateConfidence(text),
      provider: this.name,
    };
  }

  private detectSeverity(text: string): Severity {
    const critical = [
      'caído', 'caido', 'down', 'no responde', 'no funciona',
      'fuera de servicio', 'crítico', 'critico', 'urgente',
    ];
    const high = ['lento', 'error', 'falla', 'bloqueado', 'no puedo'];
    const medium = ['intermitente', 'a veces', 'ocasional'];
    if (critical.some((kw) => text.includes(kw))) return 'CRITICAL';
    if (high.some((kw) => text.includes(kw))) return 'HIGH';
    if (medium.some((kw) => text.includes(kw))) return 'MEDIUM';
    return 'LOW';
  }

  private detectType(text: string): TicketType {
    const corrective = [
      'error', 'falla', 'caído', 'caido', 'no funciona',
      'roto', 'crash', 'bug', 'no responde',
    ];
    return corrective.some((kw) => text.includes(kw))
      ? 'CORRECTIVE'
      : 'PREVENTIVE';
  }

  private detectImpact(text: string): Impact {
    const high = ['producción', 'production', 'todos los usuarios', 'clientes'];
    const medium = ['varios usuarios', 'equipo', 'área'];
    if (high.some((kw) => text.includes(kw))) return 'HIGH';
    if (medium.some((kw) => text.includes(kw))) return 'MEDIUM';
    return 'LOW';
  }

  private detectCategory(text: string): Category {
    const production = ['producción', 'production', 'prod'];
    const technical = ['servidor', 'base de datos', 'api', 'código', 'codigo'];
    const infra = ['red', 'network', 'vpn', 'infraestructura', 'aws'];
    const admin = ['acceso', 'permiso', 'usuario', 'cuenta', 'licencia'];
    if (production.some((kw) => text.includes(kw))) return 'PRODUCTION';
    if (infra.some((kw) => text.includes(kw))) return 'INFRASTRUCTURE';
    if (technical.some((kw) => text.includes(kw))) return 'TECHNICAL';
    if (admin.some((kw) => text.includes(kw))) return 'ADMINISTRATIVE';
    return 'OTHER';
  }

  private calculateConfidence(text: string): number {
    const length = text.length;
    if (length < 20) return 0.4;
    if (length < 80) return 0.6;
    if (length < 200) return 0.75;
    return 0.85;
  }
}