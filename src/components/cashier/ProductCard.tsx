import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Product } from '../../services/productService';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  return (
    <View className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4 mx-2 flex-1 min-w-[160px]">
      <View className="h-32 bg-gray-100 relative">
        {product.image_url ? (
            <Image 
                source={{ uri: product.image_url }} 
                className="w-full h-full"
                resizeMode="cover"
            />
        ) : (
             <View className="w-full h-full items-center justify-center bg-gray-200">
                <Text className="text-gray-400 text-xs">No Image</Text>
             </View>
        )}
        <View className="absolute top-2 right-2 bg-indigo-600 px-2 py-1 rounded-md">
            <Text className="text-white text-[10px] font-bold">{product.categories?.name || 'Item'}</Text>
        </View>
      </View>
      
      <View className="p-3">
        <Text className="font-bold text-gray-800 text-sm mb-1" numberOfLines={1}>{product.name}</Text>
        <Text className="text-gray-500 text-xs mb-3">Rp {product.price.toLocaleString()}</Text>
        
        <TouchableOpacity 
            onPress={() => onAddToCart(product)}
            className="bg-indigo-600 py-2 rounded-lg flex-row justify-center items-center"
        >
            <Text className="text-white text-xs font-bold mr-1">ADD</Text>
            {/* <Plus size={12} color="white" /> */}
        </TouchableOpacity>
      </View>
    </View>
  );
};
