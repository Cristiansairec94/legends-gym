import { ensureDatabase } from "@/db";
import { findProduct, PosError, updateProduct } from "@/db/pos";
import { requireAdmin } from "../../_auth";
import {
  apiErrorResponse,
  databaseConflict,
  noStoreJson,
  readJson,
  resolveProductInventory,
  validatePatchProduct,
  validatePathId,
} from "../../_shared";

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;

  try {
    const { id: rawId } = await context.params;
    const id = validatePathId(rawId);
    const changes = validatePatchProduct(await readJson(request));
    const database = await ensureDatabase();
    const current = await findProduct(database, id);
    if (!current) throw new PosError(404, "El producto no existe.");

    const inventoryChanged = [
      "category",
      "stockMode",
      "stock",
      "stockVitrina",
      "stockBodega",
    ].some((field) => Object.hasOwn(changes, field));
    const inventory = inventoryChanged
      ? resolveProductInventory(changes.category ?? current.category, current, changes)
      : {
          stockMode: current.stockMode,
          stock: current.stock,
          stockVitrina: current.stockVitrina,
          stockBodega: current.stockBodega,
        };
    const recipeControlled =
      current.stockGroup?.startsWith("ingredient:") ||
      current.stockGroup?.startsWith("recipe:");
    if (recipeControlled && inventory.stockMode !== "untracked") {
      throw new PosError(
        400,
        "Un producto con receta debe usar inventario controlado por insumos.",
      );
    }

    let product;
    try {
      product = await updateProduct(database, id, {
        expectedUpdatedAt: changes.expectedUpdatedAt,
        sku: Object.hasOwn(changes, "sku") ? (changes.sku ?? null) : current.sku,
        name: changes.name ?? current.name,
        category: changes.category ?? current.category,
        priceClp: changes.priceClp ?? current.priceClp,
        ...inventory,
        active: changes.active ?? current.active,
        needsPriceReview:
          changes.needsPriceReview ?? current.needsPriceReview,
      });
    } catch (error) {
      throw databaseConflict(error) ?? error;
    }

    return noStoreJson({ product });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
