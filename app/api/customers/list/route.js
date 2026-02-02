import { NextResponse } from 'next/server';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request) {
  try {
    // Get query parameters for filtering and sorting
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const limit = parseInt(searchParams.get('limit')) || 50;
    const search = searchParams.get('search') || '';

    // Build query
    let q = query(
      collection(db, 'customers'),
      orderBy(sortBy, 'desc')
    );

    const querySnapshot = await getDocs(q);
    const customers = [];

    querySnapshot.forEach(doc => {
      const data = doc.data();
      
      // Filter by search if provided
      if (search) {
        const searchLower = search.toLowerCase();
        if (
          data.email.toLowerCase().includes(searchLower) ||
          data.firstName.toLowerCase().includes(searchLower) ||
          data.lastName.toLowerCase().includes(searchLower)
        ) {
          customers.push({ id: doc.id, ...data });
        }
      } else {
        customers.push({ id: doc.id, ...data });
      }
    });

    // Limit results
    const paginatedCustomers = customers.slice(0, limit);

    return NextResponse.json({
      success: true,
      count: customers.length,
      displayed: paginatedCustomers.length,
      customers: paginatedCustomers
    }, { status: 200 });

  } catch (error) {
    console.error('[List Customers] Error:', error.message);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
