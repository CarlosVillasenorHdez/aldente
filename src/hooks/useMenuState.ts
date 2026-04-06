'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category_id: string;
  category_name?: string;
  description?: string;
  is_available: boolean;
  emoji?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
}

export function useMenuState() {
  const { appUser } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchMenu = useCallback(async () => {
    if (!appUser?.tenantId) return;
    const supabase = createClient();

    const [{ data: cats }, { data: dishes }] = await Promise.all([
      supabase.from('categories').select('id, name').eq('tenant_id', appUser.tenantId).order('sort_order'),
      supabase.from('dishes').select('id, name, price, category_id, description, is_available, emoji').eq('tenant_id', appUser.tenantId).eq('is_available', true).order('name'),
    ]);

    const catMap: Record<string, string> = {};
    (cats ?? []).forEach((c: MenuCategory) => { catMap[c.id] = c.name; });

    setCategories(cats as MenuCategory[] ?? []);
    setMenuItems((dishes ?? []).map((d: MenuItem) => ({ ...d, category_name: catMap[d.category_id] ?? '' })));
    setLoading(false);
  }, [appUser?.tenantId]);

  useEffect(() => { fetchMenu(); }, [fetchMenu]);

  const filteredItems = selectedCategory
    ? menuItems.filter(i => i.category_id === selectedCategory)
    : menuItems;

  return { menuItems, filteredItems, categories, loading, selectedCategory, setSelectedCategory, fetchMenu };
}
