import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ProductSearchService } from './tools/product-search.service';
import { CurrencyConverterService } from './tools/currency-converter.service';

@Module({
  controllers: [ChatbotController],
  providers: [ChatbotService, ProductSearchService, CurrencyConverterService]
})
export class ChatbotModule {}
