import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { GeminiClassifier } from './classifiers/gemini.classifier';
import { GroqClassifier } from './classifiers/groq.classifier';
import { RuleBasedClassifier } from './classifiers/rule-based.classifier';

@Module({
  providers: [
    AiService,
    GeminiClassifier,
    GroqClassifier,
    RuleBasedClassifier,
  ],
  exports: [AiService],
})
export class AiModule {}