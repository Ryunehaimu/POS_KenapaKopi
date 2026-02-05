import React from 'react';
import { View, Text, Image, TouchableOpacity, TextInput } from 'react-native';
import { Trash2, Minus, Plus } from 'lucide-react-native';
import { Product } from '../../services/productService';

export interface CartItemType extends Product {
    quantity: number;
    note?: string; // Added note
}

interface CartItemProps {
    item: CartItemType;
    onUpdateQuantity: (id: string, delta: number) => void;
    onRemove: (id: string) => void;
    onUpdateNote: (id: string, note: string) => void; // Added handler
}

export const CartItem = ({ item, onUpdateQuantity, onRemove, onUpdateNote }: CartItemProps) => {
    return (
        <View className="bg-white p-3 rounded-xl mb-3 border border-gray-100 shadow-sm">
            <View className="flex-row items-center mb-2">
                <Image
                    source={{ uri: item.image_url || 'https://via.placeholder.com/50' }}
                    className="w-12 h-12 rounded-lg bg-gray-200 mr-3"
                />

                <View className="flex-1">
                    <Text className="font-bold text-gray-800 text-sm mb-1">{item.name}</Text>
                    <Text className="text-gray-500 text-xs text-indigo-600 font-bold">Rp {item.price.toLocaleString()}</Text>
                </View>

                <View className="flex-row items-center gap-3">
                    <View className="flex-row items-center bg-gray-50 rounded-lg p-1">
                        <TouchableOpacity
                            onPress={() => onUpdateQuantity(item.id, -1)}
                            className="p-1"
                        >
                            <Minus size={14} color="#4B5563" />
                        </TouchableOpacity>

                        <Text className="w-6 text-center text-xs font-bold text-gray-800">{item.quantity}</Text>

                        <TouchableOpacity
                            onPress={() => onUpdateQuantity(item.id, 1)}
                            className="p-1"
                        >
                            <Plus size={14} color="#4B5563" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        onPress={() => onRemove(item.id)}
                        className="p-2 bg-red-50 rounded-lg"
                    >
                        <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Note Input */}
            <View className="pt-2 border-t border-gray-100">
                <TextInput
                    placeholder="Catatan item..."
                    value={item.note || ''}
                    onChangeText={(text) => onUpdateNote(item.id, text)}
                    className="text-xs bg-gray-50 px-3 py-1.5 rounded-lg text-gray-700"
                />
            </View>
        </View>
    );
};
