import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    console.log('[Google Trends] 📥 Fetching trending keywords...');

    // Mock trending keywords and products
    // In production, you'd call Google Trends API or use a service like pytrends
    const mockTrendingProducts = [
      {
        id: 'gt_1',
        title: 'Wireless Earbuds Pro',
        keyword: 'wireless earbuds',
        trendScore: 95,
        image: 'https://via.placeholder.com/300x300?text=Wireless+Earbuds',
        supplier: 'Google Trends',
        url: 'https://trends.google.com',
      },
      {
        id: 'gt_2',
        title: 'Smart Watch Ultra',
        keyword: 'smartwatch',
        trendScore: 87,
        image: 'https://via.placeholder.com/300x300?text=Smart+Watch',
        supplier: 'Google Trends',
        url: 'https://trends.google.com',
      },
      {
        id: 'gt_3',
        title: 'Portable Phone Charger',
        keyword: 'power bank',
        trendScore: 79,
        image: 'https://via.placeholder.com/300x300?text=Power+Bank',
        supplier: 'Google Trends',
        url: 'https://trends.google.com',
      },
      {
        id: 'gt_4',
        title: 'USB-C Hub',
        keyword: 'usb hub',
        trendScore: 72,
        image: 'https://via.placeholder.com/300x300?text=USB+Hub',
        supplier: 'Google Trends',
        url: 'https://trends.google.com',
      },
      {
        id: 'gt_5',
        title: 'Gaming Mouse',
        keyword: 'gaming mouse',
        trendScore: 68,
        image: 'https://via.placeholder.com/300x300?text=Gaming+Mouse',
        supplier: 'Google Trends',
        url: 'https://trends.google.com',
      },
    ];

    console.log('[Google Trends] ✅ Returned mock trending products');

    return NextResponse.json({
      success: true,
      products: mockTrendingProducts,
      source: 'Google Trends',
      note: 'Mock data based on recent search trends',
    });

  } catch (error) {
    console.error('[Google Trends] ❌ Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message, products: [] },
      { status: 200 }
    );
  }
}
