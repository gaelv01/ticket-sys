import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  TicketClassifier,
  TicketClassification,
} from '../interfaces/classifier.interface';
import { buildClassificationPrompt } from '../prompts/classification.prompt';
import { parseClassificationResponse } from '../utils/response-validator';

@Injectable()
export class GeminiClassifier implements TicketClassifier {
  readonly name = 'gemini';
  private readonly logger = new Logger(GeminiClassifier.name);
  private client: GoogleGenerativeAI | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
    } else {
      this.logger.warn('GEMINI_API_KEY no configurada, classifier deshabilitado');
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async classify(
    title: string,
    description: string,
  ): Promise<TicketClassification> {
    if (!this.client) throw new Error('Gemini no configurado');

    const model = this.client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const prompt = buildClassificationPrompt(title, description);
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const parsed = parseClassificationResponse(text);
    return { ...parsed, provider: this.name };
  }
}