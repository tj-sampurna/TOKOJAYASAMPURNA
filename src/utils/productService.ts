import { supabase } from "../lib/supabase";
import { uploadImage } from "./uploadImage";

async function executeResilient(table: string, operation: 'insert' | 'update', payload: any, id?: string) {
  let attemptPayload = { ...payload };
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    let query: any = supabase.from(table);
    
    if (operation === 'insert') {
      query = query.insert(attemptPayload).select();
    } else if (operation === 'update') {
      query = query.update(attemptPayload).eq('id', id).select();
    }

    const { data, error } = await query;

    if (!error) {
      if (operation === 'update' && (!data || data.length === 0)) {
        return { data: null, error: new Error('Product not found or access denied by RLS.') };
      }
      return { data, error: null };
    }

    console.warn(`Resilient DB Error (Attempt ${attempts + 1}):`, error);

    // Check for Postgres undefined column error (code "42703")
    const isUndefinedColumn = error.code === '42703' || 
                              (error.message && error.message.toLowerCase().includes('column') && error.message.toLowerCase().includes('does not exist'));

    if (isUndefinedColumn) {
      // Find the missing column name from the error message.
      // E.g.: "column \"name\" of relation \"products\" does not exist"
      // Or "column \"images\" of relation \"products\" does not exist"
      const match = error.message.match(/column "([^"]+)"|column '([^']+)'/i);
      const missingColumn = match ? (match[1] || match[2]) : null;

      if (missingColumn && attemptPayload.hasOwnProperty(missingColumn)) {
        console.log(`Removing non-existent column "${missingColumn}" and retrying...`);
        delete attemptPayload[missingColumn];
        attempts++;
        continue;
      }

      // Fallback: If we couldn't parse the column name using regex, let's search keys of the payload in the error message
      let foundKey = false;
      for (const key of Object.keys(attemptPayload)) {
        if (error.message.includes(`"${key}"`) || error.message.includes(`'${key}'`) || error.message.includes(`column ${key}`) || error.message.includes(` ${key} `)) {
          console.log(`Detected non-existent column "${key}" in message, removing and retrying...`);
          delete attemptPayload[key];
          foundKey = true;
          break;
        }
      }

      if (foundKey) {
        attempts++;
        continue;
      }
    }

    // If it's a different error, or we couldn't resolve the column, we return the error.
    return { data: null, error };
  }

  return { data: null, error: { message: 'Too many retries trying to match database schema columns.' } };
}

export async function updateProduct(id: string, data: any) {
  const { title, name, description, price, image_url, category, images, stock } = data;
  const firstImage = image_url || (images && images[0]) || '';

  const payload = {
    title: title || name || '',
    name: name || title || '',
    description: description || '',
    price: Number(price),
    image_url: firstImage,
    images: images || [firstImage],
    category: category || 'Elektronik',
    stock: typeof stock === 'number' ? stock : 1
  };

  const { data: resData, error } = await executeResilient("products", "update", payload, id);

  if (error) {
    console.error("UPDATE ERROR:", error.message);
  }

  return { data: resData, error };
}

export async function deleteProduct(id: string) {
  // Clear any existing references to avoid foreign key violations
  try {
    const { data: orders } = await supabase.from('orders').select('id').eq('product_id', id);
    if (orders && orders.length > 0) {
      const orderIds = orders.map((o: any) => o.id);
      
      // Clean up payments
      await supabase.from('payments').delete().in('order_id', orderIds);
      
      // Clean up transactions if exists (ignore error if table doesn't exist)
      const { error: txError } = await supabase.from('transactions').delete().in('order_id', orderIds);
      if (txError) console.warn("Failed to delete from transactions", txError);

      // Clean up orders
      const { error: orderError } = await supabase.from('orders').delete().in('id', orderIds);
      if (orderError) console.warn("Failed to delete orders", orderError);
    }
  } catch (err) {
    console.warn("Soft fail on reference cleanup", err);
  }

  // Then delete the actual product
  const { data, error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .select();

  if (error) {
    console.log("DELETE ERROR:", error.message);
    return { error };
  }

  if (!data || data.length === 0) {
    return { error: new Error('Product not found or access denied by RLS.') };
  }

  return { error: null };
}

export async function addProduct(
  title: string, 
  description: string, 
  price: number, 
  file?: File | null, 
  category?: string,
  images?: string[],
  stock?: number
) {
  let imagesList = images || [];

  if (imagesList.length === 0) {
    let imageUrl = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';
    if (file) {
      const uploadedUrl = await uploadImage(file);
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      }
    }
    imagesList = [imageUrl];
  }

  const firstImage = imagesList[0];

  const payload = {
    title,
    name: title,
    description,
    price,
    image_url: firstImage,
    images: imagesList,
    category,
    stock: typeof stock === 'number' ? stock : 1
  };

  const { error } = await executeResilient("products", "insert", payload);

  console.log("ERROR:", error);
  return { error };
}

export async function seedProducts() {
  const sampleProducts = [
    {
      title: "Honda Vario 150 Keyless 2018 Mulus",
      description: "Dijual Honda Vario 150 tahun 2018 warna hitam doff. Kondisi body sangat mulus, mesin halus terawat. Keyless remote lengkap, surat-surat (BPKB, STNK) aman dan hidup pajak panjang. Plat Jakarta Selatan.",
      price: 16500000,
      category: "Otomotif",
      stock: 1,
      image_url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80",
      images: ["https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80"]
    },
    {
      title: "Macbook Pro M1 8GB/256GB Silver",
      description: "Macbook Pro M1 Space Gray. Kondisi fisik 98% mulus no dent. Layar jernih bebas whitespot. Battery Health 89% awet seharian. Backlight keyboard aman, semua fitur berfungsi normal. Fullset dus charger original.",
      price: 11200000,
      category: "Elektronik",
      stock: 2,
      image_url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80",
      images: ["https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80"]
    },
    {
      title: "iPhone 13 Pro Max 256GB Sierra Blue",
      description: "iPhone 13 Pro Max kapasitas 256GB warna Sierra Blue resmi iBox. Kondisi sinyal all operator aman permanen. Face ID, True Tone On aktif. Kelengkapan fullset oem bergaransi personal.",
      price: 13900000,
      category: "Handphone",
      stock: 3,
      image_url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80",
      images: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80"]
    },
    {
      title: "Kost Eksklusif AC Jaksel Tebet",
      description: "Disewakan kamar kost eksklusif di Tebet, Jakarta Selatan. Fasilitas lengkap: AC, WiFi berkecepatan tinggi, kasur springbed, lemari pakaian, kamar mandi dalam dengan water heater. Lokasi strategis dekat stasiun kota.",
      price: 1800000,
      category: "Properti",
      stock: 5,
      image_url: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80",
      images: ["https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80"]
    },
    {
      title: "Kaos Oversize Vintage Hitam Cotton Combed",
      description: "Kaos sablon oversize streetwear vintage wash style. Menggunakan bahan premium Cotton Combed 24s tebal, menyerap keringat, dan sangat nyaman dipakai harian.",
      price: 125000,
      category: "Fashion",
      stock: 15,
      image_url: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=600&q=80",
      images: ["https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=600&q=80"]
    },
    {
      title: "Sepeda Gunung Polygon Cascade 4 Mulus",
      description: "Sepeda gunung Polygon Cascade 4 ring 26. Kondisi jarang pakai, shifter Shimano lancar mulus, shock absorber empuk, rem cakram pakem. Ban depan belakang masih tebal siap gowes santai.",
      price: 2400000,
      category: "Hobi & Olahraga",
      stock: 1,
      image_url: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=600&q=80",
      images: ["https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=600&q=80"]
    }
  ];

  const cleanedProducts = sampleProducts.map((p) => ({
    title: p.title,
    name: p.title,
    description: p.description,
    price: p.price,
    category: p.category,
    stock: p.stock,
    image_url: p.image_url,
    images: p.images
  }));

  const { error } = await executeResilient("products", "insert", cleanedProducts);

  return { error };
}
