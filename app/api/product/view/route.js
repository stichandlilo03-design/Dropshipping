import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request) {
  try {
    const { productId, newViews } = await request.json();

    if (!productId || newViews === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing productId or newViews' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update the product views in Firestore
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      views: newViews,
      lastViewed: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        views: newViews,
        message: 'View count updated successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Product View] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to update view count',
        success: false
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
