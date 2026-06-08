import { useState } from 'react';
import axios from 'axios';
import { supabase } from './supabaseClient';

function MpesaPayment({ amount, orderId, customerEmail, onSuccess, onError }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (!phone) return alert('Enter M‑Pesa phone number');
    setLoading(true);
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/mpesa/stkpush`, {
        amount: amount / 100,
        phone_number: phone,
        order_id: orderId,
        customer_email: customerEmail
      });
      alert(data.customer_message);
      
      const channel = supabase
        .channel('mpesa-tx')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'mpesa_transactions',
          filter: `merchant_request_id=eq.${data.merchant_request_id}`
        }, (payload) => {
          if (payload.new.status === 'completed') {
            alert('Payment successful!');
            onSuccess();
            supabase.removeChannel(channel);
          } else if (payload.new.status === 'failed') {
            alert('Payment failed: ' + payload.new.result_desc);
            onError();
            supabase.removeChannel(channel);
          }
        })
        .subscribe();
    } catch (err) {
      alert('STK Push error: ' + err.message);
      onError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mpesa-box">
      <h4>Pay with M‑Pesa</h4>
      <input type="tel" placeholder="0712345678" value={phone} onChange={e => setPhone(e.target.value)} disabled={loading} />
      <button onClick={handlePay} disabled={loading}>{loading ? 'Sending STK...' : 'Pay with M‑Pesa'}</button>
    </div>
  );
}

export default MpesaPayment;