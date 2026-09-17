import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse/sync';
import { Product } from '../interfaces/product.interface';

@Injectable()
export class ProductSearchService {
  private readonly products: Product[];

  constructor() {
    this.products = this.loadProducts();
  }

  private containsWord(text: string, term: string): boolean {
  const words = text.split(/\W+/);

  return words.includes(term);
}

  private loadProducts(): Product[] {
    const filePath = join(
      process.cwd(),
      'data',
      'products_list.csv',
    );

    const fileContent = readFileSync(filePath, 'utf-8');

    return parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
    }) as Product[];
  }

  public searchProducts(query: string): Product[] {
    const originalTerms = this.normalizeText(query)
      .split(' ')
      .filter((term) => term.length > 2);
      const searchTerms = this.expandSearchTerms(originalTerms);

    const scoredProducts = this.products.map((product) => {
      const title = this.normalizeText(product.displayTitle);
      const description = this.normalizeText(product.embeddingText);
      const productType = this.normalizeText(product.productType);

      let score = 0;

      for (const term of searchTerms) {
        if (this.containsWord(title, term)) {
          score += 5;
        }

        if (this.containsWord(productType, term)) {
          score += 3;
        }

        if (this.containsWord(description, term)) {
          score += 2;
        }
      }

      return {
        product,
        score,
      };
    });

    return scoredProducts
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((item) => item.product);
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private expandSearchTerms(terms: string[]): string[] {
  const synonyms: Record<string, string[]> = {
    phone: [
      'phone',
      'phones',
      'iphone',
      'smartphone',
      'smartphones',
      'cellphone',
      'cellphones',
      'cellular',
      'celulares',
      'mobile',
    ],
    phones: [
      'phone',
      'phones',
      'iphone',
      'smartphone',
      'smartphones',
      'cellphone',
      'cellphones',
      'cellular',
      'celulares',
      'mobile',
    ],
    smartphone: [
      'phone',
      'phones',
      'iphone',
      'smartphone',
      'smartphones',
      'cellular',
      'celulares',
    ],
    smartphones: [
      'phone',
      'phones',
      'iphone',
      'smartphone',
      'smartphones',
      'cellular',
      'celulares',
    ],
    watch: ['watch', 'watches', 'smartwatch'],
    watches: ['watch', 'watches', 'smartwatch'],
    headphones: ['headphones', 'earbuds', 'headset'],
  };

  return terms.flatMap((term) => synonyms[term] ?? [term]);
}
}