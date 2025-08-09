// Serverless Function for Stripe Checkout
// Environment Variables Required:
// - STRIPE_SECRET_KEY: Your Stripe secret key (starts with 'sk_live_' for production)
// - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: Your Stripe publishable key (for client-side)
// - NODE_ENV: 'production' or 'development' (automatically set by Vercel)

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Validate environment variables
if (!process.env.STRIPE_SECRET_KEY) {
    console.error('Missing required environment variable: STRIPE_SECRET_KEY');
    process.exit(1);
}

// This is the source of truth for product data.
// We look up prices here based on IDs from the cart to prevent price tampering on the client-side.
const productData = {
    1: { name: 'Terracotta Sun Bikini', price: 59.99, image: 'bikini-1.png' },
    2: { name: 'Tropical Escape Bikini', price: 64.99, image: 'bikini-2.png' },
    3: { name: 'Noir Lace Lingerie', price: 75.00, image: 'lingerie-1.png' },
    4: { name: 'Dusty Rose Comfort Set', price: 49.99, image: 'lingerie-2.png' },
    5: { name: 'Celestial Moon Yoga Mat', price: 59.99, image: 'yoga-mat-1.png' },
    6: { name: 'Eco-Friendly Cork Mat', price: 59.99, image: 'yoga-mat-2.png' },
    7: { name: 'Forest Green Leggings', price: 79.99, image: 'leggings-1.png' },
    8: { name: 'Deep Blue Flow Leggings', price: 84.99, image: 'leggings-2.png' },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    try {
        const { cart } = req.body;

        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            return res.status(400).json({ error: 'Cart is empty or invalid.' });
        }
        
        // Determine the base URL from request headers for robustness against different deployment environments.
        const proto = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers['host'];
        const baseUrl = `${proto}://${host}`;

        const line_items = cart.map(item => {
            const product = productData[item.id];
            if (!product) {
                console.warn(`Invalid product ID in cart: ${item.id}`);
                return null;
            }
            // Stripe requires price in the smallest currency unit (e.g., cents for USD).
            const unit_amount = Math.round(product.price * 100);

            return {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: product.name,
                        images: [`${baseUrl}/${product.image}`],
                    },
                    unit_amount: unit_amount,
                },
                quantity: 1, // Assuming quantity is always 1 per current cart logic
            };
        }).filter(Boolean); // Remove any null items from invalid IDs

        if (line_items.length === 0) {
            return res.status(400).json({ error: 'No valid items in the cart to check out.' });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: line_items,
            mode: 'payment',
            success_url: `${baseUrl}/success.html`,
            cancel_url: `${baseUrl}/cancel.html`,
        });

        res.status(200).json({ id: session.id });

    } catch (err) {
        console.error('Stripe session creation error:', err);
        // Pass the actual Stripe error message to the client for better debugging.
        const errorMessage = err.message || 'An internal server error occurred.';
        res.status(500).json({ error: errorMessage });
    }
}