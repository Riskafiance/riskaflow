import React, { useState } from 'react';

const InvoicesTab = ({ invoices, onCreateNew, onEdit, onDelete, onSendEmail }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const today = new Date();

  // Filter invoices based on search
  const filteredInvoices = invoices.filter(inv => {
    const searchString = searchTerm.toLowerCase();
    const customerName = inv.customer ? `${inv.customer.firstName} ${inv.customer.lastName}`.toLowerCase() : '';
    const companyName = inv.customer?.companyName?.toLowerCase() || '';
    
    return (
      inv.invoiceNumber.toLowerCase().includes(searchString) ||
      customerName.includes(searchString) ||
      companyName.includes(searchString)
    );
  });

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '28px', fontWeight: '800', letterSpacing: '-0.02em' }}>Invoices</h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '15px' }}>Manage and track all your billing.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '14px' }}>🔍</span>
            <input 
              type="text" 
              placeholder="Search invoices..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '10px 16px 10px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', width: '250px' }}
            />
          </div>
          <button 
            onClick={onCreateNew} 
            style={{ backgroundColor: '#00a36c', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(0, 163, 108, 0.2)' }}
          >
            + Create Invoice
          </button>
        </div>
      </div>

      {/* INVOICES TABLE CARD */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          
          {filteredInvoices.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>🧾</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '18px' }}>No invoices found</h3>
              <p style={{ margin: 0, fontSize: '14px' }}>{searchTerm ? "Try adjusting your search term." : "Create your first invoice to get started."}</p>
            </div>
          ) : (
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '900px' }}>
              
              {/* TABLE HEADER */}
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '16px 20px', width: '40px' }}><input type="checkbox" style={{ cursor: 'pointer' }}/></th>
                  <th style={{ padding: '16px 20px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                  <th style={{ padding: '16px 20px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invoice No.</th>
                  <th style={{ padding: '16px 20px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer</th>
                  <th style={{ padding: '16px 20px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
                  <th style={{ padding: '16px 20px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '16px 20px', color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>

              {/* TABLE BODY */}
              <tbody>
                {filteredInvoices.map((inv) => {
                  const invoiceDate = new Date(inv.date || inv.createdAt).toLocaleDateString('en-US');
                  const isOverdue = new Date(inv.dueDate) < today && inv.status !== 'paid';
                  const customerName = inv.customer ? `${inv.customer.firstName} ${inv.customer.lastName}` : 'Unknown';
                  
                  return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      
                      {/* Checkbox */}
                      <td style={{ padding: '16px 20px' }}>
                        <input type="checkbox" style={{ cursor: 'pointer' }} />
                      </td>

                      {/* Date */}
                      <td style={{ padding: '16px 20px', color: '#475569', fontSize: '14px', fontWeight: '500' }}>
                        {invoiceDate}
                      </td>

                      {/* Invoice No */}
                      <td style={{ padding: '16px 20px', color: '#0f172a', fontSize: '14px', fontWeight: '800' }}>
                        {inv.invoiceNumber}
                      </td>

                      {/* Customer */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ color: '#0f172a', fontSize: '14px', fontWeight: '700' }}>{customerName}</div>
                        {inv.customer?.companyName && (
                          <div style={{ color: '#64748b', fontSize: '12px' }}>{inv.customer.companyName}</div>
                        )}
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '16px 20px', color: '#0f172a', fontSize: '14px', fontWeight: '800' }}>
                        ${inv.totalAmount.toFixed(2)}
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '16px 20px' }}>
                        {inv.status === 'paid' ? (
                          <span style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '6px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669' }}></div> Paid
                          </span>
                        ) : isOverdue ? (
                          <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '6px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#dc2626' }}></div> Overdue
                          </span>
                        ) : (
                          <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '6px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#d97706' }}></div> Due Soon
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px' }}>
                          
                          {/* Receive Payment Button */}
                          <button style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.target.style.backgroundColor = '#059669'} onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}>
                            Receive Payment
                          </button>

                          {/* Quick Action Links */}
                          <div style={{ display: 'flex', gap: '12px', fontSize: '13px', fontWeight: '600' }}>
                            
                            <button onClick={() => onEdit(inv)} style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', cursor: 'pointer' }} onMouseOver={(e) => e.target.style.textDecoration = 'underline'} onMouseOut={(e) => e.target.style.textDecoration = 'none'}>
                              Edit
                            </button>

                            {/* 🔥 THE NEW SEND EMAIL TRIGGER */}
                            <button onClick={() => onSendEmail(inv)} style={{ background: 'none', border: 'none', padding: 0, color: '#8b5cf6', cursor: 'pointer' }} onMouseOver={(e) => e.target.style.textDecoration = 'underline'} onMouseOut={(e) => e.target.style.textDecoration = 'none'}>
                              Send Email
                            </button>

                            <a href={`http://localhost:5000/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer" style={{ color: '#475569', textDecoration: 'none', cursor: 'pointer' }} onMouseOver={(e) => e.target.style.textDecoration = 'underline'} onMouseOut={(e) => e.target.style.textDecoration = 'none'}>
                              PDF
                            </a>

                            <button onClick={() => onDelete(inv.id)} style={{ background: 'none', border: 'none', padding: 0, color: '#ef4444', cursor: 'pointer' }} onMouseOver={(e) => e.target.style.textDecoration = 'underline'} onMouseOut={(e) => e.target.style.textDecoration = 'none'}>
                              Delete
                            </button>

                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoicesTab;