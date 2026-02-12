import type { StampCategory } from '@/types/library';

export interface CategoryInfo {
  id: StampCategory;
  name: string;
  nameEs: string;
  icon: string;
}

export const categories: CategoryInfo[] = [
  { id: 'furniture', name: 'Furniture', nameEs: 'Muebles', icon: '\u{1F6CB}\uFE0F' },
  { id: 'bathroom', name: 'Bathroom', nameEs: 'Ba\u00f1o', icon: '\u{1F6BF}' },
  { id: 'kitchen', name: 'Kitchen', nameEs: 'Cocina', icon: '\u{1F373}' },
  { id: 'outdoor', name: 'Outdoor', nameEs: 'Exterior', icon: '\u{1F333}' },
  { id: 'people', name: 'People', nameEs: 'Personas', icon: '\u{1F464}' },
  { id: 'decoration', name: 'Decoration', nameEs: 'Decoraci\u00f3n', icon: '\u{1F5BC}\uFE0F' },
  { id: 'accessories', name: 'Accessories', nameEs: 'Accesorios', icon: '\u{1F4A1}' },
  { id: 'laundry', name: 'Laundry', nameEs: 'Lavander\u00eda', icon: '\u{1F9FA}' },
];
