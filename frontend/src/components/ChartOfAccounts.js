import React, { useState } from 'react';
import axios from 'axios';
import { auth } from '../firebase'; // 🔥 NEW: Import Firebase auth

const ChartOfAccounts = ({ accounts, refreshData }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: 'Expense', detailType: '', balance: 0 });
  
  const [viewingAccount, setViewingAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleEdit = (account) => {
    setEditingId(account.id);
    setFormData(account);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this account?")) {
      axios.delete(`https://riskaflow.onrender.com/api/accounts/${id}`)
        .then(() => refreshData())
        .catch(err => alert("Error deleting account."));
    }
  };

  // 🔥 UPDATED: Attach the logged-in user's email to the payload
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to save accounts.");
      return;
    }

    const url = editingId ? `https://riskaflow.onrender.com/api/accounts/${editingId}` : 'https://riskaflow.onrender.com/api/accounts';
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
        setFormData({ name: '', type: 'Expense', detailType: '', balance: 0 });
        refreshData();
      })
      .catch(err => alert("Failed to save! Error: " + err.message));
  };

  const openLedger = (account) => {
    setViewingAccount(account);
    axios.get(`https://riskaflow.onrender.com/api/accounts/${account.id}/transactions`)
      .then(res => setTransactions(res.data))
      .catch(err => console.error("Error fetching transactions:", err));
  };

  const inputStyle = { padding: '12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%', boxSizing: 'border-box', fontSize: '14px', outlineColor: '#2563eb' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#4b5563' };

  const getTypeColor = (type) => {
    switch(type) {
      case 'Income': return { bg: '#d1fae5', text: '#065f46' }; 
      case 'Expense': return { bg: '#fee2e2', text: '#991b1b' }; 
      case 'Asset': return { bg: '#dbeafe', text: '#1e40af' };   
      case 'Liability': return { bg: '#fef3c7', text: '#92400e' }; 
      case 'Equity': return { bg: '#f3e8ff', text: '#6b21a8' };  
      default: return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  // --- VIEW 1: FORM ---
  if (showForm) {
    return (
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' }}>
        <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '20px', marginBottom: '30px' }}>
          <h2 style={{ color: '#111827', margin: 0, fontSize: '24px' }}>{editingId ? 'Edit Account' : 'Add New Account'}</h2>
          <p style={{ color: '#6b7280', margin: '5px 0 0 0', fontSize: '14px' }}>Create a new category to track your finances.</p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={labelStyle}>Account Name *</label>
              <input type="text" required name="name" value={formData.name} onChange={handleChange} style={inputStyle} placeholder="e.g. Travel Expenses" />
            </div>
            <div>
              <label style={labelStyle}>Account Type *</label>
              <select required name="type" value={formData.type} onChange={handleChange} style={inputStyle}>
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
                <option value="Asset">Asset</option>
                <option value="Liability">Liability</option>
                <option value="Equity">Equity</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Detail Type</label>
            <input type="text" name="detailType" value={formData.detailType} onChange={handleChange} style={inputStyle} placeholder="e.g. Meals & Entertainment" />
          </div>
          <div style={{ display: 'flex', gap: '15px', marginTop: '10px', borderTop: '1px solid #e5e7eb', paddingTop: '25px' }}>
            <button type="submit" style={{ backgroundColor: '#10b981', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
              {editingId ? 'Save Changes' : 'Save Account'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setFormData({ name: '', type: 'Expense', detailType: '', balance: 0 }); }} style={{ backgroundColor: '#f3f4f6', color: '#374151', padding: '12px 24px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- VIEW 2: THE LEDGER ---
  if (viewingAccount) {
    return (
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', padding: '30px' }}>
        <button onClick={() => setViewingAccount(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '14px', fontWeight: '600', padding: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
          ← Back to Chart of Accounts
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <div>
            <h2 style={{ margin: 0, color: '#111827', fontSize: '24px', fontWeight: 'bold' }}>{viewingAccount.name} Register</h2>
            <p style={{ margin: '5px 0 0 0', color: '#6b7280', fontSize: '14px' }}>Transaction history for this account.</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#6b7280', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Balance</div>
            <div style={{ color: '#111827', fontSize: '28px', fontWeight: '800' }}>${parseFloat(viewingAccount.balance).toFixed(2)}</div>
          </div>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', color: '#4b5563', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '16px 20px', fontWeight: '600' }}>Date</th>
                <th style={{ padding: '16px 20px', fontWeight: '600' }}>Description</th>
                <th style={{ padding: '16px 20px', fontWeight: '600', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>No transactions recorded in this account yet.</td>
                </tr>
              ) : (
                transactions.map(txn => (
                  <tr key={txn.id} style={{ borderBottom: '1px solid #e5e7eb', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '16px 20px', color: '#374151', fontSize: '14px' }}>{new Date(txn.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '16px 20px', color: '#111827', fontWeight: '600', fontSize: '14px' }}>{txn.description}</td>
                    <td style={{ padding: '16px 20px', textAlign: 'right', color: txn.amount >= 0 ? '#059669' : '#111827', fontWeight: '700', fontSize: '14px' }}>
                      {txn.amount >= 0 ? '+' : ''}${parseFloat(txn.amount).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- VIEW 3: MAIN COA TABLE ---
  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', padding: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#111827', fontSize: '24px', fontWeight: 'bold' }}>Chart of Accounts</h2>
          <p style={{ margin: '5px 0 0 0', color: '#6b7280', fontSize: '14px' }}>Manage the categories used to classify your transactions.</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormData({ name: '', type: 'Expense', detailType: '', balance: 0 }); setShowForm(true); }} style={{ backgroundColor: '#10b981', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
          + New Account
        </button>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', color: '#4b5563', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '16px 20px', fontWeight: '600' }}>Account Name</th>
              <th style={{ padding: '16px 20px', fontWeight: '600' }}>Type</th>
              <th style={{ padding: '16px 20px', fontWeight: '600' }}>Detail Type</th>
              <th style={{ padding: '16px 20px', fontWeight: '600', textAlign: 'right' }}>Balance</th>
              <th style={{ padding: '16px 20px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  No accounts found. Click "+ New Account" to add your first one!
                </td>
              </tr>
            ) : (
              accounts.map(acc => {
                const typeColors = getTypeColor(acc.type);
                return (
                  <tr key={acc.id} style={{ borderBottom: '1px solid #e5e7eb', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    
                    <td style={{ padding: '16px 20px', fontWeight: '600', fontSize: '14px' }}>
                      <button onClick={() => openLedger(acc)} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: '700', padding: 0, fontSize: '14px', textAlign: 'left' }}>
                        {acc.name}
                      </button>
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ backgroundColor: typeColors.bg, color: typeColors.text, padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {acc.type}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', color: '#6b7280', fontSize: '13px' }}>{acc.detailType || '—'}</td>
                    <td style={{ padding: '16px 20px', textAlign: 'right', color: '#374151', fontWeight: '600', fontSize: '14px' }}>${parseFloat(acc.balance).toFixed(2)}</td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button onClick={() => handleEdit(acc)} style={{ color: '#2563eb', border: 'none', background: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', padding: '0 10px' }}>Edit</button>
                      <button onClick={() => handleDelete(acc.id)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', padding: '0 0 0 10px' }}>Delete</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ChartOfAccounts;