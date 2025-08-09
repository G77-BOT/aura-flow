document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const orderItemsContainer = document.getElementById('order-items-container');
    const orderTotalContainer = document.getElementById('order-total');
    const checkoutButton = document.getElementById('checkout-button');
    const errorMessage = document.getElementById('checkout-error');
    const mainContainer = document.querySelector('.checkout-section .container');

    // Initialize Stripe with publishable key from environment variables
    const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!stripePublishableKey) {
        console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined in environment variables');
        errorMessage.textContent = 'Payment system configuration error. Please try again later.';
        errorMessage.style.display = 'block';
        if (checkoutButton) checkoutButton.disabled = true;
        return;
    }
    
    const stripe = Stripe(stripePublishableKey);
    
    // Payment links from environment variables
    const paymentLinks = {
        5: process.env.PAYMENT_LINK_CELESTIAL_MAT || 'https://buy.stripe.com/00wfZa8Hnduq0Pu9f7gnK02',
        6: process.env.PAYMENT_LINK_ECO_MAT || 'https://buy.stripe.com/3cIbIU4r7bmi7dS2QJgnK03'
    };
    
    // Load cart from localStorage
    let cart = [];
    try {
        const cartData = localStorage.getItem('auraFlowCart');
        cart = cartData ? JSON.parse(cartData) : [];
        
        if (!Array.isArray(cart) || cart.length === 0) {
            throw new Error('Your cart is empty');
        }
        
        console.log('Loaded cart:', cart);
    } catch (error) {
        console.error('Error loading cart:', error);
        errorMessage.textContent = error.message === 'Your cart is empty' 
            ? 'Your cart is empty. Please add items before checking out.' 
            : 'Error loading your cart. Please try again.';
        errorMessage.style.display = 'block';
        if (checkoutButton) checkoutButton.disabled = true;
        return;
    }

    // Display cart items
    function renderOrderItems() {
        if (!cart || cart.length === 0) {
            orderItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
            if (checkoutButton) checkoutButton.disabled = true;
            return;
        }

        const itemsHtml = cart.map(item => `
            <div class="order-item">
                <div class="item-image">
                    ${item.image ? `<img src="${item.image}" alt="${item.name}">` : ''}
                </div>
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <p>$${item.price?.toFixed(2) || '0.00'}</p>
                </div>
            </div>
        `).join('');

        orderItemsContainer.innerHTML = itemsHtml;

        // Calculate and display total
        const subtotal = cart.reduce((sum, item) => sum + (item.price || 0), 0);
        const tax = subtotal * 0.1; // 10% tax
        const total = subtotal + tax;
        
        orderTotalContainer.innerHTML = `
            <div class="total-row">
                <span>Subtotal:</span>
                <span>$${subtotal.toFixed(2)}</span>
            </div>
            <div class="total-row">
                <span>Tax (10%):</span>
                <span>$${tax.toFixed(2)}</span>
            </div>
            <div class="total-row total-amount">
                <span>Total:</span>
                <span>$${total.toFixed(2)}</span>
            </div>
        `;
    }

    // Handle checkout button click
    if (checkoutButton) {
        checkoutButton.addEventListener('click', async () => {
            if (cart.length === 0) {
                errorMessage.textContent = 'Your cart is empty.';
                errorMessage.style.display = 'block';
                return;
            }

            // Show loading state
            checkoutButton.disabled = true;
            const buttonText = checkoutButton.querySelector('.button-text');
            const buttonLoader = checkoutButton.querySelector('.button-loader');
            if (buttonText) buttonText.style.display = 'none';
            if (buttonLoader) buttonLoader.style.display = 'inline';
            
            errorMessage.textContent = '';
            errorMessage.style.display = 'none';

            try {
                // Check if we have a single item with a direct payment link
                if (cart.length === 1 && paymentLinks[cart[0].id]) {
                    window.location.href = paymentLinks[cart[0].id];
                    return;
                }

                // For multiple items or items without direct payment links, use Stripe Checkout
                const response = await fetch('/api/create-checkout-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        items: cart.map(item => ({
                            id: item.id,
                            name: item.name,
                            price: item.price,
                            image: item.image,
                            quantity: 1
                        })),
                        success_url: `${window.location.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
                        cancel_url: `${window.location.origin}/checkout.html`,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to create checkout session');
                }

                const session = await response.json();
                
                // Redirect to Stripe Checkout
                const result = await stripe.redirectToCheckout({
                    sessionId: session.id
                });

                if (result.error) {
                    throw new Error(result.error.message);
                }
            } catch (error) {
                console.error('Checkout error:', error);
                errorMessage.textContent = error.message || 'An error occurred during checkout. Please try again.';
                errorMessage.style.display = 'block';
                
                // Reset button state
                checkoutButton.disabled = false;
                if (buttonText) buttonText.style.display = 'inline';
                if (buttonLoader) buttonLoader.style.display = 'none';
            }
        });
    }

    // Initial render
    renderOrderItems();
    
    // Fade in the content
    if (mainContainer) {
        mainContainer.style.opacity = 0;
        setTimeout(() => {
            mainContainer.style.transition = 'opacity 0.5s ease';
            mainContainer.style.opacity = 1;
        }, 100);
    }
});
