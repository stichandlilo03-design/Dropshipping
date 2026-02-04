import axios from 'axios';

export async function POST(request) {
  try {
    const { apiKey, accessToken, boardId, accountId } = await request.json();

    // Validate required fields
    if (!accessToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Pinterest access token is required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Test Pinterest API connection
    console.log('🧪 Testing Pinterest API...');

    const response = await axios.get(
      'https://api.pinterest.com/v5/user_account',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Pinterest API test successful:', response.data);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Pinterest connected successfully',
        data: {
          accountId: response.data?.id || accountId,
          username: response.data?.username
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Pinterest API Error:', error.message);
    
    // More detailed error logging
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to connect to Pinterest API',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
      { status: error.response?.status || 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
