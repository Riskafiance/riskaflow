import React, { useState } from 'react';
import axios from 'axios';

const InvoicesTab = ({ invoices, accounts = [], onCreateNew, onEdit, onDelete, refreshData }) => {
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  
  const assetAccounts = accounts.filter(acc => acc.type === 'Asset').map(acc => acc.name);
  const defaultAccount = assetAccounts.length > 0 ? assetAccounts[0] : '';
  
  // 🔥 UPDATED: Added a "step" property to track if they are selecting a method or making a deposit
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, invoice: null, account: defaultAccount, step: 'select_method' });
  
  const [emailingInvoiceId, setEmailingInvoiceId] = useState(null);
  const [checkoutLoadingId, setCheckoutLoadingId] = useState(null);

  const today = new Date();

  const filteredInvoices = invoices.filter(inv => {
    let matchesStatus = true;
    const isOverdue = new Date(inv.dueDate) < today && inv.status !== 'paid';
    const computedStatus = inv.status === 'paid' ? 'paid' : (isOverdue ? 'overdue' : 'unpaid');

    if (statusFilter === 'paid') matchesStatus = computedStatus === 'paid';
    if (statusFilter === 'unpaid') matchesStatus = computedStatus === 'unpaid';
    if (statusFilter === 'overdue') matchesStatus = computedStatus === 'overdue';

    let matchesDate = true;
    const invoiceDate = new Date(inv.createdAt);
    const daysDiff = (today - invoiceDate) / (1000 * 60 * 60 * 24);

    if (dateFilter === '30') matchesDate = daysDiff <= 30;
    if (dateFilter === '90') matchesDate = daysDiff <= 90;
    if (dateFilter === '365') matchesDate = daysDiff <= 365;

    return matchesStatus && matchesDate;
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedInvoices(filteredInvoices.map(inv => inv.id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleSelectOne = (e, id) => {
    if (e.target.checked) {
      setSelectedInvoices([...selectedInvoices, id]);
    } else {
      setSelectedInvoices(selectedInvoices.filter(invId => invId !== id));
    }
  };

  const handleBatchAction = (e) => {
    const action = e.target.value;
    if (action === 'delete') {
      if (selectedInvoices.length === 0) {
        alert("Please select at least one invoice using the checkboxes.");
      } else {
        alert(`You have selected ${selectedInvoices.length} invoices.`);
      }
    }
    e.target.value = "";
  };

  const closePaymentModal = () => {
    setPaymentModal({ isOpen: false, invoice: null, account: defaultAccount, step: 'select_method' });
  };

  // Trigger In-Person Stripe Checkout
  const handleInPersonCheckout = (inv) => {
    setCheckoutLoadingId(inv.id);
    closePaymentModal(); // Closes the modal before opening the new tab
    
    axios.post(`http://localhost:5000/api/invoices/${inv.id}/checkout-link`)
      .then((res) => {
        window.open(res.data.url, '_blank');
      })
      .catch((err) => {
        console.error("Checkout Error:", err);
        alert("Failed to load checkout link. Please ensure your Stripe keys are correct in the backend.");
      })
      .finally(() => {
        setCheckoutLoadingId(null);
      });
  };

  const submitPayment = () => {
    const inv = paymentModal.invoice;
    const selectedAccountName = paymentModal.account;
    const targetAccount = accounts.find(acc => acc.name === selectedAccountName);
    
    if (!targetAccount) {
      alert("Error: Could not find the selected bank account.");
      return;
    }

    let parsedItems = [];
    if (inv.items) {
      try {
        parsedItems = typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items;
      } catch (error) {
        console.error("Failed to parse items:", error);
      }
    }

    const invoicePayload = {
      customerId: inv.customerId,
      dueDate: inv.dueDate,
      status: 'paid', 
      subTotal: inv.subTotal,
      taxTotal: inv.taxTotal,
      totalAmount: inv.totalAmount,
      items: parsedItems 
    };

    const newBalance = parseFloat(targetAccount.balance) + parseFloat(inv.totalAmount);
    const accountPayload = {
      name: targetAccount.name,
      type: targetAccount.type,
      detailType: targetAccount.detailType,
      balance: newBalance
    };

    const customerName = inv.customer ? `${inv.customer.firstName} ${inv.customer.lastName}` : 'Customer';
    
    Promise.all([
      axios.put(`http://localhost:5000/api/invoices/${inv.id}`, invoicePayload),
      axios.put(`http://localhost:5000/api/accounts/${targetAccount.id}`, accountPayload),
      axios.post(`http://localhost:5000/api/accounts/${targetAccount.id}/transactions`, {
        description: `Payment received for Invoice #${inv.invoiceNumber} (${customerName})`,
        amount: inv.totalAmount
      })
    ])
      .then(() => {
        closePaymentModal();
        if (refreshData) refreshData(); 
      })
      .catch(err => {
        console.error("Payment Error:", err);
        alert("Failed to record payment. Check console for details.");
      });
  };

  const markAsUnpaid = (inv) => {
    if (window.confirm(`Are you sure you want to mark Invoice ${inv.invoiceNumber} as unpaid? \n\nThis will automatically reverse the deposit in your Chart of Accounts.`)) {
      axios.put(`http://localhost:5000/api/invoices/${inv.id}`, { status: 'unpaid' })
        .then(() => {
          if (refreshData) refreshData();
        })
        .catch(err => {
          console.error("Reversal Error:", err);
          alert("Failed to reverse payment.");
        });
    }
  };

  const handleSendEmail = (inv) => {
    if (!inv.customer || !inv.customer.email) {
      alert("This customer does not have an email address saved in their profile!");
      return;
    }
    
    setEmailingInvoiceId(inv.id);
    
    axios.post(`http://localhost:5000/api/invoices/${inv.id}/send-email`)
      .then(() => {
        alert(`Invoice sent successfully to ${inv.customer.email}!`);
      })
      .catch(err => {
        const errorMsg = err.response?.data?.error || "Failed to send email.";
        alert(errorMsg + "\n\nCheck your backend CMD terminal for NodeMailer errors.");
      })
      .finally(() => {
        setEmailingInvoiceId(null);
      });
  };

  let unpaidTotal = 0;
  let overdueTotal = 0;
  let paidTotal = 0;

  invoices.forEach(inv => {
    if (inv.status === 'paid') {
      paidTotal += inv.totalAmount;
    } else {
      unpaidTotal += inv.totalAmount;
      const isOverdue = new Date(inv.dueDate) < today || inv.status === 'overdue';
      if (isOverdue) overdueTotal += inv.totalAmount;
    }
  });

  const notDueTotal = unpaidTotal - overdueTotal;
  const overduePercent = unpaidTotal > 0 ? (overdueTotal / unpaidTotal) * 100 : 0;

  // --- STYLING HELPERS ---
  const summaryBoxStyle = { flex: 1, backgroundColor: 'white', padding: '24px 30px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '15px', transition: 'transform 0.2s', cursor: 'default' };
  const labelStyle = { color: '#4b5563', fontSize: '15px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const amountStyle = { color: '#111827', fontSize: '28px', fontWeight: '900', letterSpacing: '-0.02em' };
  const subTextStyle = { color: '#6b7280', fontSize: '13px', fontWeight: '500' };
  const dropdownStyle = { padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', color: '#374151', fontSize: '14px', backgroundColor: 'white', cursor: 'pointer', fontWeight: '500', outline: 'none', transition: 'border-color 0.2s' };

  return (
    <div style={{ backgroundColor: 'transparent', position: 'relative', animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#111827', fontSize: '32px', fontWeight: '800', letterSpacing: '-0.02em' }}>Invoices</h2>
          <p style={{ margin: '5px 0 0 0', color: '#6b7280', fontSize: '15px' }}>Manage billings, track payments, and follow up on overdue balances.</p>
        </div>
        <button onClick={onCreateNew} style={{ backgroundColor: '#047857', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(4, 120, 87, 0.2)', transition: 'transform 0.1s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <span style={{ fontSize: '18px' }}>+</span> Create Invoice
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div style={{ display: 'flex', gap: '30px', marginBottom: '35px' }}>
        <div style={summaryBoxStyle} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={labelStyle}>Outstanding Balance</span>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>⏳</div>
          </div>
          <div>
            <div style={amountStyle}>${unpaidTotal.toFixed(2)}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '13px', fontWeight: '600' }}>
              <span style={{ color: '#dc2626' }}>${overdueTotal.toFixed(2)} Overdue</span>
              <span style={{ color: '#4b5563' }}>${notDueTotal.toFixed(2)} Not Due</span>
            </div>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
             <div style={{ width: `${overduePercent}%`, backgroundColor: '#ef4444', height: '100%', transition: 'width 0.5s ease' }}></div>
             <div style={{ width: `${100 - overduePercent}%`, backgroundColor: '#3b82f6', height: '100%', transition: 'width 0.5s ease' }}></div>
          </div>
        </div>

        <div style={summaryBoxStyle} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={labelStyle}>Collected Revenue</span>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>💵</div>
          </div>
          <div>
            <div style={amountStyle}>${paidTotal.toFixed(2)}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '13px', fontWeight: '600' }}>
              <span style={{ color: '#059669' }}>All time paid in full</span>
            </div>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '999px', overflow: 'hidden' }}>
             <div style={{ width: paidTotal > 0 ? '100%' : '0%', backgroundColor: '#10b981', height: '100%', transition: 'width 0.5s ease' }}></div>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', backgroundColor: 'white', padding: '15px 20px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <select defaultValue="" onChange={handleBatchAction} style={dropdownStyle}>
          <option value="" disabled>Batch actions</option>
          <option value="delete">Delete selected</option>
        </select>
        <div style={{ width: '1px', backgroundColor: '#e5e7eb', margin: '0 5px' }}></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={dropdownStyle}>
          <option value="All">All Statuses</option>
          <option value="unpaid">Unpaid (Not Due)</option>
          <option value="overdue">Overdue</option>
          <option value="paid">Paid</option>
        </select>
        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={dropdownStyle}>
          <option value="All">All Time</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 3 months</option>
          <option value="365">Last 12 months</option>
        </select>
      </div>

      {/* TABLE */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', overflowX: 'auto' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '16px 24px', width: '40px' }}><input type="checkbox" checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0} onChange={handleSelectAll} style={{ cursor: 'pointer', accentColor: '#047857', width: '16px', height: '16px' }}/></th>
              <th style={{ padding: '16px 10px', fontWeight: '700' }}>Date</th>
              <th style={{ padding: '16px 10px', fontWeight: '700' }}>Invoice No.</th>
              <th style={{ padding: '16px 10px', fontWeight: '700' }}>Customer</th>
              <th style={{ padding: '16px 10px', fontWeight: '700' }}>Amount</th>
              <th style={{ padding: '16px 10px', fontWeight: '700' }}>Status</th>
              <th style={{ padding: '16px 24px', textAlign: 'right', fontWeight: '700' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map(inv => {
              const isOverdue = new Date(inv.dueDate) < today && inv.status !== 'paid';
              const isSelected = selectedInvoices.includes(inv.id);
              
              return (
                <tr key={inv.id} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: isSelected ? '#ecfdf5' : 'transparent', transition: 'background-color 0.2s' }} onMouseOver={(e) => { if(!isSelected) e.currentTarget.style.backgroundColor = '#f9fafb' }} onMouseOut={(e) => { if(!isSelected) e.currentTarget.style.backgroundColor = 'transparent' }}>
                  <td style={{ padding: '16px 24px' }}><input type="checkbox" checked={isSelected} onChange={(e) => handleSelectOne(e, inv.id)} style={{ cursor: 'pointer', accentColor: '#047857', width: '16px', height: '16px' }}/></td>
                  <td style={{ padding: '16px 10px', color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>{new Date(inv.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '16px 10px', color: '#111827', fontSize: '14px', fontWeight: '700' }}>{inv.invoiceNumber}</td>
                  <td style={{ padding: '16px 10px' }}>
                    <div style={{ color: '#111827', fontSize: '14px', fontWeight: '600' }}>{inv.customer ? `${inv.customer.firstName} ${inv.customer.lastName}` : 'Unknown'}</div>
                    {inv.customer?.companyName && <div style={{ color: '#6b7280', fontSize: '12px' }}>{inv.customer.companyName}</div>}
                  </td>
                  <td style={{ padding: '16px 10px', color: '#111827', fontSize: '14px', fontWeight: '800' }}>${inv.totalAmount.toFixed(2)}</td>
                  
                  <td style={{ padding: '16px 10px' }}>
                    {inv.status === 'paid' ? (
                      <span style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669' }}></div> Paid
                      </span>
                    ) : isOverdue ? (
                      <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#dc2626' }}></div> Overdue
                      </span>
                    ) : (
                      <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#d97706' }}></div> Due Soon
                      </span>
                    )}
                  </td>

                  <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                    
                    {/* PRIMARY ACTION BUTTONS */}
                    {inv.status !== 'paid' ? (
                      <button 
                        onClick={() => setPaymentModal({ isOpen: true, invoice: inv, account: defaultAccount, step: 'select_method' })} 
                        disabled={checkoutLoadingId === inv.id}
                        style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '13px', fontWeight: '700', cursor: checkoutLoadingId === inv.id ? 'wait' : 'pointer', boxShadow: '0 1px 2px rgba(16, 185, 129, 0.2)' }}
                      >
                        {checkoutLoadingId === inv.id ? 'Loading...' : 'Receive Payment'}
                      </button>
                    ) : (
                      <button onClick={() => markAsUnpaid(inv)} style={{ backgroundColor: '#f3f4f6', color: '#4b5563', border: '1px solid #d1d5db', borderRadius: '6px', padding: '5px 13px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                        Mark Unpaid
                      </button>
                    )}

                    <div style={{ width: '1px', height: '16px', backgroundColor: '#e5e7eb' }}></div>

                    {/* SECONDARY TEXT LINKS */}
                    <button onClick={() => onEdit(inv)} style={{ color: '#2563eb', border: 'none', background: 'none', cursor: 'pointer', padding: '0', fontWeight: '600', fontSize: '13px' }} onMouseOver={(e) => e.target.style.textDecoration = 'underline'} onMouseOut={(e) => e.target.style.textDecoration = 'none'}>Edit</button>
                    
                    <button 
                      onClick={() => handleSendEmail(inv)} 
                      disabled={emailingInvoiceId === inv.id}
                      style={{ color: '#8b5cf6', border: 'none', background: 'none', cursor: emailingInvoiceId === inv.id ? 'wait' : 'pointer', padding: '0', fontWeight: '600', fontSize: '13px' }} 
                      onMouseOver={(e) => e.target.style.textDecoration = 'underline'} 
                      onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                    >
                      {emailingInvoiceId === inv.id ? 'Sending...' : 'Send Email'}
                    </button>

                    <a href={`http://localhost:5000/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer" style={{ color: '#4b5563', textDecoration: 'none', fontWeight: '600', fontSize: '13px' }} onMouseOver={(e) => e.target.style.textDecoration = 'underline'} onMouseOut={(e) => e.target.style.textDecoration = 'none'}>PDF</a>
                    <button onClick={() => onDelete(inv.id)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', padding: '0', fontWeight: '600', fontSize: '13px' }} onMouseOver={(e) => e.target.style.textDecoration = 'underline'} onMouseOut={(e) => e.target.style.textDecoration = 'none'}>Delete</button>
                  </td>
                </tr>
              )
            })}
            {filteredInvoices.length === 0 && (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280', fontSize: '15px' }}>No invoices match your current filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* GLASSMORPHISM PAYMENT MODAL */}
      {paymentModal.isOpen && paymentModal.invoice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s' }}>
          <div style={{ backgroundColor: 'white', padding: '35px', borderRadius: '16px', width: '420px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', border: '1px solid #e5e7eb' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
              <div>
                <h2 style={{ margin: '0 0 5px 0', color: '#111827', fontSize: '22px', fontWeight: '800' }}>Receive Payment</h2>
                <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>Invoice <strong>{paymentModal.invoice.invoiceNumber}</strong></p>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>💵</div>
            </div>

            <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', marginBottom: '25px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Amount Due</label>
              <div style={{ fontSize: '36px', fontWeight: '900', color: '#059669', letterSpacing: '-0.02em' }}>
                ${paymentModal.invoice.totalAmount.toFixed(2)}
              </div>
            </div>

            {/* 🔥 THE NEW PAYMENT METHOD SWITCHER */}
            {paymentModal.step === 'select_method' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <button 
                  onClick={() => handleInPersonCheckout(paymentModal.invoice)} 
                  style={{ padding: '16px', backgroundColor: '#635bff', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 6px rgba(99, 91, 255, 0.2)' }}
                >
                  💳 Pay with Credit Card (Stripe)
                </button>
                
                <button 
                  onClick={() => setPaymentModal({ ...paymentModal, step: 'manual_deposit' })} 
                  style={{ padding: '16px', backgroundColor: 'white', color: '#111827', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'background-color 0.2s' }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#f9fafb'} 
                  onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
                >
                  💵 Pay with Cash / Manual
                </button>
                
                <button onClick={closePaymentModal} style={{ marginTop: '10px', backgroundColor: 'transparent', color: '#6b7280', border: 'none', cursor: 'pointer', fontWeight: '600', padding: '10px' }}>
                  Cancel
                </button>
              </div>
            ) : (
              // 🔥 THE EXISTING MANUAL BANK DEPOSIT FORM
              <>
                <div style={{ marginBottom: '35px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#111827', marginBottom: '10px' }}>Deposit To Asset Account:</label>
                  {assetAccounts.length === 0 ? (
                    <div style={{ color: '#b91c1c', fontSize: '13px', padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                      No Asset accounts found. Add a bank account in your Chart of Accounts first!
                    </div>
                  ) : (
                    <select 
                      value={paymentModal.account} 
                      onChange={(e) => setPaymentModal({...paymentModal, account: e.target.value})}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '2px solid #e5e7eb', fontSize: '15px', color: '#111827', fontWeight: '500', outlineColor: '#10b981', transition: 'border-color 0.2s', cursor: 'pointer' }}
                    >
                      {assetAccounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                    </select>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={closePaymentModal} style={{ flex: 1, backgroundColor: 'white', color: '#4b5563', padding: '14px', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '15px', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.target.style.backgroundColor = '#f9fafb'} onMouseOut={(e) => e.target.style.backgroundColor = 'white'}>
                    Cancel
                  </button>
                  <button onClick={submitPayment} disabled={assetAccounts.length === 0} style={{ flex: 2, backgroundColor: assetAccounts.length === 0 ? '#9ca3af' : '#10b981', color: 'white', padding: '14px', border: 'none', borderRadius: '8px', cursor: assetAccounts.length === 0 ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '15px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }} onMouseOver={(e) => { if (assetAccounts.length > 0) e.target.style.backgroundColor = '#059669' }} onMouseOut={(e) => { if (assetAccounts.length > 0) e.target.style.backgroundColor = '#10b981' }}>
                    Confirm Payment
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesTab;