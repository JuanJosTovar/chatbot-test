import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatbotService {
  async chat(userMessage: string): Promise<string> {
    return `You said: ${userMessage}`;
  }
}