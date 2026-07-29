import React, { useState } from 'react';
import axios from 'axios';
import { auth } from '../firebase'; // 🔥 NEW: Import Firebase auth

const CustomersTab = ({ customers, refreshData, onViewProfile }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    title: '', firstName: '', middleName: '', lastName: '', suffix: '',
    companyName: '', displayName: '', email: '', phone: '',
    cc: '', bcc: '', mobile: '', fax: '', other: '', website: '', address: ''
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleEdit = (customer) => {
    setEditingId(customer.id);
    setFormData(customer); 
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this client? This cannot be undone.")) {
      axios.delete(`https://riskaflow.onrender.com/api/customers/${id}`)
        .then(() => refreshData())
        .catch(err => alert("Error: Could not delete client. They may have invoices attached."));
    }
  };

  // 🔥 UPDATED: Attach the logged-in user's email to the payload
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to save clients.");
      return;
    }

    const url = editingId ? `https://riskaflow.onrender.com/api/customers/${editingId}` : 'https://riskaflow.onrender.com/api/customers';
    const method = editingId ? 'put' : 'post';

    // Bundle the form data WITH the Firebase user info
    const payload = {
      ...formData,
      userEmail: user.email,
      userUid: user.uid
    };

    axios[method](url, payload)
      .then(() => {
        setShowForm(false);
        setEditingId(null);
        setFormData({
          title: '', firstName: '', middleName: '', lastName: '', suffix: '',
          companyName: '', displayName: '', email: '', phone: '',
          cc: '', bcc: '', mobile: '', fax: '', other: '', website: '', address: ''
        });
        refreshData();
      })
      .catch(err => {
        console.error("Save Error:", err);
        alert("Failed to save client. Check backend terminal.");
      });
  };

  const filteredCustomers = customers.filter(c => {
    const fullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
    const company = (c.companyName || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    
    return fullName.includes(search) || company.includes(search);
  });

  // --- STYLING HELPERS ---
  const inputStyle = { padding: '12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%', boxSizing: 'border-box', fontSize: '14px', outlineColor: '#2563eb' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4b5563' };

  if (showForm) {
    return (
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' }}>
        <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '20px', marginBottom: '30px' }}>
          <h2 style={{ color: '#111827', margin: 0, fontSize: '24px' }}>
            {editingId ? 'Edit Client Profile' : 'Add New Client'}
          </h2>
          <p style={{ color: '#6b7280', margin: '5px 0 0 0', fontSize: '14px' }}>Enter the client's contact and billing information below.</p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr 2fr 1fr', gap: '20px' }}>
            <div><label style={labelStyle}>Title</label><input type="text" name="title" value={formData.title || ''} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>First name *</label><input type="text" required name="firstName" value={formData.firstName || ''} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>Middle</label><input type="text" name="middleName" value={formData.middleName || ''} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>Last name *</label><input type="text" required name="lastName" value={formData.lastName || ''} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>Suffix</label><input type="text" name="suffix" value={formData.suffix || ''} onChange={handleChange} style={inputStyle} /></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div><label style={labelStyle}>Company name</label><input type="text" name="companyName" value={formData.companyName || ''} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>Customer display name</label><input type="text" name="displayName" value={formData.displayName || ''} onChange={handleChange} style={inputStyle} /></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div><label style={labelStyle}>Email *</label><input type="email" required name="email" value={formData.email || ''} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>Phone number *</label><input type="text" required name="phone" value={formData.phone || ''} onChange={handleChange} style={inputStyle} /></div>
          </div>

          <div>
            <label style={labelStyle}>Billing address</label>
            <textarea name="address" rows="3" value={formData.address || ''} onChange={handleChange} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Street, City, State, ZIP" />
          </div>

          <div style={{ display: 'flex', gap: '15px', marginTop: '10px', borderTop: '1px solid #e5e7eb', paddingTop: '25px' }}>
            <button type="submit" style={{ backgroundColor: '#10b981', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              {editingId ? 'Save Changes' : 'Create Client'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} style={{ backgroundColor: '#f3f4f6', color: '#374151', padding: '12px 24px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', padding: '30px' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#111827', fontSize: '24px', fontWeight: 'bold' }}>Client Directory</h2>
          <p style={{ margin: '5px 0 0 0', color: '#6b7280', fontSize: '14px' }}>Manage your active clients, view profiles, and update contact information.</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ title: '', firstName: '', middleName: '', lastName: '', suffix: '', companyName: '', displayName: '', email: '', phone: '', cc: '', bcc: '', mobile: '', fax: '', other: '', website: '', address: '' });
            setShowForm(true);
          }} 
          style={{ backgroundColor: '#10b981', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
        >
          + Add New Client
        </button>
      </div>

      {/* SEARCH BAR */}
      <div style={{ marginBottom: '25px' }}>
        <input 
          type="text" 
          placeholder="🔍 Search clients by name or company..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px', color: '#374151', boxSizing: 'border-box', backgroundColor: '#f9fafb', outlineColor: '#2563eb' }}
        />
      </div>
      
      {/* PROFESSIONAL TABLE */}
      <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', color: '#4b5563', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '16px 20px', fontWeight: '600' }}>Client Name</th>
              <th style={{ padding: '16px 20px', fontWeight: '600' }}>Contact Info</th>
              <th style={{ padding: '16px 20px', fontWeight: '600' }}>Company</th>
              <th style={{ padding: '16px 20px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map(c => {
              const initials = `${c.firstName?.charAt(0) || ''}${c.lastName?.charAt(0) || ''}`.toUpperCase();
              
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid #e5e7eb', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', border: '1px solid #bfdbfe', flexShrink: 0 }}>
                        {initials}
                      </div>
                      <button 
                        onClick={() => onViewProfile(c.id)} 
                        style={{ background: 'none', border: 'none', color: '#111827', fontSize: '15px', fontWeight: '600', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                      >
                        {c.firstName} {c.lastName}
                      </button>
                    </div>
                  </td>

                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ color: '#374151', fontSize: '14px', fontWeight: '500' }}>{c.email}</div>
                    <div style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px' }}>{c.phone}</div>
                  </td>

                  <td style={{ padding: '16px 20px' }}>
                    {c.companyName ? (
                      <span style={{ display: 'inline-block', backgroundColor: '#f3f4f6', color: '#4b5563', padding: '4px 12px', borderRadius: '9999px', fontSize: '13px', fontWeight: '500', border: '1px solid #e5e7eb' }}>
                        {c.companyName}
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '14px' }}>—</span>
                    )}
                  </td>

                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <button onClick={() => handleEdit(c)} style={{ color: '#2563eb', border: 'none', background: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', padding: '0 10px' }}>Edit</button>
                    <button onClick={() => handleDelete(c.id)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', padding: '0 0 0 10px' }}>Delete</button>
                  </td>

                </tr>
              );
            })}
            
            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '50px 20px', color: '#6b7280' }}>
                  {searchTerm ? `No clients found matching "${searchTerm}".` : 'No clients found. Click "+ Add New Client" to get started.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomersTab;