// Serverless Function to retrieve checkout session details
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { session_id } = req.query;
    
    if (!session_id) {
        return res.status(400).json({ error: 'Session ID is required' });
    }

    try {
        // Retrieve the session from Stripe
        const session = await stripe.checkout.sessions.retrieve(session_id, {
            expand: ['line_items.data.price.product', 'payment_intent']
        });

        // Return the session data to the client
        res.status(200).json(session);
        
    } catch (err) {
        console.error('Error retrieving checkout session:', err);
        
        // Provide more detailed error information in development
        const errorResponse = {
            error: 'Failed to retrieve checkout session',
            message: err.message,
            // Only include stack trace in development
            ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
        };
        
        res.status(500).json(errorResponse);
    }
}
