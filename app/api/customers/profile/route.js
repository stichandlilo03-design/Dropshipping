import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request) {
  try {
    console.log('[Customer Profile API] === REQUEST START ===');

    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Customer Profile API] Missing or invalid Authorization header');
      return Response.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    console.log('[Customer Profile API] Token received');

    // Get user ID from header
    const userId = request.headers.get('X-User-ID');
    if (!userId) {
      console.error('[Customer Profile API] No User ID provided');
      return Response.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    console.log('[Customer Profile API] Looking up customer:', userId);

    // TRY 1: Search by document ID
    try {
      const docRef = doc(db, 'customers', userId); // ✅ CUSTOMERS collection
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        console.log('[Customer Profile API] ✅ Customer found by document ID');
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
      console.log('[Customer Profile API] Document ID search failed, trying other methods...');
    }

    // TRY 2: Search by uid field
    try {
      const customersRef = collection(db, 'customers'); // ✅ CUSTOMERS collection
      const q = query(customersRef, where('uid', '==', userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        console.log('[Customer Profile API] ✅ Customer found by uid field');
        const docSnap = querySnapshot.docs[0];
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
      console.log('[Customer Profile API] UID field search failed');
    }

    // TRY 3: Search by email field
    try {
      const customersRef = collection(db, 'customers'); // ✅ CUSTOMERS collection
      const q = query(customersRef, where('email', '==', userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        console.log('[Customer Profile API] ✅ Customer found by email field');
        const docSnap = querySnapshot.docs[0];
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
      console.log('[Customer Profile API] Email field search failed');
    }

    // NOT FOUND: Return minimal profile
    console.log('[Customer Profile API] ⚠️ Customer not found, returning minimal profile');
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
    console.error('[Customer Profile API] === REQUEST ERROR ===');
    console.error('[Customer Profile API] Error:', error.message);
    
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
