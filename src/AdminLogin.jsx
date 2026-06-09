import { useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  console.log("AdminLogin component loaded. Supabase client:", supabase);

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log("Login button clicked. Email:", email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log("SignIn response:", { data, error });
    if (error) {
      console.error("Login error:", error.message);
      setError(error.message);
    } else {
      console.log("Login success, navigating to dashboard");
      navigate('/admin/dashboard');
    }
  };

  return (
    <div className="admin-login">
      <h2>Admin Login</h2>
      <form onSubmit={handleLogin}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit">Login</button>
        {error && <p style={{color:'red'}}>{error}</p>}
      </form>
    </div>
  );
}

export default AdminLogin;