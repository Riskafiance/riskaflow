import React, { useState } from 'react';
import axios from 'axios';

function SendQuoteEmail({ quote, onBack, onSend }) {
  const [email, setEmail] = useState(quote.customer?.email || '');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!email) {
      alert("Please enter an email address.");
      return;
    }
    setIsSending(true);
    try {
      await axios.post(`https://riskaflow.onrender.com/api/quotes/${quote.id}/send-email`, { email });
      alert("Quote sent successfully!");
      onSend();
    } catch (error) {
      alert("Failed to send quote.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-in-out', maxWidth: '600px', margin: '0 auto', backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
      <h2 style={{ margin: '0 0 20px 0', color: '#0f172a', fontSize: '24px', fontWeight: '800' }}>Email Quote {quote.quoteNumber}</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>To (Client Email)</label>
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button onClick={onBack} style={{ padding: '10px 20px', backgroundColor: 'transparent', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
        <button onClick={handleSend} disabled={isSending} style={{ padding: '10px 24px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: isSending ? 'wait' : 'pointer' }}>
          {isSending ? 'Sending...' : 'Send Email'}
        </button>
      </div>
    </div>
  );
}

export default SendQuoteEmail;