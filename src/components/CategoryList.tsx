/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Grid, Laptop, Car, Home, Shirt, Bike, Building } from 'lucide-react';
import { Category } from '../types';

interface CategoryListProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
}

const iconsMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Grid,
  Laptop,
  Car,
  Home,
  Shirt,
  Bike,
  Building,
};

export default function CategoryList({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryListProps) {
  return (
    <div className="bg-white border-b border-gray-100 py-6 mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-base font-bold text-olx-dark mb-4 font-display">Semua Kategori Belanja</h2>
        
        <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-2 scrollbar-none snap-x justify-start md:justify-between">
          {categories.map((cat) => {
            const IconComponent = iconsMap[cat.icon] || Grid;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className="flex flex-col items-center gap-2.5 min-w-[90px] cursor-pointer group focus:outline-none snap-start"
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 olx-shadow ${
                    isSelected
                      ? 'bg-emerald-600 text-white scale-110 shadow-emerald-200'
                      : 'bg-gray-50 text-olx-dark group-hover:bg-emerald-50 group-hover:text-emerald-700'
                  }`}
                >
                  <IconComponent className="w-6 h-6 transition-transform group-hover:rotate-6 duration-300" />
                </div>
                <span
                  className={`text-xs text-center font-medium max-w-[100px] leading-tight transition-colors ${
                    isSelected
                      ? 'text-emerald-700 font-bold'
                      : 'text-gray-600 group-hover:text-olx-dark'
                  }`}
                >
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
