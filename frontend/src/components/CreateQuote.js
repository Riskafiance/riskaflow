import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { auth } from '../firebase'; // Assuming your firebase config is one level up

function CreateQuote({ customers, onCancel, onSuccess, quoteToEdit }) {
  const [isSaving, setIsSaving] = useState(false);

  // --- FORM STATE ---
  const [customerId, setCustomerId] = useState('');
  const [quoteNumber, setQuoteNumber] = useState('');
  
  // Default to 30 days from today
  const defaultValidDate = new Date();
  defaultValidDate.setDate(defaultValidDate.getDate() + 30);
  const [validUntil, setValidUntil] = useState(defaultValidDate.toISOString().split('T')[0]);
  
  const [items, setItems] = useState([{ description: '', quantity: 1, price: 0 }]);
  const [taxPercent, setTaxPercent] = useState(0);
  const [customerNote, setCustomerNote] = useState('');

  // --- POPULATE FOR EDIT MODE ---
  useEffect(() => {
    if (quoteToEdit) {
      setCustomerId(quoteToEdit.customerId);
      setQuoteNumber(quoteToEdit.quoteNumber);
      setValidUntil(new Date(quoteToEdit.validUntil).toISOString().split('T')[0]);
      setCustomerNote(quoteToEdit.customerNote || '');
      
      try {
        const parsedItems = JSON.parse(quoteToEdit.items);
        setItems(parsedItems.length > 0 ? parsedItems : [{ description: '', quantity: 1, price: 0 }]);
      } catch (e) {
        setItems([{ description: '', quantity: 1, price: 0 }]);
      }

      // Reverse engineer the tax percentage for the UI
      if (quoteToEdit.subTotal > 0) {
        setTaxPercent((quoteToEdit.taxTotal / quoteToEdit.subTotal) * 100);
      }
    }
  }, [quoteToEdit]);

  // --- CALCULATIONS ---
  const subTotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0), 0);
  const taxTotal = subTotal * (parseFloat(taxPercent) || 0) / 100;
  const totalAmount = subTotal + taxTotal;

  // --- ITEM HANDLERS ---
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, price: 0 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) return; // Keep at least one row
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  // --- SAVE LOGIC ---
  const handleSave = async () => {
    if (!customerId) {
      alert("Please select a client before saving.");
      return;
    }

    // Filter out completely empty rows
    const cleanItems = items.filter(item => item.description.trim() !== '' || item.price > 0);
    if (cleanItems.length === 0) {
      alert("Please add at least one item or service to the quote.");
      return;
    }

    setIsSaving(true);

    const payload = {
      customerId,
      quoteNumber: quoteNumber.trim() === '' ? null : quoteNumber, // Backend will auto-generate if null
      validUntil,
      subTotal,
      taxTotal,
      totalAmount,
      items: JSON.stringify(cleanItems),
      customerNote,
      userEmail: auth.currentUser?.email
    };

    try {
      if (quoteToEdit) {
        // We haven't built the PUT route for quotes yet, so this edits by deleting and recreating, 
        // or you can add a PUT route later. For now, we save as a new quote.
        alert("Editing functionality saves as a new version. The old quote will remain.");
      } 
      
      await axios.post('https://riskaflow.onrender.com/api/quotes', payload);
      onSuccess(); // Redirects back to the Quotes Tab
      
    } catch (error) {
      console.error("Save Error:", error);
      alert("Failed to save quote. Please try again.");
      setIsSaving(false);
    }
  };

  // --- STYLING HELPERS ---
  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', color: '#0f172a', outline: 'none', boxSizing: 'border-box', backgroundColor: '#f8fafc' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-in-out', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '28px', fontWeight: '800', letterSpacing: '-0.02em' }}>
            {quoteToEdit ? 'Edit Quote' : 'Create New Quote'}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={onCancel} 
            style={{ padding: '10px 20px', backgroundColor: 'transparent', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={(e) => { e.target.style.backgroundColor = '#f1f5f9'; e.target.style.color = '#0f172a'; }}
            onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#475569'; }}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            style={{ padding: '10px 24px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: isSaving ? 'wait' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(139, 92, 246, 0.2)' }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#7c3aed'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#8b5cf6'}
          >
            {isSaving ? 'Saving...' : 'Save Quote'}
          </button>
        </div>
      </div>

      {/* TOP SECTION: Client & Details */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        <div>
          <label style={labelStyle}>Bill To Client *</label>
          <select 
            value={customerId} 
            onChange={(e) => setCustomerId(e.target.value)}
            style={inputStyle}
          >
            <option value="">-- Select a Client --</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName} {c.companyName ? `(${c.companyName})` : ''}
              </option>
            ))}
          </select>
          {customers.length === 0 && <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#ef4444' }}>Please add a client in the Clients tab first.</p>}
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Quote #</label>
            <input 
              type="text" 
              value={quoteNumber} 
              onChange={(e) => setQuoteNumber(e.target.value)} 
              placeholder="Auto-generated" 
              style={inputStyle} 
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Valid Until</label>
            <input 
              type="date" 
              value={validUntil} 
              onChange={(e) => setValidUntil(e.target.value)} 
              style={inputStyle} 
            />
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION: Line Items */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <label style={{ ...labelStyle, marginBottom: '16px' }}>Line Items</label>
        
        {/* Table Headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 40px', gap: '12px', marginBottom: '8px', padding: '0 8px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>DESCRIPTION</div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>QTY</div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>PRICE ($)</div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textAlign: 'right' }}>AMOUNT</div>
          <div></div>
        </div>

        {/* Dynamic Rows */}
        {items.map((item, index) => (
          <div key={index} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 40px', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="Item or service description" 
              value={item.description} 
              onChange={(e) => handleItemChange(index, 'description', e.target.value)} 
              style={{ ...inputStyle, backgroundColor: 'white' }} 
            />
            <input 
              type="number" 
              min="1" 
              value={item.quantity} 
              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} 
              style={{ ...inputStyle, backgroundColor: 'white' }} 
            />
            <input 
              type="number" 
              step="0.01" 
              min="0" 
              value={item.price} 
              onChange={(e) => handleItemChange(index, 'price', e.target.value)} 
              style={{ ...inputStyle, backgroundColor: 'white' }} 
            />
            <div style={{ textAlign: 'right', fontWeight: '600', color: '#0f172a', fontSize: '15px' }}>
              ${((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)).toFixed(2)}
            </div>
            <button 
              onClick={() => handleRemoveItem(index)}
              style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '18px', cursor: 'pointer', padding: '4px' }}
              title="Remove Item"
            >
              ×
            </button>
          </div>
        ))}

        <button 
          onClick={handleAddItem} 
          style={{ marginTop: '12px', padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#8b5cf6', border: '1px dashed #c4b5fd', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' }}
          onMouseOver={(e) => { e.target.style.backgroundColor = '#ede9fe'; e.target.style.borderColor = '#8b5cf6'; }}
          onMouseOut={(e) => { e.target.style.backgroundColor = '#f1f5f9'; e.target.style.borderColor = '#c4b5fd'; }}
        >
          + Add Line Item
        </button>
      </div>

      {/* BOTTOM SECTION: Notes & Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Notes */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <label style={labelStyle}>Message to Client</label>
          <textarea 
            value={customerNote} 
            onChange={(e) => setCustomerNote(e.target.value)}
            placeholder="Thank you for your business! This quote is valid for 30 days."
            style={{ ...inputStyle, height: '120px', resize: 'vertical' }}
          />
        </div>

        {/* Totals */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: '600', fontSize: '15px' }}>Subtotal</span>
            <span style={{ color: '#0f172a', fontWeight: '700', fontSize: '15px' }}>${subTotal.toFixed(2)}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: '600', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Tax Rate (%)
              <input 
                type="number" 
                step="0.1" 
                min="0" 
                value={taxPercent} 
                onChange={(e) => setTaxPercent(e.target.value)} 
                style={{ width: '60px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} 
              />
            </span>
            <span style={{ color: '#0f172a', fontWeight: '700', fontSize: '15px' }}>${taxTotal.toFixed(2)}</span>
          </div>

          <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '8px 0' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#0f172a', fontWeight: '800', fontSize: '18px' }}>Total Amount</span>
            <span style={{ color: '#8b5cf6', fontWeight: '900', fontSize: '24px' }}>${totalAmount.toFixed(2)}</span>
          </div>

        </div>
      </div>

    </div>
  );
}

export default CreateQuote;