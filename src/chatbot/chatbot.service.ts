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
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
        role: 'developer',
        content:
            'You are a customer support and sales assistant. ' +
            'Use searchProducts when the user wants to find products, ask about products, or needs a product price. ' +
            'Use convertCurrencies when the user wants to convert money between currencies. ' +
            'If the user asks for a product price in another currency, first use searchProducts to get the real product price and then use convertCurrencies. ' +
            'Never invent product information, prices, or exchange rates. Use the available tools.',
        },
        {
        role: 'user',
        content: userMessage,
        },
    ];

    const maxIterations = 5;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
        const response = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL')!,
        reasoning_effort: 'none',

        messages,

        tools: [
            {
            type: 'function',
            function: {
                name: 'searchProducts',
                description:
                'Search the product catalog and return up to two products related to the customer request.',
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

        messages.push(message);

        const toolCalls = message.tool_calls;

        if (!toolCalls?.length) {
        return message.content ?? '';
        }

        for (const toolCall of toolCalls) {
        if (toolCall.type !== 'function') {
            continue;
        }

        if (toolCall.function.name === 'searchProducts') {
            const argumentsObject = JSON.parse(
            toolCall.function.arguments,
            ) as {
            query: string;
            };

            const products =
            this.productSearchService.searchProducts(
                argumentsObject.query,
            );

            messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(products),
            });
        }

        if (toolCall.function.name === 'convertCurrencies') {
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

            messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({
                amount: argumentsObject.amount,
                fromCurrency: argumentsObject.fromCurrency,
                toCurrency: argumentsObject.toCurrency,
                convertedAmount,
            }),
            });
        }
        }
    }

    throw new Error(
        'Maximum number of tool call iterations reached',
    );
    }
}