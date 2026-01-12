import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { API_URLS } from '../../config/constants.js';
import { getProductService } from '../../services/product.service.js';
import { getLogger } from '../../transport/logger.js';
import { formatErrorForMcp, ProductNotFoundError } from '../../errors/index.js';
import {
  getProductInsightsSchema,
  getAIQuestionsSchema,
  qualityCheckSchema,
} from './schemas.js';

const logger = getLogger().child('insights-tools');

interface RobotoffInsight {
  id: string;
  type: string;
  barcode: string;
  value_tag?: string;
  value?: string;
  predictor: string;
  confidence?: number;
}

interface RobotoffQuestion {
  barcode: string;
  type: string;
  value: string;
  value_tag: string;
  question: string;
  insight_id: string;
  insight_type: string;
}

export function registerInsightsTools(server: McpServer): void {
  const productService = getProductService();

  // getProductInsights
  server.tool(
    'getProductInsights',
    'Get AI-generated insights about a product from Robotoff',
    getProductInsightsSchema.shape,
    async ({ barcode }) => {
      try {
        const product = await productService.getByBarcode(barcode);
        if (!product) throw new ProductNotFoundError(barcode);

        const url = `${API_URLS.openfoodfacts.robotoff}/insights?barcode=${barcode}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Robotoff API error: ${response.status}`);
        }

        const data = await response.json() as { insights: RobotoffInsight[]; count: number };

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              product: product.name,
              insightCount: data.count,
              insights: data.insights.map((i) => ({
                type: i.type,
                value: i.value || i.value_tag,
                confidence: i.confidence,
                predictor: i.predictor,
              })),
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // getAIQuestions
  server.tool(
    'getAIQuestions',
    'Get AI-generated questions that need human verification',
    getAIQuestionsSchema.shape,
    async ({ barcode, count }) => {
      try {
        let url = `${API_URLS.openfoodfacts.robotoff}/questions/random?count=${count}`;
        if (barcode) {
          url = `${API_URLS.openfoodfacts.robotoff}/questions?barcode=${barcode}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Robotoff API error: ${response.status}`);
        }

        const data = await response.json() as { questions: RobotoffQuestion[]; count: number };

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              questionCount: data.count,
              questions: data.questions.map((q) => ({
                barcode: q.barcode,
                question: q.question,
                suggestedValue: q.value,
                type: q.insight_type,
              })),
              note: 'These are AI-generated suggestions that need human verification',
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // qualityCheck
  server.tool(
    'qualityCheck',
    'Check data quality and completeness for a product',
    qualityCheckSchema.shape,
    async ({ barcode }) => {
      try {
        const product = await productService.getByBarcode(barcode);
        if (!product) throw new ProductNotFoundError(barcode);

        const checks = {
          hasName: !!product.name,
          hasBrand: !!product.brand,
          hasCategories: product.categories.length > 0,
          hasNutrients: product.nutrients.length > 0,
          hasNutriScore: !!product.nutriScore,
          hasEcoScore: !!product.ecoScore,
          hasIngredients: !!product.ingredientsText,
          hasAllergens: product.allergens.length > 0 || product.traces.length > 0,
          hasImages: !!product.images?.front,
        };

        const passed = Object.values(checks).filter(Boolean).length;
        const total = Object.keys(checks).length;
        const score = Math.round((passed / total) * 100);

        const missing: string[] = [];
        if (!checks.hasBrand) missing.push('brand');
        if (!checks.hasCategories) missing.push('categories');
        if (!checks.hasNutrients) missing.push('nutritional data');
        if (!checks.hasNutriScore) missing.push('Nutri-Score');
        if (!checks.hasIngredients) missing.push('ingredients');
        if (!checks.hasImages) missing.push('product image');

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              product: product.name,
              qualityScore: score,
              checksResult: checks,
              missingData: missing,
              recommendation: score < 50
                ? 'This product has incomplete data. Consider contributing to Open Food Facts.'
                : score < 80
                  ? 'Product data is partial. Some information may be missing.'
                  : 'Product has comprehensive data.',
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  logger.info('Insights tools registered: getProductInsights, getAIQuestions, qualityCheck');
}
