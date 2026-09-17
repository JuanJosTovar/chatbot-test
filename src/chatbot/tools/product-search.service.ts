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
    const searchTerms = this.normalizeText(query)
      .split(' ')
      .filter((term) => term.length > 2);

    const scoredProducts = this.products.map((product) => {
      const title = this.normalizeText(product.displayTitle);
      const description = this.normalizeText(product.embeddingText);
      const productType = this.normalizeText(product.productType);

      let score = 0;

      for (const term of searchTerms) {
        if (title.includes(term)) {
          score += 5;
        }

        if (productType.includes(term)) {
          score += 3;
        }

        if (description.includes(term)) {
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
}