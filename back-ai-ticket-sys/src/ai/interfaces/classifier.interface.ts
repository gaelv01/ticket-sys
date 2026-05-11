import { Severity, TicketType, Impact, Category } from '@prisma/client';

export interface TicketClassification {
  severity: Severity;
  type: TicketType;
  impact: Impact;
  category: Category;
  confidence: number;
  provider?: string;
}

export interface TicketClassifier {
  readonly name: string;
  isAvailable(): boolean;
  classify(title: string, description: string): Promise<TicketClassification>;
}