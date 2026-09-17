import { ProductSearchService } from '../src/chatbot/tools/product-search.service';

const productSearchService = new ProductSearchService();

const results = productSearchService.searchProducts('phone');

console.log(results);