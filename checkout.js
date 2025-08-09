document.addEventListener('DOMContentLoaded', async () => {
    const orderItemsContainer = document.getElementById('order-items-container');
    const orderTotalContainer = document.getElementById('order-total');
    const checkoutButton = document.getElementById('checkout-button');
    const errorMessage = document.getElementById('checkout-error');

    // Initialize Stripe with your publishable key from environment variables
    const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!stripePublishableKey) {
        console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined in environment variables');
        errorMessage.textContent = 'Payment system configuration error. Please try again later.';
        errorMessage.style.display = 'block';
        checkoutButton.disabled = true;
        return;
    }
    
    const stripe = Stripe(stripePublishableKey);
    
    // Payment links from environment variables
    const paymentLinks = {
        5: process.env.PAYMENT_LINK_CELESTIAL_MAT || '',
        6: process.env.PAYMENT_LINK_ECO_MAT || ''
    };
    
    // Validate payment links
    if (!paymentLinks[5] || !paymentLinks[6]) {
        console.error('Payment links are not properly configured in environment variables');
    }

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
        checkoutButton.disabled = true;
        return;
    }

    // Display cart items
    function renderOrderItems() {
        if (!cart || cart.length === 0) {
            orderItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
            checkoutButton.disabled = true;
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
    checkoutButton.addEventListener('click', async () => {
        if (cart.length === 0) {
            errorMessage.textContent = 'Your cart is empty.';
            errorMessage.style.display = 'block';
            return;
        }

        checkoutButton.disabled = true;
        const buttonText = checkoutButton.querySelector('.button-text');
        const buttonLoader = checkoutButton.querySelector('.button-loader');
        buttonText.style.display = 'none';
        buttonLoader.style.display = 'inline';
        
        errorMessage.textContent = '';
        errorMessage.style.display = 'none';

        try {
            // For now, we'll handle one item at a time with direct payment links
            // In a real app, you'd want to handle multiple items in a single transaction
            const item = cart[0]; // Get the first item in cart
            
            // Check if we have a direct payment link for this product
            if (paymentLinks[item.id]) {
                window.location.href = paymentLinks[item.id];
                return;
            }
            
            // Fallback to Stripe Checkout if no direct link is found
            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: [{
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: item.name,
                                description: item.description || '',
                                images: item.image ? [
                                    item.image.startsWith('http') 
                                        ? item.image 
                                        : `${window.location.origin}/${item.image}`
                                ] : []
                            },
                            unit_amount: Math.round((item.price || 0) * 100), // Convert to cents
                        },
                        quantity: 1,
                    }],
                    success_url: `${window.location.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${window.location.origin}/checkout.html`,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.url) {
                throw new Error('No redirect URL received from server');
            }
            
            // Redirect to the payment page
            window.location.href = result.url;
        } catch (error) {
            console.error('Checkout error:', error);
            errorMessage.textContent = error.message || 'An error occurred during checkout. Please try again.';
            errorMessage.style.display = 'block';
            checkoutButton.disabled = false;
            checkoutButton.textContent = 'Proceed to Secure Payment';
            
            // Log the full error for debugging
            console.error('Full error:', error);
        }
    });

    // Initial render
    renderOrderItems();
});
