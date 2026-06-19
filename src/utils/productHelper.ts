/**
 * SPDX-License-Identifier: Apache-2.0
 */

export function getProductDetails(name: string, id: string, existingCategory?: string) {
  const lowercaseName = (name || '').toLowerCase();
  
  let image = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';
  let category = 'Lain-lain';
  let icon = 'Box';
  
  if (existingCategory) {
    const orig = existingCategory.toLowerCase().trim();
    if (orig.includes('elektronik') || orig === 'elektronik') {
      category = 'Elektronik';
      icon = 'Laptop';
    } else if (orig.includes('otomotif') || orig === 'otomotif' || orig.includes('mobil') || orig.includes('motor')) {
      category = 'Otomotif';
      icon = 'Car';
    } else if (orig.includes('handphone') || orig === 'handphone' || orig.includes('hp') || orig.includes('gadget')) {
      category = 'Handphone';
      icon = 'Smartphone';
    } else if (orig.includes('properti') || orig === 'properti' || orig.includes('kost') || orig.includes('apartemen')) {
      category = 'Properti';
      icon = 'Home';
    } else if (orig.includes('fashion') || orig === 'fashion' || orig.includes('baju') || orig.includes('aksesoris') || orig.includes('sepatu') || orig.includes('sneakers')) {
      category = 'Fashion';
      icon = 'Shirt';
    } else if (orig.includes('olahraga') || orig === 'olahraga' || orig.includes('hobi') || orig.includes('sepeda') || orig.includes('bike')) {
      category = 'Hobi & Olahraga';
      icon = 'Bike';
    } else if (orig.includes('rumah') || orig === 'rumah-tangga') {
      category = 'Lain-lain';
      icon = 'Box';
    } else {
      category = 'Lain-lain';
      icon = 'Box';
    }
  } else {
    if (
      lowercaseName.includes('mobil') || 
      lowercaseName.includes('motor') || 
      lowercaseName.includes('car') || 
      lowercaseName.includes('honda') || 
      lowercaseName.includes('yamaha') || 
      lowercaseName.includes('toyota') || 
      lowercaseName.includes('avanza')
    ) {
      image = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80';
      category = 'Otomotif';
      icon = 'Car';
    } else if (
      lowercaseName.includes('laptop') || 
      lowercaseName.includes('macbook') || 
      lowercaseName.includes('komputer') || 
      lowercaseName.includes('pc') || 
      lowercaseName.includes('asus') || 
      lowercaseName.includes('rtx') || 
      lowercaseName.includes('lenovo')
    ) {
      image = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80';
      category = 'Elektronik';
      icon = 'Laptop';
    } else if (
      lowercaseName.includes('hp') || 
      lowercaseName.includes('handphone') || 
      lowercaseName.includes('iphone') || 
      lowercaseName.includes('android') || 
      lowercaseName.includes('samsung') || 
      lowercaseName.includes('oppo') || 
      lowercaseName.includes('xiaomi')
    ) {
      image = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80';
      category = 'Handphone';
      icon = 'Smartphone';
    } else if (
      lowercaseName.includes('rumah') || 
      lowercaseName.includes('tanah') || 
      lowercaseName.includes('kost') || 
      lowercaseName.includes('apartemen') || 
      lowercaseName.includes('ruko')
    ) {
      image = 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80';
      category = 'Properti';
      icon = 'Home';
    } else if (
      lowercaseName.includes('kaos') || 
      lowercaseName.includes('baju') || 
      lowercaseName.includes('celana') || 
      lowercaseName.includes('sepatu') || 
      lowercaseName.includes('jaket') || 
      lowercaseName.includes('tas') || 
      lowercaseName.includes('kemeja')
    ) {
      image = 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=600&q=80';
      category = 'Fashion';
      icon = 'Shirt';
    } else if (
      lowercaseName.includes('sepeda') || 
      lowercaseName.includes('gowes') || 
      lowercaseName.includes('roadbike') || 
      lowercaseName.includes('polygon')
    ) {
      image = 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=600&q=80';
      category = 'Hobi & Olahraga';
      icon = 'Bike';
    }
  }

  // Fallback visual category-specific images if default Unsplash coffee cup is active
  if (image === 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80') {
    if (category === 'Otomotif') {
      image = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80';
    } else if (category === 'Elektronik') {
      image = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80';
    } else if (category === 'Handphone') {
      image = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80';
    } else if (category === 'Properti') {
      image = 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80';
    } else if (category === 'Fashion') {
      image = 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=600&q=80';
    } else if (category === 'Hobi & Olahraga') {
      image = 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=600&q=80';
    }
  }

  // Pre-generate nice seed-based location
  const locations = [
    'Jakarta Selatan',
    'Bandung',
    'Surabaya',
    'Medan',
    'Yogyakarta',
    'Semarang',
    'Tangerang',
    'Makassar',
    'Denpasar',
    'Malang',
  ];

  let sum = 0;
  const seedString = id || name || 'default';
  for (let i = 0; i < seedString.length; i++) {
    sum += seedString.charCodeAt(i);
  }
  const location = locations[sum % locations.length];

  // Pick deterministic view counts and like offsets
  const views = (sum * 7) % 520 + 25;
  const dateStr = `${(sum % 28) + 1} hari lalu`;

  return { image, category, icon, location, views, dateStr };
}

export function parseSupabaseDate(dateString: string): Date {
  if (!dateString) return new Date();
  
  let formatted = dateString;
  if (formatted.includes(' ') && !formatted.includes('T')) {
    formatted = formatted.replace(' ', 'T');
  }
  
  // Check if there is already a timezone offset (+ or - near the end, or Z)
  const hasTimezone = formatted.endsWith('Z') || 
                      /[+-]\d{2}(:?\d{2})?$/.test(formatted) ||
                      formatted.toLowerCase().includes('gmt') ||
                      formatted.toLowerCase().includes('utc');
                      
  if (!hasTimezone) {
    // If no timezone is specified, treat it as UTC
    formatted = formatted + 'Z';
  }
  
  return new Date(formatted);
}

