import React, { useState } from 'react';
import axios from 'axios';

const SendInvoiceEmail = ({ invoice, onBack, onSend }) => {
  const customerName = invoice?.customer ? `${invoice.customer.firstName} ${invoice.customer.lastName}` : 'Customer';
  const customerEmail = invoice?.customer?.email || '';
  const amount = invoice?.totalAmount ? invoice.totalAmount.toFixed(2) : '0.00';
  const invoiceNo = invoice?.invoiceNumber || 'NEW';

  // Form State
  const [toEmail, setToEmail] = useState(customerEmail);
  const [subject, setSubject] = useState(`New payment request from Riska's Finance, LLC - Invoice ${invoiceNo}`);
  const [message, setMessage] = useState(`Dear ${customerName},\n\nWe appreciate your business. Please find your invoice details here. Feel free to contact us if you have any questions.\n\nHave a great day!`);
  const [paymentLink, setPaymentLink] = useState('');
  
  // Loading state so the user can't spam the send button
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!toEmail) return alert("Please enter a customer email.");
    
    setIsSending(true);
    try {
      // 🔥 This is the magic part! It sends the custom text and link to your backend
      await axios.post(`http://localhost:5000/api/invoices/${invoice.id}/send-email`, {
        toEmail: toEmail,
        subject: subject,
        messageBody: message,
        paymentLink: paymentLink 
      });
      
      alert(`Email sent successfully to ${toEmail}!`);
      onSend(); // Returns you to the Invoices tab
    } catch (error) {
      console.error("Error sending email:", error);
      alert("Failed to send email. Check your backend terminal for the exact error.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f8fafc' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#e2e8f0', color: '#475569', fontWeight: 'bold', fontSize: '18px' }}>
            &larr;
          </button>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '24px', fontWeight: '800' }}>Send Invoice {invoiceNo}</h2>
        </div>
        <button 
          onClick={handleSend} 
          disabled={isSending} 
          style={{ backgroundColor: isSending ? '#94a3b8' : '#00a36c', color: 'white', padding: '10px 24px', border: 'none', borderRadius: '8px', cursor: isSending ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '14px', boxShadow: '0 4px 6px -1px rgba(0, 163, 108, 0.2)' }}
        >
          {isSending ? 'Sending...' : 'Send Email'}
        </button>
      </div>

      {/* SPLIT LAYOUT */}
      <div style={{ display: 'flex', gap: '30px', flexGrow: 1 }}>
        
        {/* LEFT COMPONENT: EMAIL FORM */}
        <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div>
            <label style={{ display: 'block', color: '#475569', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>To (Customer Email)</label>
            <input type="email" value={toEmail} onChange={(e) => setToEmail(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', color: '#475569', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>Subject</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <label style={{ display: 'block', color: '#475569', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>Message Body</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} style={{ width: '100%', flexGrow: 1, minHeight: '150px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'none' }} />
          </div>

          <div style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
            <label style={{ display: 'block', color: '#166534', fontSize: '13px', fontWeight: '800', marginBottom: '6px' }}>Custom Payment Link (Optional)</label>
            <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#15803d' }}>Paste your Cash App, Square, or Stripe link here. The client's "Pay Invoice" button will redirect here.</p>
            <input type="text" placeholder="e.g., https://cash.app/$YourTag" value={paymentLink} onChange={(e) => setPaymentLink(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #86efac', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

        </div>

        {/* RIGHT COMPONENT: LIVE PREVIEW */}
        <div style={{ flex: 1, backgroundColor: '#e2e8f0', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
          <h3 style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px 0', fontWeight: '800' }}>Live Customer Preview</h3>
          
          <div style={{ backgroundColor: 'white', width: '100%', maxWidth: '500px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '30px 20px', textAlign: 'center', backgroundColor: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: '50px', height: '50px', backgroundColor: '#0f172a', color: 'white', fontSize: '24px', fontWeight: '900', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>R</div>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: '20px' }}>Riska's Finance, LLC</h2>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '40px 30px', textAlign: 'center' }}>
              <h1 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '24px' }}>Your invoice is ready!</h1>
              <p style={{ margin: 0, color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: '700' }}>Balance Due</p>
              <h2 style={{ margin: '4px 0 24px 0', color: '#0f172a', fontSize: '36px', fontWeight: '900' }}>${amount}</h2>
              
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', textAlign: 'left', whiteSpace: 'pre-wrap', fontSize: '14px', color: '#334155', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                {message}
              </div>

              {/* Dynamic Payment Button Preview */}
              {paymentLink ? (
                <a href={paymentLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', backgroundColor: '#00a36c', color: 'white', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '16px', cursor: 'pointer' }}>
                  Pay Invoice Online
                </a>
              ) : (
                <div style={{ display: 'inline-block', backgroundColor: '#cbd5e1', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', fontWeight: '700', fontSize: '16px' }}>
                  Pay Invoice Online (Link Not Set)
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SendInvoiceEmail;