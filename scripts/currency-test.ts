import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CurrencyConverterService } from '../src/chatbot/tools/currency-converter.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const currencyConverterService = app.get(
    CurrencyConverterService,
  );

  const result = await currencyConverterService.convertCurrencies(
    350,
    'EUR',
    'CAD',
  );

  console.log('350 EUR in CAD:', result);

  await app.close();
}

bootstrap();