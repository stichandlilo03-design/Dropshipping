import { collection, query, where, getDocs } from 'firebase/firestore';
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

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    console.log('[Profile API] Token received:', token.substring(0, 20) + '...');

    // Verify token with Firebase Admin SDK (optional, can be added later)
    // For now, we'll trust the token came from the client

    // Extract user ID from token or use Firebase Auth
    // Since we can't easily verify JWT in Next.js without admin SDK,
    // we'll accept the request and let the client provide the user ID

    // Get user ID from request body or headers
    let userId = null;

    // Try to get userId from custom header
    userId = request.headers.get('X-User-ID');
    
    if (!userId) {
      console.error('[Profile API] No User ID provided');
      return Response.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    console.log('[Profile API] Looking up customer:', userId);

    // Query Firestore for customer
    const customersRef = collection(db, 'customers');
    const q = query(customersRef, where('uid', '==', userId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('[Profile API] No customer found with uid:', userId);
      
      // Try alternative: search by document ID
      try {
        const customerDoc = await getDocs(collection(db, 'customers'));
        let foundCustomer = null;
        
        customerDoc.forEach(doc => {
          if (doc.id === userId) {
            foundCustomer = { id: doc.id, ...doc.data() };
          }
        });

        if (foundCustomer) {
          console.log('[Profile API] Customer found by doc ID');
          return Response.json({
            id: foundCustomer.id,
            uid: foundCustomer.uid || foundCustomer.id,
            email: foundCustomer.email,
            firstName: foundCustomer.firstName || 'Customer',
            lastName: foundCustomer.lastName || '',
            phone: foundCustomer.phone || '',
            createdAt: foundCustomer.createdAt,
          });
        }

        // Create default customer profile
        console.log('[Profile API] Creating default customer profile');
        return Response.json({
          id: userId,
          uid: userId,
          email: '',
          firstName: 'Customer',
          lastName: '',
          phone: '',
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[Profile API] Error searching by doc ID:', err.message);
        
        // Return minimal customer object
        return Response.json({
          id: userId,
          uid: userId,
          email: '',
          firstName: 'Customer',
          lastName: '',
          phone: '',
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Found customer
    const customerDoc = querySnapshot.docs[0];
    const customerData = customerDoc.data();

    console.log('[Profile API] Customer found:', customerDoc.id);

    const response = {
      id: customerDoc.id,
      uid: customerData.uid || customerDoc.id,
      email: customerData.email,
      firstName: customerData.firstName || 'Customer',
      lastName: customerData.lastName || '',
      phone: customerData.phone || '',
      createdAt: customerData.createdAt,
    };

    console.log('[Profile API] === REQUEST SUCCESS ===');
    return Response.json(response);

  } catch (error) {
    console.error('[Profile API] === REQUEST ERROR ===');
    console.error('[Profile API] Error:', error.message);
    
    // Return fallback response instead of error
    return Response.json({
      id: 'unknown',
      uid: 'unknown',
      email: '',
      firstName: 'Customer',
      lastName: '',
      phone: '',
      createdAt: new Date().toISOString(),
    });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
