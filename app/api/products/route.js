import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request) {
  try {
    console.log('[Products API] Fetching products...');

    const productsRef = collection(db, 'products');
    const productsSnap = await getDocs(productsRef);

    const products = [];
    productsSnap.forEach(doc => {
      products.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    console.log('[Products API] Found products:', products.length);

    return Response.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error('[Products API] Error:', error);
    
    // Return empty array instead of error (so page still loads)
    return Response.json({
      success: true,
      products: [],
    });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
