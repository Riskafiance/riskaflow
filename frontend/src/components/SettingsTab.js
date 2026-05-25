import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { auth } from '../firebase';

const SettingsTab = () => {
  const [formData, setFormData] = useState({
    businessName: '', businessAddress: '', businessPhone: '', businessWebsite: '', firstName: '', lastName: '',
    businessLogo: '', flowCode: '' // 🔥 ADDED: flowCode to state
  });
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    if (auth.currentUser) {
      axios.get(`https://riskaflow.onrender.com/api/users?email=${auth.currentUser.email}`)
        .then(res => {
          if (res.data) {
            setFormData({
              businessName: res.data.businessName || '',
              businessAddress: res.data.businessAddress || '',
              businessPhone: res.data.businessPhone || '',
              businessWebsite: res.data.businessWebsite || '',
              firstName: res.data.firstName || '',
              lastName: res.data.lastName || '',
              businessLogo: res.data.businessLogo || '',
              flowCode: res.data.flowCode || '' // 🔥 Fetches the Master ID from DB
            });
          }
        })
        .catch(err => console.error("Error fetching profile:", err));
    }
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // Handle Logo Upload to Base64
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert("Logo must be less than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, businessLogo: reader.result }); 
      };
      reader.readAsDataURL(file);
    }
  };

  // 🔥 Handle Stripe Connect Onboarding
  const handleStripeConnect = () => {
    axios.post('https://riskaflow.onrender.com/api/stripe/onboard', { email: auth.currentUser.email })
      .then(res => {
        window.open(res.data.url, '_blank'); // Opens Stripe's secure portal in a NEW tab
      })
      .catch(err => alert("Failed to connect to Stripe. Please try again."));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaveStatus('Saving...');
    
    axios.put('https://riskaflow.onrender.com/api/users', { ...formData, email: auth.currentUser.email })
      .then(() => {
        setSaveStatus('Settings saved successfully!');
        setTimeout(() => setSaveStatus(''), 3000);
      })
      .catch(err => {
        console.error(err);
        setSaveStatus('Failed to save settings.');
      });
  };

  const inputStyle = { padding: '12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%', boxSizing: 'border-box', fontSize: '14px', outlineColor: '#2563eb' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4b5563' };

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', padding: '30px', maxWidth: '800px' }}>
      
      <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, color: '#111827', fontSize: '24px', fontWeight: 'bold' }}>Company Settings</h2>
          <p style={{ margin: '5px 0 0 0', color: '#6b7280', fontSize: '14px' }}>Manage your business profile. This information will appear on your invoices and reports.</p>
        </div>
      </div>

      {/* 🔥 NEW: RiskaFlow Master Firm ID Badge */}
      {formData.flowCode && (
        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '18px 20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#1e3a8a', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Master Firm ID</p>
            <p style={{ margin: 0, fontSize: '13px', color: '#3b82f6', fontWeight: '500' }}>Provide this code to clients or support for secure account linking.</p>
          </div>
          <div style={{ backgroundColor: '#ffffff', border: '2px solid #93c5fd', padding: '10px 20px', borderRadius: '8px', fontSize: '22px', fontWeight: '900', color: '#1e40af', letterSpacing: '3px', cursor: 'text', userSelect: 'all', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            {formData.flowCode}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        {/* Logo Upload Section */}
        <div>
          <label style={labelStyle}>Company Logo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db' }}>
            {formData.businessLogo ? (
              <img src={formData.businessLogo} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '4px', backgroundColor: 'white' }} />
            ) : (
              <div style={{ width: '80px', height: '80px', backgroundColor: '#ffffff', border: '1px dashed #d1d5db', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '12px' }}>No Logo</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input type="file" accept="image/png, image/jpeg" onChange={handleImageUpload} style={{ fontSize: '14px', color: '#4b5563' }} />
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Recommended size: 300x300px. Max 2MB.</span>
            </div>
            {formData.businessLogo && (
              <button type="button" onClick={() => setFormData({ ...formData, businessLogo: '' })} style={{ marginLeft: 'auto', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Remove Logo</button>
            )}
          </div>
        </div>

        <div style={{ borderTop: '1px solid #e5e7eb', margin: '10px 0' }}></div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div><label style={labelStyle}>Your First Name</label><input type="text" name="firstName" value={formData.firstName} onChange={handleChange} style={inputStyle} /></div>
          <div><label style={labelStyle}>Your Last Name</label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} style={inputStyle} /></div>
        </div>

        <div>
          <label style={labelStyle}>Business Name</label>
          <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} style={inputStyle} placeholder="e.g. Acme Corp LLC" />
        </div>

        <div>
          <label style={labelStyle}>Business Address</label>
          <textarea name="businessAddress" rows="3" value={formData.businessAddress} onChange={handleChange} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} placeholder="123 Main St&#10;City, State 12345" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div><label style={labelStyle}>Business Phone</label><input type="text" name="businessPhone" value={formData.businessPhone} onChange={handleChange} style={inputStyle} placeholder="(555) 555-5555" /></div>
          <div><label style={labelStyle}>Website</label><input type="text" name="businessWebsite" value={formData.businessWebsite} onChange={handleChange} style={inputStyle} placeholder="www.yourwebsite.com" /></div>
        </div>

        <div style={{ borderTop: '1px solid #e5e7eb', margin: '10px 0' }}></div>

        {/* Stripe Connect Section */}
        <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#0f172a' }}>Payment Integration</h3>
          <p style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#64748b' }}>Connect your bank account via Stripe to securely accept credit card payments from your clients directly on your invoices.</p>
          <button type="button" onClick={handleStripeConnect} style={{ backgroundColor: '#635bff', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M13.976 9.15c-2.172-.806-3.356-1.143-3.356-2.077 0-.839.814-1.321 2.05-1.321 1.63 0 3.095.607 4.196 1.487l1.107-2.673A8.406 8.406 0 0 0 12.63 3C8.423 3 5.484 5.353 5.484 9.108c0 4.12 3.657 5.167 6.425 6.038 2.378.75 3.612 1.357 3.612 2.464 0 1.053-1.018 1.625-2.428 1.625-1.928 0-3.692-.785-5.06-1.91l-1.196 2.696C8.5 21.282 10.664 22 12.825 22c4.482 0 7.553-2.268 7.553-6.196 0-4.322-3.832-5.464-6.402-6.654z"/></svg>
            Connect with Stripe
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
          <button type="submit" style={{ backgroundColor: '#10b981', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
            Save Changes
          </button>
          {saveStatus && (
            <span style={{ color: saveStatus.includes('success') ? '#059669' : '#dc2626', fontWeight: '600', fontSize: '14px', animation: 'fadeIn 0.3s' }}>
              {saveStatus}
            </span>
          )}
        </div>

      </form>
    </div>
  );
};

export default SettingsTab;