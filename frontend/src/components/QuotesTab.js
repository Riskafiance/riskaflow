import React, { useState } from 'react';
import axios from 'axios';

function QuotesTab({ quotes, onCreateNew, onEdit, onEmail, onDelete, refreshData }) {
  const [isConverting, setIsConverting] = useState(false);

  // Trigger the backend to duplicate the quote into a live invoice
  const handleConvertToInvoice = async (quote) => {
    if (window.confirm(`Are you sure you want to convert Quote ${quote.quoteNumber} into a live Invoice?`)) {
      setIsConverting(true);
      try {
        await axios.post(`https://riskaflow.onrender.com/api/quotes/${quote.id}/convert`);
        alert("Success! Quote has been converted into an Invoice.");
        refreshData(); // Refresh the app to pull down the new invoice and updated quote status
      } catch (error) {
        console.error("Convert Error:", error);
        alert(error.response?.data?.error || "Failed to convert quote.");
      } finally {
        setIsConverting(false);
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'converted':
        return (
          <span style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '6px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669' }}></div> Converted
          </span>
        );
      case 'accepted':
        return (
          <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '6px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563eb' }}></div> Accepted
          </span>
        );
      case 'rejected':
        return (
          <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '6px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#dc2626' }}></div> Rejected
          </span>
        );
      default: // pending
        return (
          <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '6px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#d97706' }}></div> Pending
          </span>
        );
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '32px', fontWeight: '800', letterSpacing: '-0.03em' }}>Quotes</h2>
          <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '16px', fontWeight: '400' }}>Manage estimates and convert them into live invoices.</p>
        </div>
        <button 
          onClick={onCreateNew} 
          style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)', transition: 'all 0.2s' }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.4)'; }} 
          onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)'; }}
        >
          <span style={{ fontSize: '18px' }}>+</span> Create Quote
        </button>
      </div>

      {/* QUOTES TABLE */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quote #</th>
                <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client</th>
                <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valid Until</th>
                <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
                <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '16px 24px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '15px' }}>
                    You haven't created any quotes yet.
                  </td>
                </tr>
              ) : (
                quotes.map(quote => (
                  <tr key={quote.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '16px 24px', fontWeight: '800', color: '#0f172a', fontSize: '14px' }}>
                      {quote.quoteNumber}
                    </td>
                    <td style={{ padding: '16px 24px', color: '#475569', fontSize: '14px', fontWeight: '600' }}>
                      {quote.customer ? `${quote.customer.firstName} ${quote.customer.lastName}` : 'Unknown'}
                    </td>
                    <td style={{ padding: '16px 24px', color: '#64748b', fontSize: '14px' }}>
                      {new Date(quote.validUntil).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px 24px', color: '#0f172a', fontWeight: '700', fontSize: '14px' }}>
                      ${quote.totalAmount.toFixed(2)}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      {getStatusBadge(quote.status)}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        
                        {/* Only show Edit and Convert buttons if it hasn't been converted yet */}
                        {quote.status !== 'converted' && (
                          <>
                            <button 
                              onClick={() => onEdit(quote)}
                              style={{ padding: '6px 12px', backgroundColor: 'transparent', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                              onMouseOver={(e) => { e.target.style.backgroundColor = '#eff6ff'; e.target.style.borderColor = '#3b82f6'; }} 
                              onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.borderColor = '#bfdbfe'; }}
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleConvertToInvoice(quote)}
                              disabled={isConverting}
                              style={{ padding: '6px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: isConverting ? 'wait' : 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)' }}
                              onMouseOver={(e) => e.target.style.backgroundColor = '#059669'} 
                              onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
                            >
                              Convert
                            </button>
                          </>
                        )}

                        <button 
                          onClick={() => onEmail(quote)}
                          style={{ padding: '6px 12px', backgroundColor: 'transparent', color: '#8b5cf6', border: '1px solid #c4b5fd', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseOver={(e) => { e.target.style.backgroundColor = '#f5f3ff'; e.target.style.borderColor = '#8b5cf6'; }} 
                          onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.borderColor = '#c4b5fd'; }}
                        >
                          Email
                        </button>

                        <button 
                          onClick={() => onDelete(quote.id)}
                          style={{ padding: '6px 12px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseOver={(e) => { e.target.style.backgroundColor = '#fef2f2'; e.target.style.borderColor = '#ef4444'; }} 
                          onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.borderColor = '#fca5a5'; }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default QuotesTab;