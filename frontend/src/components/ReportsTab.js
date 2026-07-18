import React, { useState, useEffect } from 'react';

const ReportsTab = ({ invoices }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Reporting Math ---
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');
  const openInvoices = invoices.filter(inv => inv.status !== 'paid');

  const totalReceived = paidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalOutstanding = openInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  // --- Styling Helpers ---
  const CardWrapper = ({ children, style }) => (
    <div 
      style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6', transition: 'transform 0.2s, box-shadow 0.2s', padding: isMobile ? '20px' : '30px', ...style }}
      onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)'; }}
      onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'; }}
    >
      {children}
    </div>
  );

  return (
    <div style={{ backgroundColor: 'transparent', position: 'relative', animation: 'fadeIn 0.3s ease-in-out' }}>
      
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ margin: 0, color: '#111827', fontSize: isMobile ? '22px' : '28px', fontWeight: '800', letterSpacing: '-0.02em' }}>Financial Reports</h2>
        <p style={{ margin: '5px 0 0 0', color: '#6b7280', fontSize: '15px' }}>Analyze your cash flow and outstanding balances.</p>
      </div>

      {/* TOP REPORT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '20px' : '30px', marginBottom: '40px' }}>
        
        {/* Closed Invoices Report */}
        <CardWrapper>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
            <div style={{ width: '56px', height: '56px', flexShrink: 0, borderRadius: '12px', background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>💰</div>
            <h3 style={{ margin: 0, color: '#4b5563', fontSize: '15px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Received</h3>
          </div>
          <div style={{ fontSize: isMobile ? '32px' : '42px', fontWeight: '900', color: '#111827', letterSpacing: '-0.02em' }}>
            ${totalReceived.toFixed(2)}
          </div>
          <div style={{ fontSize: '14px', color: '#059669', marginTop: '10px', fontWeight: '600' }}>
            ✓ Based on {paidInvoices.length} closed invoices
          </div>
        </CardWrapper>

        {/* Open Invoices Report */}
        <CardWrapper>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
            <div style={{ width: '56px', height: '56px', flexShrink: 0, borderRadius: '12px', background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>⏳</div>
            <h3 style={{ margin: 0, color: '#4b5563', fontSize: '15px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Outstanding</h3>
          </div>
          <div style={{ fontSize: isMobile ? '32px' : '42px', fontWeight: '900', color: '#111827', letterSpacing: '-0.02em' }}>
            ${totalOutstanding.toFixed(2)}
          </div>
          <div style={{ fontSize: '14px', color: '#2563eb', marginTop: '10px', fontWeight: '600' }}>
            Pending from {openInvoices.length} open invoices
          </div>
        </CardWrapper>

      </div>

      {/* DETAILED BREAKDOWN SECTION */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: isMobile ? '16px 20px' : '20px 24px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
          <h3 style={{ color: '#111827', margin: 0, fontSize: '18px', fontWeight: '700' }}>Status Breakdown</h3>
        </div>
        <div style={{ padding: isMobile ? '16px 20px' : '24px' }}>
          
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', gap: isMobile ? '4px' : '0', padding: '15px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ color: '#374151', fontWeight: '600', fontSize: '15px' }}>Closed (Paid in Full)</div>
            <div style={{ color: '#059669', fontWeight: '800', fontSize: '15px' }}>${totalReceived.toFixed(2)}</div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', gap: isMobile ? '4px' : '0', padding: '15px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ color: '#374151', fontWeight: '600', fontSize: '15px' }}>Open (Awaiting Payment)</div>
            <div style={{ color: '#2563eb', fontWeight: '800', fontSize: '15px' }}>
              ${openInvoices.filter(i => new Date(i.dueDate) >= new Date() && i.status !== 'paid').reduce((s, i) => s + i.totalAmount, 0).toFixed(2)}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', gap: isMobile ? '4px' : '0', padding: '15px 0' }}>
            <div style={{ color: '#374151', fontWeight: '600', fontSize: '15px' }}>Overdue (Past Due Date)</div>
            <div style={{ color: '#dc2626', fontWeight: '800', fontSize: '15px' }}>
              ${openInvoices.filter(i => new Date(i.dueDate) < new Date() && i.status !== 'paid').reduce((s, i) => s + i.totalAmount, 0).toFixed(2)}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default ReportsTab;