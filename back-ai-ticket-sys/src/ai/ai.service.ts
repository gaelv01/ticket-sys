import { Injectable, Logger } from '@nestjs/common';
import { GeminiClassifier } from './classifiers/gemini.classifier';
import { GroqClassifier } from './classifiers/groq.classifier';
import { RuleBasedClassifier } from './classifiers/rule-based.classifier';
import {
  TicketClassification,
  TicketClassifier,
} from './interfaces/classifier.interface';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly chain: TicketClassifier[];

  constructor(
    private readonly gemini: GeminiClassifier,
    private readonly groq: GroqClassifier,
    private readonly ruleBased: RuleBasedClassifier,
  ) {
    // Orden de la cadena: Gemini → Groq → reglas
    this.chain = [gemini, groq, ruleBased];
  }

  async classify(
    title: string,
    description: string,
  ): Promise<TicketClassification> {
    for (const classifier of this.chain) {
      if (!classifier.isAvailable()) {
        this.logger.debug(`Saltando ${classifier.name}: no disponible`);
        continue;
      }

      try {
        this.logger.log(`→ Probando ${classifier.name}...`);
        const result = await classifier.classify(title, description);
        this.logger.log(
          `✓ Clasificación por ${classifier.name} (confianza: ${result.confidence})`,
        );
        return result;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'desconocido';
        this.logger.warn(`✗ ${classifier.name} falló: ${msg}`);
        // sigue al siguiente
      }
    }

    // Nunca debería llegar aquí porque rule-based siempre está disponible
    throw new Error('Todos los classifiers fallaron');
  }
}