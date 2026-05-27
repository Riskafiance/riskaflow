import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

import Login from './components/Login';
import CreateInvoice from './components/CreateInvoice';
import CreateQuote from './components/CreateQuote'; 
import CustomersTab from './components/CustomersTab';
import ClientProfile from './components/ClientProfile';
import InvoicesTab from './components/InvoicesTab';
import QuotesTab from './components/QuotesTab'; 
import ChartOfAccounts from './components/ChartOfAccounts';
import ReportsTab from './components/ReportsTab';
import SettingsTab from './components/SettingsTab';
import SendInvoiceEmail from './components/SendInvoiceEmail'; 
import SendQuoteEmail from './components/SendQuoteEmail'; 
import PaymentSuccess from './components/PaymentSuccess';
import AdminPortal from './components/AdminPortal';
import ManagePayment from './components/ManagePayment'; 

function App() {
  // --- AUTHENTICATION STATE ---
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // --- APP STATE ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedClientId, setSelectedClientId] = useState(null); 
  const [invoiceToEdit, setInvoiceToEdit] = useState(null); 
  const [quoteToEdit, setQuoteToEdit] = useState(null); 
  const [invoiceToEmail, setInvoiceToEmail] = useState(null); 
  const [quoteToEmail, setQuoteToEmail] = useState(null); 
  const [invoiceToManage, setInvoiceToManage] = useState(null); 
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [quotes, setQuotes] = useState([]); 
  const [accounts, setAccounts] = useState([]);

  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // 🔥 NEW: State for collapsible sidebar
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // State for tracking if you are in "Expert Mode"
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

    axios.get(`https://riskaflow.onrender.com/api/quotes?email=${userEmail}`)
      .then(res => setQuotes(res.data))
      .catch(err => console.error("Error fetching quotes:", err));

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

  const handleQuoteSuccess = () => {
    setActiveTab('quotes'); 
    setQuoteToEdit(null); 
    fetchData(); 
  };

  const handleViewProfile = (id) => {
    setSelectedClientId(id);
    setActiveTab('clientProfile');
    setGlobalSearchTerm(''); 
    setShowSearchResults(false);
  };

  const handleEditInvoice = (inv) => {
    setInvoiceToEdit(inv);
    setActiveTab('createInvoice');
    setGlobalSearchTerm(''); 
    setShowSearchResults(false);
  };

  const handleEditQuote = (quote) => {
    setQuoteToEdit(quote);
    setActiveTab('createQuote');
  };

  const handleManagePayment = (inv) => {
    setInvoiceToManage(inv);
    setActiveTab('managePayment');
  };

  const handleDeleteInvoice = (id) => {
    if (window.confirm("Are you sure you want to delete this invoice? This cannot be undone.")) {
      axios.delete(`https://riskaflow.onrender.com/api/invoices/${id}`)
        .then(() => fetchData())
        .catch(err => alert("Error deleting invoice."));
    }
  };

  const handleDeleteQuote = (id) => {
    if (window.confirm("Are you sure you want to delete this quote? This cannot be undone.")) {
      axios.delete(`https://riskaflow.onrender.com/api/quotes/${id}`)
        .then(() => fetchData())
        .catch(err => alert("Error deleting quote."));
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

  // --- METRICS & DASHBOARD DATA ---
  const today = new Date();
  const currentHour = today.getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

  const totalClients = customers.length;
  const totalRevenue = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0);
  const outstandingBalance = invoices.filter(inv => inv.status !== 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0);
  const overdueCount = invoices.filter(inv => new Date(inv.dueDate) < today && inv.status !== 'paid').length;

  // --- ICONS & STYLES ---
  let navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> },
    { id: 'invoices', label: 'Invoices', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> },
    { id: 'quotes', label: 'Quotes', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg> },
    { id: 'customers', label: 'Clients', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> },
    { id: 'coa', label: 'Chart of Accounts', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg> },
    { id: 'reports', label: 'Reports', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg> },
    { id: 'settings', label: 'Settings', icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> }
  ];

  if (currentUser && currentUser.email === 'amarildiriska2@gmail.com') {
    navItems.push({ 
      id: 'admin', 
      label: 'Expert Portal', 
      icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> 
    });
  }
  
  const CardWrapper = ({ children, style }) => (
    <div 
      style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid #f3f4f6', transition: 'transform 0.2s, box-shadow 0.2s', ...style }}
      onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 20px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)'; }}
      onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)'; }}
    >
      {children}
    </div>
  );

  if (isAuthLoading) {
    return <div style={{ height: '100vh', backgroundColor: '#f8fafc' }}></div>; 
  }

  const urlParams = new URLSearchParams(window.location.search);
  const successInvoiceId = urlParams.get('paid_invoice_id');
  
  if (successInvoiceId) {
    return <PaymentSuccess invoiceId={successInvoiceId} />;
  }

  if (!currentUser) {
    return <Login />; 
  }

  const displayGreetingName = impersonatedUser ? impersonatedUser.businessName : (currentUser?.displayName?.split(' ')[0] || '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', backgroundColor: '#f8fafc' }}>
      
      {impersonatedUser && (
        <div style={{ backgroundColor: '#ef4444', color: 'white', padding: '10px 24px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
          <span>⚠️ EXPERT SUPPORT MODE: You are currently viewing and modifying live data for <strong>{impersonatedUser.businessName}</strong>.</span>
          <button 
            onClick={() => { setImpersonatedUser(null); setActiveTab('admin'); }} 
            style={{ backgroundColor: 'white', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
          >
            Exit Expert Mode
          </button>
        </div>
      )}

      {/* 🟢 TOP BAR */}
      <div style={{ backgroundColor: '#023c34', padding: '12px 24px', display: 'flex', alignItems: 'center', zIndex: 50, position: 'relative', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '250px' }}>
          <img 
            src="/logo.png" 
            alt="ClearPay Logo" 
            style={{ width: '40px', height: '40px', objectFit: 'contain', backgroundColor: 'white', borderRadius: '6px', padding: '4px' }} 
            onError={(e) => { e.target.style.display = 'none'; }} 
          />
          <h1 style={{ color: 'white', fontSize: '18px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', lineHeight: '1.2' }}>
            Riska's<br />Finance
          </h1>
        </div>

        <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '800px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#a7f3d0', fontSize: '16px' }}>🔍</span>
            <input 
              type="text" 
              placeholder="Navigate. Find transactions, contacts, reports, and more." 
              value={globalSearchTerm}
              onChange={(e) => { setGlobalSearchTerm(e.target.value); setShowSearchResults(true); }}
              onFocus={() => setShowSearchResults(true)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 200)} 
              style={{ width: '100%', padding: '10px 16px 10px 42px', borderRadius: '9999px', border: '1px solid #065f46', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
            />
            {showSearchResults && globalSearchTerm.length > 0 && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', maxHeight: '400px', overflowY: 'auto', zIndex: 100, border: '1px solid #e5e7eb' }}>
                {!hasSearchResults && <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>No results found for "{globalSearchTerm}"</div>}
                
                {searchResults.customers.length > 0 && (
                  <div style={{ padding: '10px 0' }}>
                    <div style={{ padding: '4px 16px', fontSize: '11px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Clients</div>
                    {searchResults.customers.map(c => (
                      <div key={`cust-${c.id}`} onClick={() => handleViewProfile(c.id)} style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', flexShrink: 0 }}>
                          {c.firstName?.charAt(0)}{c.lastName?.charAt(0)}
                        </div>
                        <div>
                          <div style={{ color: '#111827', fontSize: '14px', fontWeight: '600' }}>{c.firstName} {c.lastName}</div>
                          {c.companyName && <div style={{ color: '#6b7280', fontSize: '12px' }}>{c.companyName}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {searchResults.customers.length > 0 && searchResults.invoices.length > 0 && <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '4px 0' }}></div>}
                
                {searchResults.invoices.length > 0 && (
                  <div style={{ padding: '10px 0' }}>
                    <div style={{ padding: '4px 16px', fontSize: '11px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invoices</div>
                    {searchResults.invoices.map(inv => (
                      <div key={`inv-${inv.id}`} onClick={() => handleEditInvoice(inv)} style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <div>
                          <div style={{ color: '#111827', fontSize: '14px', fontWeight: '600' }}>{inv.invoiceNumber}</div>
                          <div style={{ color: '#6b7280', fontSize: '12px' }}>{inv.customer ? `${inv.customer.firstName} ${inv.customer.lastName}` : 'Unknown'}</div>
                        </div>
                        <div style={{ color: '#059669', fontSize: '14px', fontWeight: 'bold' }}>${inv.totalAmount.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* 🔥 USER PROFILE IN TOP RIGHT WITH DROPDOWN */}
        <div style={{ width: '250px', display: 'flex', justifyContent: 'flex-end', position: 'relative' }}>
          <div 
            onClick={() => setShowProfileMenu(!showProfileMenu)} 
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '6px 12px', borderRadius: '10px', transition: 'background-color 0.2s', backgroundColor: showProfileMenu ? 'rgba(255, 255, 255, 0.1)' : 'transparent' }}
            onMouseOver={(e) => { if(!showProfileMenu) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}}
            onMouseOut={(e) => { if(!showProfileMenu) e.currentTarget.style.backgroundColor = 'transparent'}}
          >
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'white', fontSize: '14px', fontWeight: '700', lineHeight: '1.2' }}>
                {currentUser?.displayName || 'Business User'}
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'white', color: '#023c34', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '18px', border: '2px solid #065f46', flexShrink: 0 }}>
              {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>

          {showProfileMenu && (
            <div style={{ position: 'absolute', top: '56px', right: '10px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', width: '280px', padding: '24px', zIndex: 100, border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'fadeIn 0.2s ease-out' }}>
              
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#0284c7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold', marginBottom: '12px' }}>
                {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              
              <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#0f172a', fontWeight: '700' }}>
                {currentUser?.displayName || 'Business User'}
              </h3>
              
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
                {currentUser?.email}
              </p>

              {currentUser?.email === 'amarildiriska2@gmail.com' && (
                <button 
                  onClick={() => { setShowProfileMenu(false); setActiveTab('admin'); }} 
                  style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginBottom: '20px', padding: 0 }}
                  onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                  onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                >
                  Go to Expert Portal
                </button>
              )}

              <button 
                onClick={() => { setShowProfileMenu(false); setActiveTab('settings'); }} 
                style={{ width: '100%', padding: '10px', backgroundColor: 'transparent', border: '1px solid #0284c7', color: '#0284c7', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', marginBottom: '12px', transition: 'all 0.2s' }} 
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f0f9ff' }} 
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                Manage your ClearPay Account
              </button>

              <button 
                onClick={() => signOut(auth)} 
                style={{ width: '100%', padding: '10px', backgroundColor: '#f1f5f9', border: 'none', color: '#334155', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }} 
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0' }} 
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9' }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM LAYOUT */}
      <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        
        {/* ⬅️ SIDEBAR NAVIGATION */}
        <div style={{ width: isSidebarCollapsed ? '80px' : '270px', transition: 'width 0.3s ease', backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: isSidebarCollapsed ? '28px 10px' : '28px 20px', flexShrink: 0, zIndex: 10, overflowY: 'auto', overflowX: 'hidden' }}>
          
          <div style={{ padding: '0 8px', marginBottom: '35px', display: 'flex', alignItems: 'center', justifyContent: isSidebarCollapsed ? 'center' : 'space-between' }}>
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: isSidebarCollapsed ? 'pointer' : 'default' }}
              onClick={() => isSidebarCollapsed && setIsSidebarCollapsed(false)}
              title={isSidebarCollapsed ? "Expand Sidebar" : ""}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', fontSize: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)', flexShrink: 0 }}>
                C
              </div>
              {!isSidebarCollapsed && <h1 style={{ color: '#0f172a', fontSize: '26px', fontWeight: '900', margin: 0, letterSpacing: '-0.04em', whiteSpace: 'nowrap' }}>ClearPay</h1>}
            </div>
            
            {!isSidebarCollapsed && (
              <button 
                onClick={() => setIsSidebarCollapsed(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '6px', transition: 'all 0.2s', flexShrink: 0 }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                title="Collapse Sidebar"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
            )}
          </div>
          
          {activeTab !== 'createInvoice' && activeTab !== 'createQuote' && (
            <div style={{ padding: isSidebarCollapsed ? '0' : '0 8px', marginBottom: '35px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => { setInvoiceToEdit(null); setActiveTab('createInvoice'); }} style={{ width: '100%', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', padding: isSidebarCollapsed ? '14px 0' : '14px', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)', transition: 'all 0.2s', letterSpacing: '0.02em' }} onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)'; }} onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)'; }} title={isSidebarCollapsed ? "New Invoice" : ""}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                {!isSidebarCollapsed && "New Invoice"}
              </button>
            </div>
          )}
          
          <nav style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  title={isSidebarCollapsed ? item.label : ""}
                  onClick={() => { setActiveTab(item.id); setInvoiceToEdit(null); setQuoteToEdit(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px', width: '100%', textAlign: 'left',
                    justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                    backgroundColor: isActive ? (item.id === 'admin' ? '#eff6ff' : '#ecfdf5') : 'transparent',
                    border: 'none', fontSize: '15px', fontWeight: isActive ? '700' : '600',
                    color: isActive ? (item.id === 'admin' ? '#1d4ed8' : '#047857') : '#64748b', cursor: 'pointer', padding: isSidebarCollapsed ? '12px 0' : '12px 16px',
                    borderRadius: '10px', transition: 'all 0.2s ease',
                    boxShadow: isActive && !isSidebarCollapsed ? `inset 4px 0 0 ${item.id === 'admin' ? '#2563eb' : '#10b981'}` : 'none'
                  }}
                  onMouseOver={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.color = '#0f172a'; } }}
                  onMouseOut={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; } }}
                >
                  <div style={{ flexShrink: 0, display: 'flex' }}>
                    {item.icon}
                  </div>
                  {!isSidebarCollapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ➡️ MAIN CONTENT AREA */}
        <div style={{ flex: 1, padding: '40px 50px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', flexGrow: 1 }}>

            {activeTab === 'createInvoice' && <CreateInvoice customers={customers} accounts={accounts} onCancel={() => { setActiveTab('invoices'); setInvoiceToEdit(null); }} onSuccess={handleInvoiceSuccess} invoiceToEdit={invoiceToEdit} />}
            
            {activeTab === 'createQuote' && <CreateQuote customers={customers} onCancel={() => { setActiveTab('quotes'); setQuoteToEdit(null); }} onSuccess={handleQuoteSuccess} quoteToEdit={quoteToEdit} />}
            
            {activeTab === 'invoices' && (
              <InvoicesTab 
                invoices={invoices} 
                accounts={accounts} 
                onCreateNew={() => { setInvoiceToEdit(null); setActiveTab('createInvoice'); }} 
                onEdit={handleEditInvoice} 
                onDelete={handleDeleteInvoice} 
                refreshData={fetchData} 
                onSendEmail={(inv) => { setInvoiceToEmail(inv); setActiveTab('sendEmail'); }} 
                onManagePayment={handleManagePayment} 
              />
            )}

            {activeTab === 'managePayment' && invoiceToManage && (
              <ManagePayment 
                invoice={invoiceToManage} 
                onBack={() => { setActiveTab('invoices'); setInvoiceToManage(null); }} 
                onSuccess={() => { setActiveTab('invoices'); setInvoiceToManage(null); fetchData(); }} 
              />
            )}

            {activeTab === 'quotes' && (
              <QuotesTab 
                quotes={quotes} 
                onCreateNew={() => { setQuoteToEdit(null); setActiveTab('createQuote'); }} 
                onEdit={handleEditQuote} 
                onEmail={(quote) => { setQuoteToEmail(quote); setActiveTab('sendQuoteEmail'); }}
                onDelete={handleDeleteQuote} 
                refreshData={fetchData} 
              />
            )}

            {activeTab === 'sendEmail' && invoiceToEmail && (
              <SendInvoiceEmail 
                invoice={invoiceToEmail} 
                onBack={() => { setActiveTab('invoices'); setInvoiceToEmail(null); }} 
                onSend={() => { setActiveTab('invoices'); setInvoiceToEmail(null); }} 
              />
            )}

            {activeTab === 'sendQuoteEmail' && quoteToEmail && (
              <SendQuoteEmail 
                quote={quoteToEmail} 
                onBack={() => { setActiveTab('quotes'); setQuoteToEmail(null); }} 
                onSend={() => { setActiveTab('quotes'); setQuoteToEmail(null); }} 
              />
            )}

            {activeTab === 'customers' && <CustomersTab customers={customers} refreshData={fetchData} onViewProfile={handleViewProfile} />}
            {activeTab === 'clientProfile' && selectedClientId && <ClientProfile clientId={selectedClientId} onBack={() => setActiveTab('customers')} />}
            {activeTab === 'coa' && <ChartOfAccounts accounts={accounts} refreshData={fetchData} />}
            {activeTab === 'reports' && <ReportsTab invoices={invoices} />}
            {activeTab === 'settings' && <SettingsTab />}
            
            {activeTab === 'admin' && (
              <AdminPortal 
                onImpersonate={(email, businessName) => { 
                  setImpersonatedUser({ email, businessName }); 
                  setActiveTab('dashboard'); 
                }} 
              />
            )}

            {/* DASHBOARD OVERVIEW */}
            {activeTab === 'dashboard' && (
              <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                
                {/* Dashboard Header */}
                <div style={{ marginBottom: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <h2 style={{ margin: 0, color: '#0f172a', fontSize: '32px', fontWeight: '800', letterSpacing: '-0.03em' }}>{greeting}, {displayGreetingName}</h2>
                    <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '16px', fontWeight: '400' }}>Here is what's happening with your business today.</p>
                  </div>
                  <div style={{ color: '#475569', fontSize: '14px', fontWeight: '600', backgroundColor: '#ffffff', padding: '10px 18px', borderRadius: '9999px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    {today.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>

                {/* Top Metrics Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '35px' }}>
                  
                  <CardWrapper style={{ padding: '26px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5)' }}>💵</div>
                      <h3 style={{ margin: 0, color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Revenue</h3>
                    </div>
                    <div style={{ fontSize: '34px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.02em' }}>${totalRevenue.toFixed(2)}</div>
                    <div style={{ fontSize: '13px', color: '#059669', marginTop: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '16px' }}>↑</span> All paid invoices
                    </div>
                  </CardWrapper>

                  <CardWrapper style={{ padding: '26px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5)' }}>⏳</div>
                      <h3 style={{ margin: 0, color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Outstanding</h3>
                    </div>
                    <div style={{ fontSize: '34px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.02em' }}>${outstandingBalance.toFixed(2)}</div>
                    <div style={{ fontSize: '13px', color: '#2563eb', marginTop: '10px', fontWeight: '600' }}>Pending payments</div>
                  </CardWrapper>

                  <CardWrapper style={{ padding: '26px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5)' }}>⚠️</div>
                      <h3 style={{ margin: '0', color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Overdue</h3>
                    </div>
                    <div style={{ fontSize: '34px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.02em' }}>{overdueCount}</div>
                    <div style={{ fontSize: '13px', color: '#dc2626', marginTop: '10px', fontWeight: '600' }}>Invoices require action</div>
                  </CardWrapper>

                  <CardWrapper style={{ padding: '26px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5)' }}>👥</div>
                      <h3 style={{ margin: '0', color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Clients</h3>
                    </div>
                    <div style={{ fontSize: '34px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.02em' }}>{totalClients}</div>
                    <div style={{ fontSize: '13px', color: '#7e22ce', marginTop: '10px', fontWeight: '600' }}>Across directory</div>
                  </CardWrapper>
                </div>

                {/* Bottom Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '25px' }}>
                  
                  <CardWrapper style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 28px', borderBottom: '1px solid #f1f5f9' }}>
                      <h3 style={{ color: '#0f172a', margin: 0, fontSize: '18px', fontWeight: '800' }}>Recent Invoices</h3>
                      <button onClick={() => setActiveTab('invoices')} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: '700', fontSize: '14px', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }} onMouseOver={(e) => e.target.style.textDecoration = 'underline'} onMouseOut={(e) => e.target.style.textDecoration = 'none'}>View All &rarr;</button>
                    </div>
                    <div style={{ flexGrow: 1, overflowX: 'auto', padding: '0 10px 10px 10px' }}>
                      {invoices.length === 0 ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '15px' }}>No recent invoices. Click "+ New Invoice" to get started.</div>
                      ) : (
                        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              <th style={{ padding: '16px 20px', fontWeight: '700', borderBottom: '1px solid #f1f5f9' }}>Invoice #</th>
                              <th style={{ padding: '16px 20px', fontWeight: '700', borderBottom: '1px solid #f1f5f9' }}>Customer</th>
                              <th style={{ padding: '16px 20px', fontWeight: '700', borderBottom: '1px solid #f1f5f9' }}>Amount</th>
                              <th style={{ padding: '16px 20px', fontWeight: '700', borderBottom: '1px solid #f1f5f9' }}>Status</th>
                              <th style={{ padding: '16px 20px', fontWeight: '700', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>Document</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoices.slice(0, 6).map(inv => {
                              const isOverdue = new Date(inv.dueDate) < today && inv.status !== 'paid';
                              return (
                                <tr key={inv.id} style={{ transition: 'background-color 0.2s', borderBottom: '1px solid #f8fafc' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                  <td style={{ padding: '16px 20px', fontWeight: '800', color: '#0f172a', fontSize: '14px' }}>{inv.invoiceNumber}</td>
                                  <td style={{ padding: '16px 20px' }}>
                                    {inv.customer ? (
                                      <button onClick={() => handleViewProfile(inv.customer.id)} style={{ background: 'none', border: 'none', color: '#475569', fontWeight: '600', cursor: 'pointer', padding: 0, fontSize: '14px' }} onMouseOver={(e) => e.target.style.color = '#2563eb'} onMouseOut={(e) => e.target.style.color = '#475569'}>
                                        {inv.customer.firstName} {inv.customer.lastName}
                                      </button>
                                    ) : <span style={{ color: '#cbd5e1' }}>Unknown</span>}
                                  </td>
                                  <td style={{ padding: '16px 20px', color: '#0f172a', fontWeight: '700', fontSize: '14px' }}>${inv.totalAmount.toFixed(2)}</td>
                                  <td style={{ padding: '16px 20px' }}>
                                    {inv.status === 'paid' ? (
                                      <span style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '6px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669' }}></div> Paid
                                      </span>
                                    ) : inv.status === 'partially_paid' ? (
                                      <span style={{ backgroundColor: '#fef08a', color: '#065f46', padding: '6px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></div> Partial
                                      </span>
                                    ) : isOverdue ? (
                                      <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '6px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#dc2626' }}></div> Overdue
                                      </span>
                                    ) : (
                                      <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '6px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#d97706' }}></div> Unpaid
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                    <a href={`https://riskaflow.onrender.com/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', color: '#2563eb', textDecoration: 'none', fontWeight: '700', fontSize: '12px', backgroundColor: '#eff6ff', padding: '6px 14px', borderRadius: '6px', border: '1px solid #bfdbfe', transition: 'all 0.2s' }} onMouseOver={(e) => { e.target.style.backgroundColor = '#dbeafe'; e.target.style.borderColor = '#93c5fd'; }} onMouseOut={(e) => { e.target.style.backgroundColor = '#eff6ff'; e.target.style.borderColor = '#bfdbfe'; }}>View PDF</a>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </CardWrapper>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    
                    {/* Quick Actions */}
                    <CardWrapper style={{ padding: '24px' }}>
                      <h3 style={{ color: '#0f172a', margin: '0 0 18px 0', fontSize: '16px', fontWeight: '800' }}>Quick Actions</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button onClick={() => { setInvoiceToEdit(null); setActiveTab('createInvoice'); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', color: '#334155', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.backgroundColor = '#ecfdf5'; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}>
                          <div style={{ backgroundColor: 'white', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: '18px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>+</div> Create Invoice
                        </button>
                        <button onClick={() => { setQuoteToEdit(null); setActiveTab('createQuote'); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', color: '#334155', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.backgroundColor = '#f5f3ff'; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}>
                          <div style={{ backgroundColor: 'white', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', fontSize: '18px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>📄</div> Create Quote
                        </button>
                        <button onClick={() => setActiveTab('customers')} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', color: '#334155', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.backgroundColor = '#eff6ff'; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}>
                          <div style={{ backgroundColor: 'white', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontSize: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>👥</div> Manage Clients
                        </button>
                      </div>
                    </CardWrapper>

                    {/* Clients Overview */}
                    <CardWrapper style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                      <div style={{ padding: '22px 24px 12px 24px' }}>
                        <h3 style={{ color: '#0f172a', margin: 0, fontSize: '16px', fontWeight: '800' }}>Clients Overview</h3>
                      </div>
                      <ul style={{ listStyleType: 'none', padding: '0 12px', margin: 0, flexGrow: 1 }}>
                        {customers.length === 0 ? (
                          <li style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>No clients added yet.</li>
                        ) : (
                          customers.slice(0, 4).map(customer => {
                            const initials = `${customer.firstName?.charAt(0) || ''}${customer.lastName?.charAt(0) || ''}`.toUpperCase();
                            return (
                              <li key={customer.id}>
                                <button onClick={() => handleViewProfile(customer.id)} style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'none', border: 'none', cursor: 'pointer', padding: '12px', textAlign: 'left', width: '100%', borderRadius: '8px', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '13px', border: '1px solid #bfdbfe', flexShrink: 0 }}>
                                    {initials}
                                  </div>
                                  <div style={{ flexGrow: 1 }}>
                                    <strong style={{ color: '#0f172a', fontSize: '14px', display: 'block', fontWeight: '700' }}>{customer.firstName} {customer.lastName}</strong>
                                    <span style={{ color: '#64748b', fontSize: '12px', display: 'block' }}>{customer.companyName || 'Individual'}</span>
                                  </div>
                                </button>
                              </li>
                            );
                          })
                        )}
                      </ul>
                      <div style={{ padding: '16px', borderTop: '1px solid #f1f5f9', marginTop: 'auto' }}>
                        <button onClick={() => setActiveTab('customers')} style={{ width: '100%', padding: '10px', backgroundColor: 'transparent', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', color: '#475569', fontWeight: '700', fontSize: '13px', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.color = '#0f172a'; }} onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#475569'; }}>
                          View Directory
                        </button>
                      </div>
                    </CardWrapper>

                  </div>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div style={{ textAlign: 'center', padding: '40px 0 20px 0', marginTop: 'auto', color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>
            © 2026 Riska's Finance. All Rights Reserved.<br />
            <a href="https://www.riskasfinance.com" target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8', textDecoration: 'none' }}>www.riskasfinance.com</a>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;