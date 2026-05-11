import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import {
  TicketClassifier,
  TicketClassification,
} from '../interfaces/classifier.interface';
import { buildClassificationPrompt } from '../prompts/classification.prompt';
import { parseClassificationResponse } from '../utils/response-validator';

@Injectable()
export class GroqClassifier implements TicketClassifier {
  readonly name = 'groq';
  private readonly logger = new Logger(GroqClassifier.name);
  private client: Groq | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (apiKey) {
      this.client = new Groq({ apiKey });
    } else {
      this.logger.warn('GROQ_API_KEY no configurada, classifier deshabilitado');
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async classify(
    title: string,
    description: string,
  ): Promise<TicketClassification> {
    if (!this.client) throw new Error('Groq no configurado');

    const prompt = buildClassificationPrompt(title, description);

    const completion = await this.client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are an IT incident classifier. Respond only with valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const text = completion.choices[0]?.message?.content ?? '';
    const parsed = parseClassificationResponse(text);
    return { ...parsed, provider: this.name };
  }
}