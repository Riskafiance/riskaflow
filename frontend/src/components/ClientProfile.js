import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ClientProfile = ({ clientId, onBack }) => {
  const [client, setClient] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('transactions'); 
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [noteContent, setNoteContent] = useState('');

  useEffect(() => {
    axios.get(`https://riskaflow.onrender.com/api/customers/${clientId}`)
      .then(res => setClient(res.data))
      .catch(err => console.error("Error fetching client details:", err));
  }, [clientId]);

  if (!client) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '100px', color: '#6b7280', fontSize: '16px' }}>
      Loading client profile...
    </div>
  );

  const initials = `${client.firstName?.charAt(0) || ''}${client.lastName?.charAt(0) || ''}`.toUpperCase();
  const openInvoices = client.invoices ? client.invoices.filter(inv => inv.status !== 'paid') : [];
  const openBalance = openInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  // STYLING HELPERS
  const activeTabStyle = { padding: '16px 24px', borderBottom: '3px solid #2563eb', color: '#111827', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' };
  const inactiveTabStyle = { padding: '16px 24px', borderBottom: '3px solid transparent', color: '#6b7280', cursor: 'pointer', fontSize: '15px', fontWeight: '500' };
  const labelStyle = { display: 'block', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', fontWeight: '600', marginBottom: '6px' };
  const valueStyle = { color: '#111827', fontSize: '15px', fontWeight: '500', margin: '0 0 24px 0' };

  // Fixed Save Note Logic
  const handleSaveNote = () => {
    const { invoices, ...cleanClientData } = client;
    axios.put(`https://riskaflow.onrender.com/api/customers/${clientId}`, { ...cleanClientData, other: noteContent })
    .then(res => {
      setClient(prev => ({ ...prev, other: noteContent }));
      setIsEditingNotes(false);
    })
    .catch(err => {
      console.error("Error saving note:", err);
      alert("Failed to save note.");
    });
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* HEADER ACTION */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '25px' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontWeight: '600', fontSize: '14px', padding: '8px 12px', borderRadius: '6px', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
          <span style={{ fontSize: '18px' }}>←</span> Back to Client Directory
        </button>
      </div>

      {/* TOP HERO CARD */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '30px 40px', display: 'flex', justifyContent: 'space-between', marginBottom: '25px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}>
        
        {/* Profile Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '25px', width: '30%' }}>
           <div style={{ width: '85px', height: '85px', borderRadius: '50%', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', color: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold', border: '2px solid #bfdbfe', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
             {initials}
           </div>
           <div>
             <h2 style={{ margin: '0 0 4px 0', color: '#111827', fontSize: '26px', fontWeight: '800', letterSpacing: '-0.02em' }}>{client.firstName} {client.lastName}</h2>
             {client.companyName && <span style={{ display: 'inline-block', backgroundColor: '#f3f4f6', color: '#4b5563', padding: '4px 12px', borderRadius: '9999px', fontSize: '13px', fontWeight: '600', marginTop: '6px' }}>{client.companyName}</span>}
           </div>
        </div>
        
        {/* Quick Contact Info */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '35%', borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', padding: '0 40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ color: '#9ca3af' }}>✉</span>
              <span style={{ color: '#374151', fontSize: '15px', fontWeight: '500' }}>{client.email}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#9ca3af' }}>☏</span>
              <span style={{ color: '#374151', fontSize: '15px', fontWeight: '500' }}>{client.phone}</span>
            </div>
        </div>

        {/* Elevated Financial Summary */}
        <div style={{ width: '25%', paddingLeft: '20px' }}>
          <div style={{ background: 'linear-gradient(to right bottom, #ffffff, #f8fafc)', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
             <h3 style={{ margin: '0 0 15px 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
                Outstanding Balance
             </h3>
             <p style={{ margin: 0, fontSize: '32px', fontWeight: '800', color: openBalance > 0 ? '#111827' : '#10b981', letterSpacing: '-0.02em' }}>
               ${openBalance.toFixed(2)}
             </p>
          </div>
        </div>
      </div>

      {/* BOTTOM CONTENT AREA */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', overflow: 'hidden', minHeight: '400px' }}>
        
        {/* Modern Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb', padding: '0 10px' }}>
          <div onClick={() => setActiveSubTab('transactions')} style={activeSubTab === 'transactions' ? activeTabStyle : inactiveTabStyle}>Transaction History</div>
          <div onClick={() => setActiveSubTab('details')} style={activeSubTab === 'details' ? activeTabStyle : inactiveTabStyle}>Full Profile Details</div>
          <div onClick={() => setActiveSubTab('notes')} style={activeSubTab === 'notes' ? activeTabStyle : inactiveTabStyle}>Internal Notes</div>
        </div>

        {/* TAB 1: INVOICES (Matches Directory Style) */}
        {activeSubTab === 'transactions' && (
          <div>
            {client.invoices && client.invoices.length > 0 ? (
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#ffffff', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #f3f4f6' }}>
                    <th style={{ padding: '16px 24px', fontWeight: '600' }}>Date</th>
                    <th style={{ padding: '16px 24px', fontWeight: '600' }}>Invoice No.</th>
                    <th style={{ padding: '16px 24px', fontWeight: '600' }}>Amount</th>
                    <th style={{ padding: '16px 24px', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'right' }}>Document</th>
                  </tr>
                </thead>
                <tbody>
                  {client.invoices.map(inv => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ padding: '16px 24px', color: '#4b5563', fontSize: '14px', fontWeight: '500' }}>{new Date(inv.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                      <td style={{ padding: '16px 24px', color: '#111827', fontWeight: '700', fontSize: '14px' }}>{inv.invoiceNumber}</td>
                      <td style={{ padding: '16px 24px', color: '#374151', fontWeight: '600', fontSize: '14px' }}>${inv.totalAmount.toFixed(2)}</td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', backgroundColor: inv.status === 'paid' ? '#d1fae5' : inv.status === 'overdue' ? '#fee2e2' : '#fef3c7', color: inv.status === 'paid' ? '#065f46' : inv.status === 'overdue' ? '#991b1b' : '#92400e' }}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <a href={`https://riskaflow.onrender.com/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600', fontSize: '14px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff' }}>Open PDF</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <p style={{ color: '#6b7280', fontSize: '15px', margin: 0 }}>No invoices have been created for this client yet.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DETAILED GRID */}
        {activeSubTab === 'details' && (
          <div style={{ padding: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px' }}>
            <div><span style={labelStyle}>Full Legal Name</span><p style={valueStyle}>{client.title || ''} {client.firstName} {client.middleName || ''} {client.lastName} {client.suffix || ''}</p></div>
            <div><span style={labelStyle}>Company Name</span><p style={valueStyle}>{client.companyName || '—'}</p></div>
            <div><span style={labelStyle}>Display Name</span><p style={valueStyle}>{client.displayName || '—'}</p></div>
            <div><span style={labelStyle}>Primary Email</span><p style={valueStyle}>{client.email || '—'}</p></div>
            <div><span style={labelStyle}>Primary Phone</span><p style={valueStyle}>{client.phone || '—'}</p></div>
            <div><span style={labelStyle}>Mobile Phone</span><p style={valueStyle}>{client.mobile || '—'}</p></div>
            <div><span style={labelStyle}>CC Email</span><p style={valueStyle}>{client.cc || '—'}</p></div>
            <div><span style={labelStyle}>BCC Email</span><p style={valueStyle}>{client.bcc || '—'}</p></div>
            <div><span style={labelStyle}>Website</span><p style={valueStyle}>{client.website || '—'}</p></div>
            <div style={{ gridColumn: '1 / -1' }}><span style={labelStyle}>Billing Address</span><p style={{ ...valueStyle, whiteSpace: 'pre-wrap' }}>{client.address || '—'}</p></div>
          </div>
        )}

        {/* TAB 3: NOTES */}
        {activeSubTab === 'notes' && (
          <div style={{ padding: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#111827', fontSize: '20px', fontWeight: '700' }}>Internal Notes</h3>
                <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>Secure, private notes regarding this client account.</p>
              </div>
              {!isEditingNotes && (
                <button onClick={() => { setNoteContent(client.other || ''); setIsEditingNotes(true); }} style={{ backgroundColor: '#ffffff', color: '#374151', padding: '10px 16px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  ✎ Edit Notes
                </button>
              )}
            </div>

            <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', minHeight: '200px', display: 'flex', flexDirection: 'column' }}>
              {isEditingNotes ? (
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} style={{ width: '100%', flexGrow: 1, minHeight: '150px', padding: '16px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical', fontSize: '15px', lineHeight: '1.6', outlineColor: '#2563eb' }} placeholder="Type your internal notes here..." />
                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button onClick={handleSaveNote} style={{ backgroundColor: '#10b981', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      Save Notes
                    </button>
                    <button onClick={() => setIsEditingNotes(false)} style={{ backgroundColor: '#e5e7eb', color: '#4b5563', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '24px', flexGrow: 1 }}>
                  {client.other ? (
                    <p style={{ whiteSpace: 'pre-wrap', margin: 0, color: '#374151', lineHeight: '1.7', fontSize: '15px' }}>{client.other}</p>
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <p style={{ color: '#9ca3af', margin: 0, fontSize: '15px' }}>No notes currently exist for this client.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ClientProfile;