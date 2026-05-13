import React, { useState } from 'react';
import axios from 'axios';
import { auth } from '../firebase';

const AdminPortal = ({ onImpersonate }) => {
  const [flowCode, setFlowCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    axios.post('http://localhost:5000/api/users/impersonate', {
      adminEmail: auth.currentUser.email,
      flowCode: flowCode
    })
    .then(res => {
      // Pass the target user's data back to App.js to shift the dashboard
      onImpersonate(res.data.email, res.data.businessName);
    })
    .catch(err => {
      setError(err.response?.data?.error || "Failed to find account.");
    })
    .finally(() => {
      setIsLoading(false);
    });
  };

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', padding: '40px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      
      <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 20px auto', boxShadow: '0 4px 10px rgba(30, 58, 138, 0.3)' }}>
        🛡️
      </div>

      <h2 style={{ margin: '0 0 10px 0', color: '#111827', fontSize: '26px', fontWeight: '900' }}>Expert Support Portal</h2>
      <p style={{ margin: '0 0 30px 0', color: '#6b7280', fontSize: '15px' }}>Enter a client's RiskaFlow ID to securely access and manage their dashboard.</p>

      <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <input 
            type="text" 
            placeholder="e.g. RF-5F1P1K" 
            value={flowCode}
            onChange={(e) => setFlowCode(e.target.value.toUpperCase())}
            style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '2px solid #e5e7eb', fontSize: '20px', fontWeight: 'bold', textAlign: 'center', letterSpacing: '2px', outlineColor: '#2563eb', textTransform: 'uppercase' }}
            required
          />
        </div>

        {error && <div style={{ color: '#dc2626', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600' }}>{error}</div>}

        <button 
          type="submit" 
          disabled={isLoading}
          style={{ width: '100%', backgroundColor: '#2563eb', color: 'white', padding: '16px', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: isLoading ? 'wait' : 'pointer', transition: 'background-color 0.2s' }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
        >
          {isLoading ? 'Searching Database...' : 'Access Account'}
        </button>
      </form>
    </div>
  );
};

export default AdminPortal;