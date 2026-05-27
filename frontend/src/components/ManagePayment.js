import React, { useState } from 'react';
import axios from 'axios';

function ManagePayment({ invoice, onBack, onSuccess }) {
  const remainingBalance = invoice.totalAmount - (invoice.amountPaid || 0);
  
  // Default the input box to whatever balance is remaining
  const [customAmount, setCustomAmount] = useState(remainingBalance.toFixed(2));
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  // 1. Manually Record Cash/Check
  const handleRecordManual = async () => {
    const amt = parseFloat(customAmount);
    if (isNaN(amt) || amt <= 0 || amt > remainingBalance) {
      alert("Please enter a valid amount up to the remaining balance.");
      return;
    }

    if (window.confirm(`Are you sure you want to manually record a payment of $${amt.toFixed(2)}?`)) {
      setIsProcessing(true);
      try {
        const newAmountPaid = (invoice.amountPaid || 0) + amt;
        
        // Auto-switch status based on whether it is fully paid off
        let newStatus = 'partially_paid';
        if (newAmountPaid >= invoice.totalAmount) {
          newStatus = 'paid';
        }

        await axios.put(`https://riskaflow.onrender.com/api/invoices/${invoice.id}`, {
          amountPaid: newAmountPaid,
          status: newStatus
        });

        alert("Manual payment recorded successfully!");
        onSuccess();
      } catch (err) {
        alert("Failed to record payment.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // 2. Generate a Stripe Link for a specific Deposit/Partial amount
  const handleGenerateLink = async () => {
    const amt = parseFloat(customAmount);
    if (isNaN(amt) || amt <= 0 || amt > remainingBalance) {
      alert("Please enter a valid amount up to the remaining balance.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await axios.post(`https://riskaflow.onrender.com/api/invoices/${invoice.id}/checkout-link`, {
        customAmount: amt // 🔥 Send the custom deposit amount to your updated backend
      });
      setGeneratedLink(res.data.url);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to generate link. Have you completed Stripe onboarding?");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-in-out', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '28px', fontWeight: '800', letterSpacing: '-0.02em' }}>
            Invoice {invoice.invoiceNumber}
          </h2>
          <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '15px' }}>
            Client: {invoice.customer?.firstName} {invoice.customer?.lastName}
          </p>
        </div>
        <button 
          onClick={onBack} 
          style={{ padding: '10px 20px', backgroundColor: 'transparent', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseOver={(e) => { e.target.style.backgroundColor = '#f1f5f9'; e.target.style.color = '#0f172a'; }}
          onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#475569'; }}
        >
          Back to Invoices
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Balance Overview Card */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '16px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Balance Overview</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ color: '#64748b', fontWeight: '600' }}>Invoice Total</span>
            <span style={{ color: '#0f172a', fontWeight: '700', fontSize: '16px' }}>${invoice.totalAmount.toFixed(2)}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ color: '#059669', fontWeight: '600' }}>Amount Paid</span>
            <span style={{ color: '#059669', fontWeight: '700', fontSize: '16px' }}>-${(invoice.amountPaid || 0).toFixed(2)}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <span style={{ color: '#0f172a', fontWeight: '800', fontSize: '18px' }}>Remaining Due</span>
            <span style={{ color: '#ef4444', fontWeight: '900', fontSize: '28px' }}>${remainingBalance.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Controls Card */}
        {remainingBalance > 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#0f172a', fontSize: '16px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Process Payment</h3>
            
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '700', color: '#475569' }}>AMOUNT TO CHARGE / RECORD ($)</label>
            <input 
              type="number" 
              max={remainingBalance} 
              value={customAmount} 
              onChange={(e) => setCustomAmount(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '18px', fontWeight: '700', color: '#0f172a', boxSizing: 'border-box', marginBottom: '24px', outline: 'none' }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                onClick={handleGenerateLink}
                disabled={isProcessing}
                style={{ width: '100%', padding: '14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '15px', cursor: isProcessing ? 'wait' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(59, 130, 246, 0.3)' }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
              >
                Generate Stripe Link
              </button>

              <button 
                onClick={handleRecordManual}
                disabled={isProcessing}
                style={{ width: '100%', padding: '14px', backgroundColor: 'transparent', color: '#059669', border: '2px solid #10b981', borderRadius: '8px', fontWeight: '700', fontSize: '15px', cursor: isProcessing ? 'wait' : 'pointer', transition: 'all 0.2s' }}
                onMouseOver={(e) => { e.target.style.backgroundColor = '#ecfdf5'; }}
                onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; }}
              >
                Record Cash / Manual Payment
              </button>
            </div>

            {generatedLink && (
              <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px dashed #bfdbfe', animation: 'fadeIn 0.3s' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: '800', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Link Generated:</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" readOnly value={generatedLink} style={{ flex: 1, padding: '10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #93c5fd', backgroundColor: 'white', color: '#475569', outline: 'none' }} />
                  <button 
                    onClick={() => { navigator.clipboard.writeText(generatedLink); alert("Link copied to clipboard!"); }}
                    style={{ padding: '10px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ backgroundColor: '#d1fae5', borderRadius: '12px', padding: '40px 24px', border: '1px solid #34d399', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
            <h3 style={{ margin: 0, color: '#065f46', fontSize: '20px', fontWeight: '800' }}>Invoice is Fully Paid!</h3>
          </div>
        )}
      </div>
    </div>
  );
}

export default ManagePayment;