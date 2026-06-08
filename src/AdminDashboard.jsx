import { useEffect, useState } from 'react';
import axios from 'axios';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error("No active session");
      return null;
    }
    console.log("Token obtained:", session.access_token.substring(0, 20) + "...");
    return session.access_token;
  };

  const fetchOrders = async () => {
    const token = await getToken();
    if (!token) {
      navigate('/admin/login');
      return;
    }
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data);
    } catch (err) {
      console.error("Fetch orders error:", err.response?.status, err.response?.data);
      if (err.response?.status === 401) navigate('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const updateStatus = async (orderId, newStatus) => {
    const token = await getToken();
    if (!token) return;
    await axios.put(`${import.meta.env.VITE_BACKEND_URL}/api/admin/orders/${orderId}/status?status=${newStatus}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchOrders(); // refresh after update
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard <button onClick={logout}>Logout</button></h2>
      <table border="1" cellPadding="8">
        <thead>
          <tr><th>ID</th><th>Email</th><th>Total ($)</th><th>Status</th><th>Method</th><th>Action</th></tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id}>
              <td>{order.id}</td>
              <td>{order.customer_email}</td>
              <td>{(order.total_amount / 100).toFixed(2)}</td>
              <td>{order.status}</td>
              <td>{order.payment_method}</td>
              <td>
                <select onChange={e => updateStatus(order.id, e.target.value)} value={order.status}>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="shipped">Shipped</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminDashboard;