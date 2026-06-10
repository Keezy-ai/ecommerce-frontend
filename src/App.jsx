import { useState, useEffect } from 'react';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './supabaseClient';
import MpesaPayment from './MpesaPayment';
import './App.css';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Hardcoded backend URL (your Render URL)
const BACKEND_URL = "https://ecommerce-backend-c5fg.onrender.com";

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerEmail, setCustomerEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null);

  console.log("Backend URL used:", BACKEND_URL);

  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/products`)
      .then(res => {
        setProducts(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch products error:", err);
        setLoading(false);
      });
  }, []);

  const addToCart = (product) => {
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
      setCart(cart.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQty = (id, delta) => {
    setCart(cart.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  };

  const removeItem = (id) => {
    setCart(cart.filter(i => i.id !== id));
  };

  const total = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);

  const handleStripeCheckout = async () => {
    if (!customerEmail) return alert('Enter email');
    setLoading(true);
    try {
      const items = cart.map(i => ({ id: i.id, price: i.price, quantity: i.quantity }));
      const { data } = await axios.post(`${BACKEND_URL}/api/create-payment-intent`, {
        items,
        customerEmail
      });
      setCurrentOrderId(data.orderId);
      setOrderStatus('pending');
      const stripe = await stripePromise;
      const { error } = await stripe.confirmPayment({
        clientSecret: data.clientSecret,
        confirmParams: {
          return_url: window.location.origin,
          payment_method_data: { billing_details: { email: customerEmail } }
        }
      });
      if (error) alert('Payment failed: ' + error.message);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentOrderId) return;
    const channel = supabase
      .channel(`order-${currentOrderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${currentOrderId}`
      }, (payload) => {
        setOrderStatus(payload.new.status);
        if (payload.new.status === 'completed') {
          alert('Order completed!');
          setCart([]);
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [currentOrderId]);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading products...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Real‑Time E‑commerce</h1>
      <div className="main">
        <div className="products">
          <h2>Products</h2>
          <div className="product-grid">
            {products.map(p => (
              <div key={p.id} className="product-card">
                <img src={p.image_url} alt={p.name} width="120" />
                <h3>{p.name}</h3>
                <p>${(p.price / 100).toFixed(2)}</p>
                <button onClick={() => addToCart(p)}>Add to Cart</button>
              </div>
            ))}
          </div>
        </div>

        <div className="cart">
          <h2>Your Cart</h2>
          {cart.length === 0 && <p>Cart is empty</p>}
          {cart.map(item => (
            <div key={item.id} className="cart-item">
              <span>{item.name}</span>
              <span>${(item.price / 100).toFixed(2)}</span>
              <div>
                <button onClick={() => updateQty(item.id, -1)}>-</button>
                <span>{item.quantity}</span>
                <button onClick={() => updateQty(item.id, 1)}>+</button>
                <button onClick={() => removeItem(item.id)}>✖</button>
              </div>
              <span>${((item.price * item.quantity) / 100).toFixed(2)}</span>
            </div>
          ))}
          {cart.length > 0 && (
            <>
              <div className="total">Total: ${(total / 100).toFixed(2)}</div>
              <input type="email" placeholder="Your email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
              <button onClick={handleStripeCheckout} disabled={loading}>
                {loading ? 'Processing...' : 'Pay with Stripe'}
              </button>
              {currentOrderId && orderStatus === 'pending' && (
                <MpesaPayment
                  amount={total}
                  orderId={currentOrderId}
                  customerEmail={customerEmail}
                  onSuccess={() => setOrderStatus('completed')}
                  onError={() => console.log('MPesa error')}
                />
              )}
              {orderStatus === 'completed' && <p className="success">✅ Payment received!</p>}
            </>
          )}
        </div>
      </div>
      <div style={{ marginTop: 20 }}><a href="/admin/login">Admin Login</a></div>
    </div>
  );
}

export default App;