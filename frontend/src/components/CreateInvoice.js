import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { auth } from '../firebase'; 

const CreateInvoice = ({ customers, accounts = [], onCancel, onSuccess, invoiceToEdit }) => {
  const incomeAccounts = accounts.filter(acc => acc.type === 'Income');
  const defaultCategory = incomeAccounts.length > 0 ? incomeAccounts[0].name : '';

  const [formData, setFormData] = useState({
    customerId: '',
    status: 'unpaid',
    dueDate: '',
    description: '',
    category: defaultCategory,
    price: '',
    customerNote: '' // 🔥 Added customer note to state
  });

  const [applyTax, setApplyTax] = useState(false);
  const [applyCcFee, setApplyCcFee] = useState(false);

  useEffect(() => {
    if (invoiceToEdit) {
      let parsedItems = [];
      try {
        parsedItems = typeof invoiceToEdit.items === 'string' ? JSON.parse(invoiceToEdit.items) : invoiceToEdit.items;
      } catch (e) {}
      
      const mainItem = parsedItems && parsedItems.length > 0 ? parsedItems[0] : {};
      
      setApplyTax(invoiceToEdit.taxTotal > 0);
      setApplyCcFee(parsedItems.some(item => item.category === 'Credit Card Fee'));

      setFormData({
        customerId: invoiceToEdit.customerId || '',
        status: invoiceToEdit.status || 'unpaid',
        dueDate: invoiceToEdit.dueDate ? invoiceToEdit.dueDate.split('T')[0] : '',
        description: mainItem.description || '',
        category: mainItem.category || defaultCategory,
        price: mainItem.price || '',
        customerNote: invoiceToEdit.customerNote || '' // 🔥 Loads existing note if editing
      });
    }
  }, [invoiceToEdit, defaultCategory]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const priceNum = parseFloat(formData.price) || 0;
  const subTotal = priceNum;
  
  const taxTotal = applyTax ? priceNum * 0.10 : 0; 
  const ccFeeTotal = applyCcFee ? priceNum * 0.03 : 0;
  
  const grandTotal = subTotal + taxTotal + ccFeeTotal;

  const handleSubmit = (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to save invoices.");
      return;
    }

    // 🔥 FIXED: If editing, keep old number. If new, leave blank so Backend auto-increments!
    const invNumber = invoiceToEdit ? invoiceToEdit.invoiceNumber : "";

    const invoiceItems = [{
      description: formData.description,
      category: formData.category, 
      quantity: 1,
      price: priceNum
    }];

    if (applyCcFee) {
      invoiceItems.push({
        description: 'Credit Card Processing Fee (3%)',
        category: 'Credit Card Fee', 
        quantity: 1,
        price: ccFeeTotal
      });
    }

    const payload = {
      invoiceNumber: invNumber,
      customerId: formData.customerId,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : new Date().toISOString(),
      status: formData.status,
      subTotal: subTotal,
      taxTotal: taxTotal,
      totalAmount: grandTotal,
      items: invoiceItems,
      customerNote: formData.customerNote, // 🔥 Attaches the note to the payload!
      userEmail: user.email,
      userUid: user.uid
    };

    const url = invoiceToEdit ? `http://localhost:5000/api/invoices/${invoiceToEdit.id}` : 'http://localhost:5000/api/invoices';
    const method = invoiceToEdit ? 'put' : 'post';

    axios[method](url, payload)
      .then(() => onSuccess())
      .catch(err => {
        console.error("Error saving invoice:", err);
        const errorMessage = err.response?.data?.error || err.message;
        alert(`Failed to save invoice! \n\nReason: ${errorMessage}\n\nPlease check your backend CMD terminal for more details.`);
      });
  };

  const inputStyle = { padding: '12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%', boxSizing: 'border-box', fontSize: '14px', outlineColor: '#2563eb' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '700', color: '#111827' };

  return (
    <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
      
      <h2 style={{ color: '#1e3a8a', fontSize: '24px', margin: '0 0 30px 0', fontWeight: '800' }}>
        {invoiceToEdit ? 'Edit Invoice' : 'Create New Invoice'}
      </h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Select Client:</label>
            <select required name="customerId" value={formData.customerId} onChange={handleChange} style={inputStyle}>
              <option value="" disabled>-- Choose a Client --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName} {c.companyName ? `(${c.companyName})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status:</label>
            <select required name="status" value={formData.status} onChange={handleChange} style={inputStyle}>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Due Date:</label>
            <input type="date" required name="dueDate" value={formData.dueDate} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Category (Income Account):</label>
            {incomeAccounts.length === 0 ? (
              <div style={{ color: '#dc2626', fontSize: '13px', padding: '12px', backgroundColor: '#fee2e2', borderRadius: '6px', border: '1px solid #fca5a5' }}>
                No Income accounts found! Add one in your Chart of Accounts first.
              </div>
            ) : (
              <select required name="category" value={formData.category} onChange={handleChange} style={inputStyle}>
                {incomeAccounts.map(acc => (
                  <option key={acc.id} value={acc.name}>{acc.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Service Description:</label>
          <input type="text" required name="description" value={formData.description} onChange={handleChange} style={inputStyle} placeholder="e.g. Tax Preparation" />
        </div>

        <div>
          <label style={labelStyle}>Price ($):</label>
          <input type="number" step="0.01" min="0" required name="price" value={formData.price} onChange={handleChange} style={inputStyle} placeholder="0.00" />
        </div>

        {/* 🔥 NEW: Customer Note Text Area */}
        <div>
          <label style={labelStyle}>Note to Customer (Optional):</label>
          <textarea 
            name="customerNote" 
            value={formData.customerNote} 
            onChange={handleChange} 
            style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }} 
            placeholder="Thank you for your business! Or add wiring instructions here..." 
          />
        </div>

        <div style={{ backgroundColor: '#f9fafb', padding: '24px', borderRadius: '8px', border: '1px solid #e5e7eb', marginTop: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '15px', color: '#111827' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>Subtotal:</strong> 
              <span>${subTotal.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={applyTax} 
                  onChange={(e) => setApplyTax(e.target.checked)} 
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                />
                <strong>Apply Tax (10%)</strong>
              </label>
              <span>${taxTotal.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={applyCcFee} 
                  onChange={(e) => setApplyCcFee(e.target.checked)} 
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                />
                <strong>Apply Credit Card Fee (3%)</strong>
              </label>
              <span>${ccFeeTotal.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1e3a8a', fontSize: '20px', marginTop: '10px', paddingTop: '15px', borderTop: '1px solid #d1d5db' }}>
              <strong>Grand Total:</strong>
              <strong>${grandTotal.toFixed(2)}</strong>
            </div>

          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
          <button type="submit" disabled={incomeAccounts.length === 0} style={{ backgroundColor: incomeAccounts.length === 0 ? '#9ca3af' : '#10b981', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '6px', cursor: incomeAccounts.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
            Save Invoice
          </button>
          <button type="button" onClick={onCancel} style={{ backgroundColor: '#e5e7eb', color: '#374151', padding: '12px 24px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
            Cancel
          </button>
        </div>

      </form>
    </div>
  );
};

export default CreateInvoice;