// Serverless Function for Stripe Checkout
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Validate required environment variables
if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not defined in environment variables');
    process.exit(1);
}

// Log environment for debugging
console.log('Starting checkout session creation in environment:', process.env.NODE_ENV || 'development');

export default async function handler(req, res) {
    console.log('Received request:', req.method, req.url);
    
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { items, success_url, cancel_url } = req.body;
        console.log('Received checkout request with items:', JSON.stringify(items, null, 2));

        if (!items || !Array.isArray(items) || items.length === 0) {
            console.error('Empty or invalid items received');
            return res.status(400).json({ error: 'Your cart is empty. Please add items before checking out.' });
        }

        // Validate each item in the cart
        const validItems = items.every(item => 
            item.price_data && 
            item.price_data.currency === 'usd' &&
            item.price_data.product_data &&
            item.price_data.product_data.name &&
            typeof item.price_data.unit_amount === 'number' &&
            item.quantity > 0
        );

        if (!validItems) {
            console.error('Invalid item format in cart');
            return res.status(400).json({ error: 'Invalid item format in cart.' });
        }

        // Determine the base URL from request headers for success/cancel URLs
        const proto = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers['host'];
        const baseUrl = `${proto}://${host}`;

        // Create a Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: items,
            mode: 'payment',
            success_url: success_url || `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancel_url || `${baseUrl}/cart.html`,
            metadata: {
                website: 'Aura & Flow',
                checkout_type: 'standard',
            },
        });

        console.log('Created checkout session:', session.id);
        
        // Return the session ID to the client
        res.status(200).json({ 
            id: session.id,
            url: session.url
        });

    } catch (err) {
        console.error('Stripe session creation error:', err);
        
        // Provide more detailed error information in development
        const errorResponse = {
            error: 'Failed to create checkout session',
            message: err.message,
            // Only include stack trace in development
            ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
        };
        
        res.status(500).json(errorResponse);
    }
}
