import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Category } from '../../services/categoryService';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export const CategoryFilter = ({ categories, selectedCategory, onSelectCategory }: CategoryFilterProps) => {
  return (
    <View className="mb-6">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
            onPress={() => onSelectCategory(null)}
            className={`px-4 py-2 rounded-full mr-2 border ${selectedCategory === null ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'}`}
        >
            <Text className={`${selectedCategory === null ? 'text-white' : 'text-gray-600'} text-xs font-bold`}>
                All Items
            </Text>
        </TouchableOpacity>
        
        {categories.map(cat => (
             <TouchableOpacity
                key={cat.id}
                onPress={() => onSelectCategory(cat.id)}
                className={`px-4 py-2 rounded-full mr-2 border ${selectedCategory === cat.id ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'}`}
            >
                <Text className={`${selectedCategory === cat.id ? 'text-white' : 'text-gray-600'} text-xs font-bold`}>
                    {cat.name}
                </Text>
            </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};
