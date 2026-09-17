import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ProductSearchService } from './tools/product-search.service';

@Module({
  controllers: [ChatbotController],
  providers: [ChatbotService, ProductSearchService]
})
export class ChatbotModule {}
