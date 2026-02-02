import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request) {
  try {
    // Get customer ID from Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing authorization token' },
        { status: 401 }
      );
    }

    const customerId = authHeader.split(' ')[1];

    // Get customer document
    const customerDoc = await getDoc(doc(db, 'customers', customerId));

    if (!customerDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customerData = customerDoc.data();

    return NextResponse.json({
      success: true,
      customer: customerData
    }, { status: 200 });

  } catch (error) {
    console.error('[Get Customer Profile] Error:', error.message);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Missing authorization' },
        { status: 401 }
      );
    }

    const customerId = authHeader.split(' ')[1];
    const { firstName, lastName, phone, address } = body;

    // Update customer
    const customerRef = doc(db, 'customers', customerId);
    const updateData = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;

    await updateDoc(customerRef, updateData);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('[Update Customer Profile] Error:', error.message);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
