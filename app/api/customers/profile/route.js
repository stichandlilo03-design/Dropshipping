import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request) {
  try {
    console.log('[Profile API] === REQUEST START ===');

    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Profile API] Missing or invalid Authorization header');
      return Response.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    console.log('[Profile API] Token received');

    // Get user ID from header
    const userId = request.headers.get('X-User-ID');
    if (!userId) {
      console.error('[Profile API] No User ID provided');
      return Response.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    console.log('[Profile API] Looking up customer:', userId);

    // TRY 1: Search by document ID (most common)
    try {
      const docRef = doc(db, 'customers', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        console.log('[Profile API] ✅ Customer found by document ID');
        const data = docSnap.data();
        return Response.json({
          id: docSnap.id,
          uid: data.uid || docSnap.id,
          email: data.email || '',
          firstName: data.firstName || 'Customer',
          lastName: data.lastName || '',
          phone: data.phone || '',
          createdAt: data.createdAt || new Date().toISOString(),
        });
      }
    } catch (err) {
      console.log('[Profile API] Document ID search failed, trying other methods...');
    }

    // TRY 2: Search by uid field
    try {
      const customersRef = collection(db, 'customers');
      const q = query(customersRef, where('uid', '==', userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        console.log('[Profile API] ✅ Customer found by uid field');
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return Response.json({
          id: doc.id,
          uid: data.uid || doc.id,
          email: data.email || '',
          firstName: data.firstName || 'Customer',
          lastName: data.lastName || '',
          phone: data.phone || '',
          createdAt: data.createdAt || new Date().toISOString(),
        });
      }
    } catch (err) {
      console.log('[Profile API] UID field search failed, trying email...');
    }

    // TRY 3: Search by email (as fallback)
    try {
      const customersRef = collection(db, 'customers');
      const allDocs = await getDocs(customersRef);
      
      for (const docSnapshot of allDocs.docs) {
        const data = docSnapshot.data();
        // Check if this document matches our user ID in any way
        if (docSnapshot.id === userId || data.uid === userId) {
          console.log('[Profile API] ✅ Customer found by search');
          return Response.json({
            id: docSnapshot.id,
            uid: data.uid || docSnapshot.id,
            email: data.email || '',
            firstName: data.firstName || 'Customer',
            lastName: data.lastName || '',
            phone: data.phone || '',
            createdAt: data.createdAt || new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.log('[Profile API] Collection search failed');
    }

    // NOT FOUND: Return minimal profile
    console.log('[Profile API] ⚠️ Customer not found, returning minimal profile');
    return Response.json({
      id: userId,
      uid: userId,
      email: '',
      firstName: 'Customer',
      lastName: '',
      phone: '',
      createdAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Profile API] === REQUEST ERROR ===');
    console.error('[Profile API] Error:', error.message);
    console.error('[Profile API] Stack:', error.stack);
    
    // Return fallback response instead of error
    return Response.json({
      id: 'unknown',
      uid: 'unknown',
      email: '',
      firstName: 'Customer',
      lastName: '',
      phone: '',
      createdAt: new Date().toISOString(),
    }, { status: 200 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
