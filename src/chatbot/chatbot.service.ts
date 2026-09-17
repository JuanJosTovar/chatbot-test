import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { ProductSearchService } from './tools/product-search.service';
import { CurrencyConverterService } from './tools/currency-converter.service';

@Injectable()
export class ChatbotService {
  private readonly openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly productSearchService: ProductSearchService,
    private readonly currencyConverterService: CurrencyConverterService,
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
            'You are a customer support and sales assistant. Use searchProducts when the user wants to find or ask about products. Use convertCurrencies when the user wants to convert money from one currency to another.',
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
        {
           type: 'function',
            function: {
                name: 'convertCurrencies',
                description:
                'Convert an amount of money from one currency to another using current exchange rates.',
                parameters: {
                type: 'object',
                properties: {
                    amount: {
                    type: 'number',
                    description: 'The amount of money to convert.',
                    },
                    fromCurrency: {
                    type: 'string',
                    description:
                        'The source currency code, for example USD, EUR or CAD.',
                    },
                    toCurrency: {
                    type: 'string',
                    description:
                        'The target currency code, for example USD, EUR or CAD.',
                    },
                },
                required: [
                    'amount',
                    'fromCurrency',
                    'toCurrency',
                ],
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

    if (
    toolCall?.type === 'function' &&
    toolCall.function.name === 'convertCurrencies'
    ) {
    const argumentsObject = JSON.parse(
        toolCall.function.arguments,
    ) as {
        amount: number;
        fromCurrency: string;
        toCurrency: string;
    };

    const convertedAmount =
        await this.currencyConverterService.convertCurrencies(
        argumentsObject.amount,
        argumentsObject.fromCurrency,
        argumentsObject.toCurrency,
        );

    const finalResponse = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL')!,
        reasoning_effort: 'none',

        messages: [
        {
            role: 'developer',
            content:
            'You are a customer support and sales assistant. Respond clearly and naturally using the information provided by the tools.',
        },
        {
            role: 'user',
            content: userMessage,
        },
        message,
        {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({
            amount: argumentsObject.amount,
            fromCurrency: argumentsObject.fromCurrency,
            toCurrency: argumentsObject.toCurrency,
            convertedAmount,
            }),
        },
        ],
    });

    return finalResponse.choices[0].message.content ?? '';
    }

    return message.content ?? '';
  }
}