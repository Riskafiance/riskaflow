import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PaymentSuccess = ({ invoiceId }) => {
  const [status, setStatus] = useState('Processing your payment confirmation...');

  useEffect(() => {
    if (invoiceId) {
      // This tells your backend to mark the invoice as PAID and send the receipt email!
      axios.post(`http://localhost:5000/api/invoices/${invoiceId}/mark-paid`)
        .then(() => {
          setStatus('Payment Successful! A receipt has been sent to your email.');
          // Cleans the URL so they don't accidentally trigger it twice
          window.history.replaceState({}, document.title, "/");
        })
        .catch(() => {
          setStatus('Your payment went through, but we had an issue sending the receipt email. Please contact us.');
        });
    }
  }, [invoiceId]);

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ backgroundColor: 'white', padding: '50px', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '500px' }}>
        <div style={{ width: '80px', height: '80px', backgroundColor: '#d1fae5', color: '#059669', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', margin: '0 auto 24px auto' }}>
          ✓
        </div>
        <h1 style={{ color: '#0f172a', margin: '0 0 16px 0', fontSize: '28px' }}>Thank You!</h1>
        <p style={{ color: '#475569', fontSize: '16px', lineHeight: '1.5', margin: '0 0 30px 0' }}>
          {status}
        </p>
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>
          You can securely close this window.
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;