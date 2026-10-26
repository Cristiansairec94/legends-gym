import { ensureDatabase } from "@/db";
import { findProduct, listProducts } from "@/db/pos";
import { requireAdmin } from "../_auth";
import {
  apiErrorResponse,
  databaseConflict,
  noStoreJson,
  readJson,
  validateCreateProduct,
} from "../_shared";

export async function GET(request: Request): Promise<Response> {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;

  try {
    const database = await ensureDatabase();
    const products = await listProducts(database, { activeOnly: false });
    return noStoreJson({ products });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;

  try {
    const input = validateCreateProduct(await readJson(request));
    const database = await ensureDatabase();
    const timestamp = new Date().toISOString();

    try {
      await database
        .prepare(`
          INSERT INTO products (
            id, sku, name, category, price_clp, stock_mode, stock,
            stock_vitrina, stock_bodega, active, needs_price_review,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          input.id,
          input.sku,
          input.name,
          input.category,
          input.priceClp,
          input.stockMode,
          input.stock,
          input.stockVitrina,
          input.stockBodega,
          input.active ? 1 : 0,
          input.needsPriceReview ? 1 : 0,
          timestamp,
          timestamp,
        )
        .run();
    } catch (error) {
      throw databaseConflict(error) ?? error;
    }

    const product = await findProduct(database, input.id);
    if (!product) throw new Error("Product missing after insert");
    return noStoreJson({ product }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
