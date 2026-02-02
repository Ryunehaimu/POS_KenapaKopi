import { supabase } from "../lib/supabase";
import { Ingredient } from "./inventoryService";
import { Category } from "./categoryService";
import { decode } from "base64-arraybuffer";

export interface Product {
    id: string;
    name: string;
    price: number;
    description?: string;
    category_id?: string;
    image_url?: string;
    created_at: string;
    categories?: Category; // Joined
    product_ingredients?: ProductIngredient[];
}

export interface ProductIngredient {
    id: string;
    product_id: string;
    ingredient_id: string;
    quantity: number;
    ingredients?: Ingredient; // Joined
}

export const productService = {
    async getProducts() {
        const { data, error } = await supabase
            .from("products")
            .select("*, categories(name)")
            .order("name", { ascending: true });

        if (error) throw error;
        return data as Product[];
    },

    async getProductById(id: string) {
        const { data, error } = await supabase
            .from("products")
            .select("*, categories(*), product_ingredients(*, ingredients(name, unit))")
            .eq("id", id)
            .single();

        if (error) throw error;
        return data as Product;
    },

    async createProduct(
        product: Omit<Product, "id" | "created_at" | "categories" | "product_ingredients">,
        ingredients: { ingredient_id: string; quantity: number }[]
    ) {
        // 1. Create Product
        const { data: productData, error: productError } = await supabase
            .from("products")
            .insert([product])
            .select()
            .single();

        if (productError) throw productError;

        // 2. Link Ingredients
        if (ingredients.length > 0) {
            const ingredientInserts = ingredients.map((ing) => ({
                product_id: productData.id,
                ingredient_id: ing.ingredient_id,
                quantity: ing.quantity,
            }));

            const { error: ingError } = await supabase
                .from("product_ingredients")
                .insert(ingredientInserts);

            if (ingError) {
                // Optional: Rollback product creation if ingredients fail (manual since no transactions in simple client)
                // For now just throw
                throw ingError;
            }
        }

        return productData as Product;
    },

    async updateProduct(
        id: string,
        updates: Partial<Omit<Product, "categories" | "product_ingredients">>,
        ingredients?: { ingredient_id: string; quantity: number }[]
    ) {
        // 1. Update Product
        const { data: productData, error: productError } = await supabase
            .from("products")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (productError) throw productError;

        // 2. Update Ingredients (Replace all logic for simplicity)
        if (ingredients) {
            // Delete existing
            await supabase.from("product_ingredients").delete().eq("product_id", id);

            // Insert new
            if (ingredients.length > 0) {
                const ingredientInserts = ingredients.map((ing) => ({
                    product_id: id,
                    ingredient_id: ing.ingredient_id,
                    quantity: ing.quantity,
                }));

                const { error: ingError } = await supabase
                    .from("product_ingredients")
                    .insert(ingredientInserts);

                if (ingError) throw ingError;
            }
        }

        return productData as Product;
    },

    async deleteProduct(id: string) {
        // product_ingredients should cascade delete
        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) throw error;
        return true;
    },

    async uploadImage(uri: string) {
        try {
            const ext = uri.split('.').pop()?.toLowerCase() || 'jpeg';
            const fileName = `${Date.now()}.${ext}`;
            const filePath = `${fileName}`;

            // Read file as base64 (Expo Image Picker returns base64 if requested, or we fetch it)
            // Ideally pass base64 from the component if using Expo Image Picker with base64 option
            // Or use fetch + arrayBuffer if uri is file://
            
            // NOTE: For this implementation, we assume the component passes the base64 string directly 
            // OR a file URI that we fetch. Let's support file URI by fetching it.
            
            let fileBody;
            if (uri.startsWith('data:')) {
                 // It's base64 data uri
                 const base64Str = uri.split(',')[1];
                 fileBody = decode(base64Str);
            } else {
                 // It's a file uri
                 const response = await fetch(uri);
                 const blob = await response.blob();
                 const reader = new FileReader();
                 fileBody = await new Promise((resolve, reject) => {
                     reader.onload = () => {
                         if (typeof reader.result === 'string') {
                            resolve(decode(reader.result.split(',')[1]));
                         } else {
                            reject(new Error('Failed to convert blob to base64'));
                         }
                     };
                     reader.onerror = reject;
                     reader.readAsDataURL(blob);
                 });
            }

            const { data, error } = await supabase.storage
                .from('products')
                .upload(filePath, fileBody as ArrayBuffer, {
                    contentType: `image/${ext}`,
                    upsert: false
                });

            if (error) {
                console.error("Supabase Storage Error:", error);
                throw error;
            }

            const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(filePath);
            return publicUrl;
        } catch (error) {
            console.error("Upload Image Error:", error);
            throw error;
        }
    }
};
