import { gsap } from "gsap";

const products = [
    { 
        id: 1, 
        name: 'Terracotta Sun Bikini', 
        category: 'Bikinis', 
        image: 'bikini-1.png',
        price: 59.99,
        inStock: false,
        description: 'A high-waisted, terracotta-colored bikini set, perfect for soaking up the sun.', 
        affiliateLink: 'https://www.amazon.com/s?k=terracotta+bikini' 
    },
    { 
        id: 2, 
        name: 'Tropical Escape Bikini', 
        category: 'Bikinis', 
        image: 'bikini-2.png',
        price: 64.99,
        inStock: false,
        description: 'Vibrant, tropical print bikini that brings the spirit of the islands to you.', 
        affiliateLink: 'https://www.amazon.com/s?k=tropical+print+bikini' 
    },
    { 
        id: 3, 
        name: 'Noir Lace Lingerie', 
        category: 'Lingerie', 
        image: 'lingerie-1.png',
        price: 75.00,
        inStock: false,
        description: 'An elegant and timeless black lace lingerie set for special moments.', 
        affiliateLink: 'https://www.amazon.com/s?k=black+lace+lingerie+set' 
    },
    { 
        id: 4, 
        name: 'Dusty Rose Comfort Set', 
        category: 'Lingerie', 
        image: 'lingerie-2.png',
        price: 49.99,
        inStock: false,
        description: 'A comfortable and stylish cotton bralette and panty set in a dusty rose color.', 
        affiliateLink: 'https://www.amazon.com/s?k=dusty+rose+lingerie+set' 
    },
    { 
        id: 5, 
        name: 'Celestial Moon Yoga Mat', 
        category: 'Yoga Mats', 
        image: 'yoga-mat-1.png',
        price: 89.99,
        inStock: true,
        description: 'A beautiful, non-slip yoga mat with a celestial moon phase print to inspire your practice.', 
        affiliateLink: null
    },
    { 
        id: 6, 
        name: 'Eco-Friendly Cork Mat', 
        category: 'Yoga Mats', 
        image: 'yoga-mat-2.png',
        price: 95.50,
        inStock: true,
        description: 'A textured, eco-friendly cork yoga mat that offers superior grip and sustainability.', 
        affiliateLink: null
    },
    { 
        id: 7, 
        name: 'Forest Green Leggings', 
        category: 'Leggings', 
        image: 'leggings-1.png',
        price: 79.99,
        inStock: false,
        description: 'High-waisted, seamless leggings in a forest green color, designed for ultimate comfort and flexibility.', 
        affiliateLink: 'https://www.amazon.com/s?k=forest+green+leggings' 
    },
    { 
        id: 8, 
        name: 'Deep Blue Flow Leggings', 
        category: 'Leggings', 
        image: 'leggings-2.png',
        price: 84.99,
        inStock: false,
        description: 'Buttery-soft leggings in a deep blue color that move with you, from the studio to the street.', 
        affiliateLink: 'https://www.amazon.com/s?k=deep+blue+leggings' 
    },
];

const productGrid = document.getElementById('product-grid');
const navLinks = document.querySelectorAll('.nav-link');
const cartIcon = document.getElementById('cart-icon');
const cartPanel = document.getElementById('cart-panel');
const closeCartBtn = document.getElementById('close-cart-btn');
const cartCountEl = document.getElementById('cart-count');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartOverlay = document.getElementById('cart-overlay');
const cartFooter = document.querySelector('.cart-footer');

let cart = [];

// --- Audio Setup ---
let audioContext;
let audioBuffers = {};

async function setupAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    await loadAudio('add', 'cart-add.mp3');
    await loadAudio('remove', 'cart-remove.mp3');
}

async function loadAudio(name, url) {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioBuffers[name] = audioBuffer;
    } catch (error) {
        console.error(`Failed to load audio ${name}:`, error);
    }
}

function playAudio(name) {
    if (!audioContext || !audioBuffers[name]) return;
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffers[name];
    source.connect(audioContext.destination);
    source.start(0);
}


function renderProducts(category = 'all') {
    productGrid.innerHTML = '';

    const filteredProducts = category === 'all'
        ? products
        : products.filter(product => product.category === category);

    filteredProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        if (!product.inStock) {
            card.classList.add('out-of-stock');
        }
        card.dataset.productId = product.id;

        const buyButtonHtml = product.inStock
            ? `<button class="buy-button" data-product-id="${product.id}">Add to Cart</button>`
            : `<a href="${product.affiliateLink}" target="_blank" rel="noopener noreferrer" class="buy-button amazon-link">View on Amazon</a>`;

        const stockLabel = !product.inStock ? '<div class="out-of-stock-label">Out of Stock</div>' : '';

        card.innerHTML = `
            <div class="product-image-container">
                <img src="${product.image}" alt="${product.name}" class="product-image">
                ${stockLabel}
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-category">${product.category}</p>
                <p class="product-description">${product.description}</p>
                <p class="product-price">$${product.price.toFixed(2)}</p>
                ${buyButtonHtml}
            </div>
        `;
        productGrid.appendChild(card);
    });
    
    // Add event listeners to new 'Add to Cart' buttons
    document.querySelectorAll('.buy-button[data-product-id]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const productId = e.target.dataset.productId;
            const product = products.find(p => p.id === Number(productId));
             if (product && product.inStock) {
                addToCart(Number(productId));
            }
        });
    });

    // Animate new cards
    gsap.from(".product-card", { 
        duration: 0.5, 
        opacity: 0, 
        y: 30, 
        stagger: 0.1,
        ease: 'power2.out'
    });
}

function addToCart(productId) {
    if (cart.find(item => item.id === productId)) {
        showToast('Item is already in your cart.');
        return;
    }
    const productToAdd = products.find(p => p.id === productId);
    if (productToAdd) {
        cart.push(productToAdd);
        saveCart();
        updateCartUI();
        showToast('Added to cart!');
        playAudio('add');
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
    playAudio('remove');
}

function saveCart() {
    localStorage.setItem('auraFlowCart', JSON.stringify(cart));
}

function loadCart() {
    const savedCart = localStorage.getItem('auraFlowCart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}

function updateCartUI() {
    cartCountEl.textContent = cart.length;
    gsap.fromTo(cartCountEl, {scale: 1.5}, {scale: 1, duration: 0.3, ease: 'back.out(1.7)'});
    renderCartItems();
    updateCartFooter();
}

function renderCartItems() {
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="cart-empty-message">Your cart is empty.</p>';
        return;
    }

    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item" data-product-id="${item.id}">
            <img src="${item.image}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-info">
                <p class="cart-item-name">${item.name}</p>
                <p class="cart-item-price">$${item.price.toFixed(2)}</p>
                <div class="cart-item-actions">
                    <button class="remove-from-cart-btn" data-product-id="${item.id}">Remove</button>
                </div>
            </div>
        </div>
    `).join('');

    // Add event listeners for remove buttons
    document.querySelectorAll('.remove-from-cart-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = Number(e.target.dataset.productId);
            removeFromCart(productId);
        });
    });
}

function updateCartFooter() {
    if (cart.length > 0) {
        const total = cart.reduce((sum, item) => sum + item.price, 0);
        cartFooter.innerHTML = `
            <div class="cart-total">
                <span>Subtotal:</span>
                <span>$${total.toFixed(2)}</span>
            </div>
            <a href="checkout.html" class="checkout-btn">Proceed to Checkout</a>
        `;
    } else {
        cartFooter.innerHTML = ''; // Clear footer when cart is empty
    }
}

function showToast(message) {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    toast.addEventListener('animationend', () => {
        if(toast.style.animationName === 'toast-out') {
            toast.remove();
        }
    });
    // Set animation name to trigger fade out
    setTimeout(() => {
      toast.style.animationName = 'toast-out';
    }, 2500);
}

function toggleCartPanel() {
    cartPanel.classList.toggle('open');
    cartOverlay.classList.toggle('show');
}

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const category = link.dataset.category;

        navLinks.forEach(nav => nav.classList.remove('active'));
        link.classList.add('active');
        
        renderProducts(category);
    });
});

// Initial Render on page load
document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    updateCartUI();
    renderProducts();
    setupAudio();

    cartIcon.addEventListener('click', () => {
        // Resume audio context on user interaction
        if(audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        toggleCartPanel();
    });
    closeCartBtn.addEventListener('click', toggleCartPanel);
    cartOverlay.addEventListener('click', toggleCartPanel);


    // Page Load Animations
    gsap.from(".logo", { duration: 0.5, y: -50, opacity: 0, ease: "power2.out" });
    gsap.from("nav ul li", { duration: 0.5, y: -50, opacity: 0, ease: "power2.out", stagger: 0.1, delay: 0.2 });
    gsap.from(".hero h1", { duration: 0.8, x: -100, opacity: 0, ease: "power2.out", delay: 0.5 });
    gsap.from(".hero p", { duration: 0.8, x: -100, opacity: 0, ease: "power2.out", delay: 0.7 });
    gsap.from(".cta-button", { duration: 0.8, scale: 0.5, opacity: 0, ease: "back.out(1.7)", delay: 1 });
});