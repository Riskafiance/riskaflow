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
    customerNote: '' 
  });

  // 🔥 NEW: Dynamic Line Items State
  const [lineItems, setLineItems] = useState([
    { category: defaultCategory, description: '', quantity: 1, price: '' }
  ]);

  const [applyTax, setApplyTax] = useState(false);
  const [applyCcFee, setApplyCcFee] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (invoiceToEdit) {
      let parsedItems = [];
      try {
        parsedItems = typeof invoiceToEdit.items === 'string' ? JSON.parse(invoiceToEdit.items) : invoiceToEdit.items;
      } catch (e) {}
      
      setApplyTax(invoiceToEdit.taxTotal > 0);
      setApplyCcFee(parsedItems.some(item => item.category === 'Credit Card Fee'));

      // Filter out the CC fee from the main line items so it doesn't show in the table (since it's a checkbox)
      const baseItems = parsedItems.filter(item => item.category !== 'Credit Card Fee');

      setLineItems(baseItems.length > 0 ? baseItems : [{ category: defaultCategory, description: '', quantity: 1, price: '' }]);

      setFormData({
        customerId: invoiceToEdit.customerId || '',
        status: invoiceToEdit.status || 'unpaid',
        dueDate: invoiceToEdit.dueDate ? invoiceToEdit.dueDate.split('T')[0] : '',
        customerNote: invoiceToEdit.customerNote || '' 
      });
    }
  }, [invoiceToEdit, defaultCategory]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 🔥 NEW: Handlers for Dynamic Line Items
  const handleItemChange = (index, field, value) => {
    const newItems = [...lineItems];
    newItems[index][field] = value;
    setLineItems(newItems);
  };

  const handleAddItem = () => {
    setLineItems([...lineItems, { category: defaultCategory, description: '', quantity: 1, price: '' }]);
  };

  const handleRemoveItem = (index) => {
    if (lineItems.length === 1) return; // Keep at least one row
    const newItems = lineItems.filter((_, i) => i !== index);
    setLineItems(newItems);
  };

  const handleClearAllLines = () => {
    setLineItems([{ category: defaultCategory, description: '', quantity: 1, price: '' }]);
  };

  // 🔥 UPDATED: Calculations based on the dynamic array
  const subTotal = lineItems.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 1) * (parseFloat(item.price) || 0)), 0);
  
  const taxTotal = applyTax ? subTotal * 0.10 : 0; 
  const ccFeeTotal = applyCcFee ? subTotal * 0.03 : 0;
  
  const grandTotal = subTotal + taxTotal + ccFeeTotal;

  const handleSubmit = (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to save invoices.");
      return;
    }

    const invNumber = invoiceToEdit ? invoiceToEdit.invoiceNumber : "";

    // Map the UI line items to the format the backend expects
    const invoiceItems = lineItems.map(item => ({
      category: item.category,
      description: item.description,
      quantity: parseFloat(item.quantity) || 1,
      price: parseFloat(item.price) || 0
    }));

    if (applyCcFee) {
      invoiceItems.push({
        category: 'Credit Card Fee', 
        description: 'Credit Card Processing Fee (3%)',
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
      customerNote: formData.customerNote, 
      userEmail: user.email,
      userUid: user.uid
    };

    const url = invoiceToEdit ? `https://riskaflow.onrender.com/api/invoices/${invoiceToEdit.id}` : 'https://riskaflow.onrender.com/api/invoices';
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
  const tableHeaderStyle = { padding: '12px 10px', color: '#4b5563', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' };
  const mobileFieldLabelStyle = { display: 'block', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' };

  return (
    <div style={{ backgroundColor: 'white', padding: isMobile ? '20px' : '40px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
      
      <h2 style={{ color: '#1e3a8a', fontSize: isMobile ? '20px' : '24px', margin: '0 0 30px 0', fontWeight: '800' }}>
        {invoiceToEdit ? 'Edit Invoice' : 'Create New Invoice'}
      </h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Due Date:</label>
            <input type="date" required name="dueDate" value={formData.dueDate} onChange={handleChange} style={inputStyle} />
          </div>
        </div>

        {/* 🔥 NEW: Dynamic Line Items Table */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          {isMobile ? (
            // MOBILE: stacked card layout instead of a wide table
            <div>
              {lineItems.map((item, index) => (
                <div key={index} style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ color: '#6b7280', fontSize: '13px', fontWeight: '700' }}>Line {index + 1}</span>
                    <button type="button" onClick={() => handleRemoveItem(index)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '20px', cursor: 'pointer', padding: '0 5px', lineHeight: 1 }} title="Remove Line">
                      ×
                    </button>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={mobileFieldLabelStyle}>Category</label>
                    {incomeAccounts.length === 0 ? (
                      <div style={{ color: '#dc2626', fontSize: '12px' }}>No Income accounts found!</div>
                    ) : (
                      <select required value={item.category} onChange={(e) => handleItemChange(index, 'category', e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '4px', outlineColor: '#2563eb', fontSize: '14px', boxSizing: 'border-box' }}>
                        {incomeAccounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                      </select>
                    )}
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={mobileFieldLabelStyle}>Product or Service Description</label>
                    <input type="text" required placeholder="e.g. Tax Preparation" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box', outlineColor: '#2563eb', fontSize: '14px' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={mobileFieldLabelStyle}>Qty</label>
                      <input type="number" min="1" step="1" required value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box', outlineColor: '#2563eb', fontSize: '14px' }} />
                    </div>
                    <div>
                      <label style={mobileFieldLabelStyle}>Rate ($)</label>
                      <input type="number" min="0" step="0.01" required placeholder="0.00" value={item.price} onChange={(e) => handleItemChange(index, 'price', e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box', outlineColor: '#2563eb', fontSize: '14px' }} />
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontWeight: '700', color: '#111827', fontSize: '15px' }}>
                    ${((parseFloat(item.quantity) || 1) * (parseFloat(item.price) || 0)).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  <th style={tableHeaderStyle}>#</th>
                  <th style={{...tableHeaderStyle, width: '25%'}}>Category</th>
                  <th style={{...tableHeaderStyle, width: '40%'}}>Product or Service Description</th>
                  <th style={{...tableHeaderStyle, width: '10%'}}>Qty</th>
                  <th style={{...tableHeaderStyle, width: '15%'}}>Rate ($)</th>
                  <th style={{...tableHeaderStyle, width: '10%', textAlign: 'right'}}>Amount</th>
                  <th style={{...tableHeaderStyle, width: '40px', textAlign: 'center'}}></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px 10px', color: '#6b7280', fontSize: '14px', fontWeight: '600' }}>{index + 1}</td>
                    
                    <td style={{ padding: '12px 10px' }}>
                      {incomeAccounts.length === 0 ? (
                        <div style={{ color: '#dc2626', fontSize: '11px' }}>No Income accounts found!</div>
                      ) : (
                        <select required value={item.category} onChange={(e) => handleItemChange(index, 'category', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', outlineColor: '#2563eb', fontSize: '13px' }}>
                          {incomeAccounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                        </select>
                      )}
                    </td>
                    
                    <td style={{ padding: '12px 10px' }}>
                      <input type="text" required placeholder="e.g. Tax Preparation" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box', outlineColor: '#2563eb', fontSize: '13px' }} />
                    </td>
                    
                    <td style={{ padding: '12px 10px' }}>
                      <input type="number" min="1" step="1" required value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box', outlineColor: '#2563eb', fontSize: '13px' }} />
                    </td>
                    
                    <td style={{ padding: '12px 10px' }}>
                      <input type="number" min="0" step="0.01" required placeholder="0.00" value={item.price} onChange={(e) => handleItemChange(index, 'price', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box', outlineColor: '#2563eb', fontSize: '13px' }} />
                    </td>

                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '700', color: '#111827', fontSize: '14px' }}>
                      ${((parseFloat(item.quantity) || 1) * (parseFloat(item.price) || 0)).toFixed(2)}
                    </td>

                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                      <button type="button" onClick={() => handleRemoveItem(index)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '18px', cursor: 'pointer', padding: '0 5px' }} title="Remove Line">
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ padding: '12px', backgroundColor: '#f9fafb', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px' }}>
            <button type="button" onClick={handleAddItem} style={{ padding: '8px 16px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
              + Add Product/Service
            </button>
            <button type="button" onClick={handleClearAllLines} style={{ padding: '8px 16px', backgroundColor: 'transparent', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
              Clear All Lines
            </button>
          </div>
        </div>

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

        <div style={{ backgroundColor: '#f9fafb', padding: isMobile ? '16px' : '24px', borderRadius: '8px', border: '1px solid #e5e7eb', marginTop: '10px' }}>
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

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '15px', marginTop: '10px' }}>
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