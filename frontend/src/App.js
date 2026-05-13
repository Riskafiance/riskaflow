import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

import Login from './components/Login';
import CreateInvoice from './components/CreateInvoice';
import CustomersTab from './components/CustomersTab';
import ClientProfile from './components/ClientProfile';
import InvoicesTab from './components/InvoicesTab';
import ChartOfAccounts from './components/ChartOfAccounts';
import ReportsTab from './components/ReportsTab';
import SettingsTab from './components/SettingsTab';
import SendInvoiceEmail from './components/SendInvoiceEmail'; 
import PaymentSuccess from './components/PaymentSuccess';
import AdminPortal from './components/AdminPortal';

function App() {
  // --- AUTHENTICATION STATE ---
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // --- APP STATE ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedClientId, setSelectedClientId] = useState(null); 
  const [invoiceToEdit, setInvoiceToEdit] = useState(null); 
  const [invoiceToEmail, setInvoiceToEmail] = useState(null); 
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile Sidebar Toggle

  // --- RESPONSIVE CHECK ---
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 🔥 State for tracking if you are in "Expert Mode"
  const [impersonatedUser, setImpersonatedUser] = useState(null);

  // --- FIREBASE AUTHENTICATION LISTENER ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });
    return unsubscribe; 
  }, []);

  // --- DATA FETCHING ---
  const fetchData = () => {
    if (!auth.currentUser) return;
    const userEmail = impersonatedUser ? impersonatedUser.email : auth.currentUser.email;

    axios.get(`https://riskaflow.onrender.com/api/customers?email=${userEmail}`)
      .then(res => setCustomers(res.data))
      .catch(err => console.error("Error fetching customers:", err));
      
    axios.get(`https://riskaflow.onrender.com/api/invoices?email=${userEmail}`)
      .then(res => setInvoices(res.data))
      .catch(err => console.error("Error fetching invoices:", err));

    axios.get(`https://riskaflow.onrender.com/api/accounts?email=${userEmail}`)
      .then(res => setAccounts(res.data))
      .catch(err => console.error("Error fetching accounts:", err));
  };

  useEffect(() => {
    if (currentUser) {
      fetchData(); 
    }
  }, [currentUser, impersonatedUser]);

  // --- HANDLERS ---
  const handleInvoiceSuccess = () => {
    setActiveTab('invoices'); 
    setInvoiceToEdit(null); 
    fetchData(); 
  };

  const handleViewProfile = (id) => {
    setSelectedClientId(id);
    setActiveTab('clientProfile');
    setGlobalSearchTerm(''); 
    setShowSearchResults(false);
    if (isMobile) setIsSidebarOpen(false);
  };

  const handleEditInvoice = (inv) => {
    setInvoiceToEdit(inv);
    setActiveTab('createInvoice');
    setGlobalSearchTerm(''); 
    setShowSearchResults(false);
  };

  const handleDeleteInvoice = (id) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      axios.delete(`https://riskaflow.onrender.com/api/invoices/${id}`)
        .then(() => fetchData())
        .catch(err => alert("Error deleting invoice."));
    }
  };

  // --- SEARCH LOGIC ---
  const searchResults = {
    customers: customers.filter(c => 
      `${c.firstName} ${c.lastName} ${c.companyName}`.toLowerCase().includes(globalSearchTerm.toLowerCase())
    ),
    invoices: invoices.filter(inv => 
      inv.invoiceNumber.toLowerCase().includes(globalSearchTerm.toLowerCase()) || 
      (inv.customer && `${inv.customer.firstName} ${inv.customer.lastName}`.toLowerCase().includes(globalSearchTerm.toLowerCase()))
    )
  };

  const hasSearchResults = searchResults.customers.length > 0 || searchResults.invoices.length > 0;

  // --- DASHBOARD DATA ---
  const today = new Date();
  const currentHour = today.getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

  const totalClients = customers.length;
  const totalRevenue = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0);
  const outstandingBalance = invoices.filter(inv => inv.status !== 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0);
  const overdueCount = invoices.filter(inv => new Date(inv.dueDate) < today && inv.status !== 'paid').length;

  let navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> },
    { id: 'invoices', label: 'Invoices', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg> },
    { id: 'customers', label: 'Clients', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg> },
    { id: 'coa', label: 'Accounts', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg> },
    { id: 'reports', label: 'Reports', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg> },
    { id: 'settings', label: 'Settings', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> }
  ];

  if (currentUser?.email === 'amarildiriska2@gmail.com') {
    navItems.push({ id: 'admin', label: 'Expert Portal', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> });
  }

  const CardWrapper = ({ children, style }) => (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', ...style }}>
      {children}
    </div>
  );

  if (isAuthLoading) return <div style={{ height: '100vh', backgroundColor: '#f8fafc' }}></div>;
  if (!currentUser) return <Login />;

  const displayGreetingName = impersonatedUser ? impersonatedUser.businessName : (currentUser?.displayName?.split(' ')[0] || '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      
      {/* 🟢 TOP BAR */}
      <div style={{ backgroundColor: '#023c34', padding: isMobile ? '10px 16px' : '12px 24px', display: 'flex', alignItems: 'center', zIndex: 100, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: isMobile ? 'auto' : '250px' }}>
          {isMobile && (
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ background: 'none', border: 'none', color: 'white', padding: '5px' }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
          )}
          <img src="/logo.png" alt="Logo" style={{ width: isMobile ? '32px' : '40px', height: isMobile ? '32px' : '40px', backgroundColor: 'white', borderRadius: '6px', padding: '4px' }} />
          {!isMobile && <h1 style={{ color: 'white', fontSize: '18px', fontWeight: '800', margin: 0, lineHeight: '1.1' }}>Riska's<br />Finance</h1>}
        </div>

        <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'center', padding: '0 10px' }}>
          <div style={{ width: '100%', maxWidth: '600px', position: 'relative' }}>
            <input 
              type="text" 
              placeholder={isMobile ? "Search..." : "Navigate. Find transactions..."} 
              value={globalSearchTerm}
              onChange={(e) => { setGlobalSearchTerm(e.target.value); setShowSearchResults(true); }}
              style={{ width: '100%', padding: '10px 16px 10px 40px', borderRadius: '9999px', border: '1px solid #065f46', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white', outline: 'none' }}
            />
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div onClick={() => setShowProfileMenu(!showProfileMenu)} style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'white', color: '#023c34', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', cursor: 'pointer' }}>
            {currentUser?.displayName?.charAt(0) || 'U'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden', position: 'relative' }}>
        
        {/* ⬅️ SIDEBAR NAVIGATION (Toggleable on Mobile) */}
        <div style={{ 
          width: '270px', 
          backgroundColor: '#ffffff', 
          borderRight: '1px solid #e2e8f0', 
          display: isMobile && !isSidebarOpen ? 'none' : 'flex', 
          flexDirection: 'column', 
          padding: '20px', 
          position: isMobile ? 'absolute' : 'relative',
          height: '100%',
          zIndex: 90,
          boxShadow: isMobile ? '10px 0 20px rgba(0,0,0,0.1)' : 'none'
        }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); if(isMobile) setIsSidebarOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px',
                  backgroundColor: activeTab === item.id ? '#ecfdf5' : 'transparent',
                  color: activeTab === item.id ? '#047857' : '#64748b',
                  fontWeight: '700', border: 'none', cursor: 'pointer'
                }}
              >
                {item.icon} {item.label}
              </button>
            ))}
            <button onClick={() => signOut(auth)} style={{ marginTop: '20px', padding: '12px', color: '#ef4444', background: 'none', border: 'none', fontWeight: '700', textAlign: 'left', cursor: 'pointer' }}>
              Sign Out
            </button>
          </nav>
        </div>

        {/* ➡️ MAIN CONTENT AREA */}
        <div style={{ flex: 1, padding: isMobile ? '20px' : '40px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            
            {activeTab === 'dashboard' && (
              <div>
                <h2 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>{greeting}, {displayGreetingName}</h2>
                <p style={{ color: '#64748b', marginBottom: '30px' }}>Overview of your business.</p>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
                  <CardWrapper style={{ padding: '20px' }}>
                    <p style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Revenue</p>
                    <p style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a' }}>${totalRevenue.toFixed(2)}</p>
                  </CardWrapper>
                  <CardWrapper style={{ padding: '20px' }}>
                    <p style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Outstanding</p>
                    <p style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a' }}>${outstandingBalance.toFixed(2)}</p>
                  </CardWrapper>
                  <CardWrapper style={{ padding: '20px' }}>
                    <p style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Overdue</p>
                    <p style={{ fontSize: '28px', fontWeight: '900', color: '#dc2626' }}>{overdueCount}</p>
                  </CardWrapper>
                  <CardWrapper style={{ padding: '20px' }}>
                    <p style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Clients</p>
                    <p style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a' }}>{totalClients}</p>
                  </CardWrapper>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr', gap: '20px' }}>
                  <CardWrapper style={{ padding: '20px', overflowX: 'auto' }}>
                    <h3 style={{ marginBottom: '15px', fontWeight: '800' }}>Recent Invoices</h3>
                    <table style={{ width: '100%', minWidth: '600px', textAlign: 'left', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ color: '#64748b', fontSize: '12px', borderBottom: '1px solid #f1f5f9' }}>
                          <th style={{ paddingBottom: '10px' }}>Invoice #</th>
                          <th style={{ paddingBottom: '10px' }}>Customer</th>
                          <th style={{ paddingBottom: '10px' }}>Amount</th>
                          <th style={{ paddingBottom: '10px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.slice(0, 5).map(inv => (
                          <tr key={inv.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td style={{ padding: '12px 0', fontWeight: '700' }}>{inv.invoiceNumber}</td>
                            <td>{inv.customer?.firstName} {inv.customer?.lastName}</td>
                            <td style={{ fontWeight: '700' }}>${inv.totalAmount.toFixed(2)}</td>
                            <td>{inv.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardWrapper>
                </div>
              </div>
            )}

            {activeTab === 'invoices' && <InvoicesTab invoices={invoices} onCreateNew={() => setActiveTab('createInvoice')} refreshData={fetchData} />}
            {activeTab === 'customers' && <CustomersTab customers={customers} refreshData={fetchData} onViewProfile={handleViewProfile} />}
            {activeTab === 'settings' && <SettingsTab />}
            {activeTab === 'createInvoice' && <CreateInvoice customers={customers} onCancel={() => setActiveTab('invoices')} onSuccess={handleInvoiceSuccess} />}
            {activeTab === 'clientProfile' && selectedClientId && <ClientProfile clientId={selectedClientId} onBack={() => setActiveTab('customers')} />}
            {activeTab === 'coa' && <ChartOfAccounts accounts={accounts} refreshData={fetchData} />}
            {activeTab === 'reports' && <ReportsTab invoices={invoices} />}
            {activeTab === 'admin' && <AdminPortal onImpersonate={(email, biz) => { setImpersonatedUser({email, businessName: biz}); setActiveTab('dashboard'); }} />}

          </div>
        </div>
      </div>
    </div>
  );
}

export default App;