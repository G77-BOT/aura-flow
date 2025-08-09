document.addEventListener('DOMContentLoaded', async () => {
    const orderItemsContainer = document.getElementById('order-items-container');
    const orderTotalContainer = document.getElementById('order-total');
    const checkoutButton = document.getElementById('checkout-button');
    const errorMessage = document.getElementById('checkout-error');
    const cartData = localStorage.getItem('auraFlowCart');

    // --- STRIPE INITIALIZATION ---
    // Using environment variable for the publishable key
    // For local development, create a .env.local file with NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_key_here
    const stripe = Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx');

    let cart = [];
    try {
        cart = cartData ? JSON.parse(cartData) : [];
    } catch(e) {
        console.error("Error parsing cart from localStorage", e);
        cart = [];
    }

    if (cart.length === 0) {
        document.querySelector('.checkout-layout').innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">Your cart is empty. <a href="index.html">Continue shopping</a>.</p>';
        return;
    }

    // Render cart items
    orderItemsContainer.innerHTML = cart.map(item => `
        <div class="checkout-item">
            <img src="${item.image}" alt="${item.name}" class="checkout-item-image">
            <div class="checkout-item-details">
                <p class="checkout-item-name">${item.name}</p>
                <p class="checkout-item-price">$${item.price.toFixed(2)}</p>
            </div>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    orderTotalContainer.innerHTML = `
        <p>Subtotal:</p>
        <p><strong>$${total.toFixed(2)}</strong></p>
    `;

    // Handle checkout button click
    checkoutButton.addEventListener('click', async () => {
        checkoutButton.disabled = true;
        checkoutButton.textContent = 'Processing...';
        errorMessage.textContent = '';

        try {
            // This requires a serverless function on Vercel.
            // See /api/create-checkout-session.js for the implementation.
            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ cart }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create checkout session.');
            }

            const session = await response.json();
            
            // Redirect to Stripe Checkout page
            const { error } = await stripe.redirectToCheckout({
                sessionId: session.id,
            });

            if (error) {
                throw new Error(error.message);
            }

        } catch (error) {
            console.error('Checkout error:', error);
            errorMessage.textContent = error.message;
            checkoutButton.disabled = false;
            checkoutButton.textContent = 'Proceed to Secure Payment';
        }
    });

    // Simple fade-in animation
    const mainContainer = document.querySelector('.checkout-section .container');
    mainContainer.style.opacity = 0;
    setTimeout(() => {
        mainContainer.style.transition = 'opacity 0.5s ease';
        mainContainer.style.opacity = 1;
    }, 100);
});