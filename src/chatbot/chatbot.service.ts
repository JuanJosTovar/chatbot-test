import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { ProductSearchService } from './tools/product-search.service';

@Injectable()
export class ChatbotService {
  private readonly openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly productSearchService: ProductSearchService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async chat(userMessage: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: this.configService.get<string>('OPENAI_MODEL')!,
      reasoning_effort: 'none',

      messages: [
        {
          role: 'developer',
          content:
            'You are a customer support and sales assistant. Use searchProducts when the user wants to find or ask about products.',
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],

      tools: [
        {
          type: 'function',
          function: {
            name: 'searchProducts',
            description:
              'Search the product catalog and find products related to the customer request.',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description:
                    'The product or type of product the customer is looking for.',
                },
              },
              required: ['query'],
            },
          },
        },
      ],

      tool_choice: 'auto',
    });

    const message = response.choices[0].message;

    console.log('Tool calls:', message.tool_calls);

    const toolCall = message.tool_calls?.[0];

    if (
      toolCall?.type === 'function' &&
      toolCall.function.name === 'searchProducts'
    ) {
      const argumentsObject = JSON.parse(
        toolCall.function.arguments,
      ) as { query: string };

      const products = this.productSearchService.searchProducts(
        argumentsObject.query,
      );

      const finalResponse = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL')!,
        reasoning_effort: 'none',

        messages: [
          {
            role: 'developer',
            content:
              'You are a customer support and sales assistant. Respond clearly and naturally using the product information provided by the tools.',
          },
          {
            role: 'user',
            content: userMessage,
          },
          message,
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(products),
          },
        ],
      });

      return finalResponse.choices[0].message.content ?? '';
    }

    return message.content ?? '';
  }
}