import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ExchangeRatesResponse {
  base: string;
  rates: Record<string, number>;
}

@Injectable()
export class CurrencyConverterService {
  private readonly appId: string;

  constructor(private readonly configService: ConfigService) {
    const appId = this.configService.get<string>(
      'OPEN_EXCHANGE_RATES_APP_ID',
    );

    if (!appId) {
      throw new Error(
        'OPEN_EXCHANGE_RATES_APP_ID is not configured',
      );
    }

    this.appId = appId;
  }

  public async getLatestRates(): Promise<ExchangeRatesResponse> {
    const response = await fetch(
      'https://openexchangerates.org/api/latest.json',
      {
        headers: {
          Authorization: `Token ${this.appId}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Open Exchange Rates request failed with status ${response.status}`,
      );
    }

    return (await response.json()) as ExchangeRatesResponse;
  }

  public async convertCurrencies(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    ): Promise<number> {
    const exchangeRates = await this.getLatestRates();

    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    const fromRate = exchangeRates.rates[from];
    const toRate = exchangeRates.rates[to];

    if (!fromRate || !toRate) {
        throw new Error(
        `Unsupported currency conversion: ${from} to ${to}`,
        );
    }

    const convertedAmount = (amount / fromRate) * toRate;

    return Number(convertedAmount.toFixed(2));
    }
}