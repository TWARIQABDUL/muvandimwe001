import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../store/authStore.js';
import PasswordChangeModal from '../components/PasswordChangeModal.jsx';
import DashboardLayout from '../components/DashboardLayout.jsx';

import ManagerCheckinFlow from '../components/manager/ManagerCheckinFlow.jsx';
import PendingRenewals from '../components/manager/PendingRenewals.jsx';
import SubscriberActivity from '../components/manager/SubscriberActivity.jsx';
import RegisterNewMember from '../components/manager/RegisterNewMember.jsx';

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('checkin');
  const [showPasswordModal, setShowPasswordModal] = useState(user?.first_login === 1);
  const [dashboardData, setDashboardData] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Check-in state
  const [qrCode, setQrCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [memberLookup, setMemberLookup] = useState(null);
  const [memberService, setMemberService] = useState('gym');
  const [walkInName, setWalkInName] = useState('');
  const [walkInServices, setWalkInServices] = useState(['gym']);
  const [walkInAmount, setWalkInAmount] = useState('15000');

  // Registration state
  const [newMember, setNewMember] = useState({ name: '', email: '', phone: '' });
  const [selectedServices, setSelectedServices] = useState(['gym']);
  const [isCard, setIsCard] = useState(false);
  const [taps, setTaps] = useState(20);
  const [coupon, setCoupon] = useState('');
  const [newMemberQr, setNewMemberQr] = useState(null);

  useEffect(() => {
    if (user?.first_login === 1) setShowPasswordModal(true);
  }, [user]);

  useEffect(() => {
    fetchDashboard();
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await api.get('/services');
      console.log('API Response for /services:', response.data);
      const data = response.data.services || [];
      console.log('Extracted services data:', data);
      setServices(data);
      if (data.length > 0) {
        const gymService = data.find(s => s.name === 'gym');
        if (gymService) {
          setWalkInServices(['gym']);
          setWalkInAmount(gymService.price_daily.toString());
        } else {
          setWalkInServices([data[0].name]);
          setWalkInAmount(data[0].price_daily.toString());
        }
      }
    } catch (err) {
      console.warn('Could not load services:', err.message || err);
    }
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/dashboard/today');
      setDashboardData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load manager dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Handlers for Check-in flow
  const handleLookupQr = async (e) => {
    e.preventDefault();
    setMessage(null);
    setMemberLookup(null);
    setSearchResults([]);
    setError(null);

    if (!qrCode.trim()) {
      setError('Please enter a QR code value');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/members/scan-qr', { qr_code_id: qrCode.trim() });
      setMemberLookup(response.data.member);
      setMemberService(response.data.member.allowed_services?.[0] || 'gym');
    } catch (err) {
      setError(err.response?.data?.error || 'Member lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchName = async (e) => {
    e.preventDefault();
    setMessage(null);
    setMemberLookup(null);
    setSearchResults([]);
    setError(null);

    if (searchQuery.length < 2) {
      setError('Search query must be at least 2 characters');
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/members/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(response.data.members);
      if (response.data.members.length === 0) {
        setError('No members found');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSearchResult = (member) => {
    setMemberLookup(member);
    setMemberService(member.allowed_services?.[0] || 'gym');
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleCheckinMember = async (e) => {
    e.preventDefault();
    if (!memberLookup) return;

    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      await api.post('/checkins', {
        member_id: memberLookup.id,
        type: 'subscription',
        service: memberService
      });
      setMessage(`${memberLookup.name} checked in to ${memberService}`);
      setMemberLookup(null);
      setQrCode('');
      fetchDashboard();
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to check in member');
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckinWalkIn = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!walkInName.trim()) {
      setError('Please enter the walk-in name');
      return;
    }
    
    if (walkInServices.length === 0) {
      setError('Please select at least one service');
      return;
    }

    const amountValue = Number(walkInAmount);
    if (!amountValue || amountValue <= 0) {
      setError('Enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      await api.post('/checkins', {
        member_name: walkInName.trim(),
        type: 'walk_in',
        service: walkInServices.join(', '),
        amount: amountValue
      });
      setMessage(`${walkInName.trim()} checked in as walk-in for ${walkInServices.join(', ')}`);
      setWalkInName('');
      setWalkInServices(['gym']);
      const selected = services.find(s => s.name === 'gym');
      setWalkInAmount(selected ? selected.price_daily.toString() : '15000');
      fetchDashboard();
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create walk-in check-in');
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  // Handlers for Registration
  const handleCreateMember = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setNewMemberQr(null);

    if (!newMember.name.trim()) {
      setError('Name is required');
      return;
    }
    if (selectedServices.length === 0) {
      setError('Please select at least one service');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/members', {
        name: newMember.name.trim(),
        email: newMember.email.trim() || null,
        phone: newMember.phone.trim() || null,
        services: selectedServices,
        is_card: isCard ? 1 : 0,
        taps: isCard ? Number(taps) : null,
        coupon: coupon || null
      });

      setMessage(`${response.data.name} registered successfully`);
      setNewMemberQr(response.data.qr_code_id);
      setNewMember({ name: '', email: '', phone: '' });
      setSelectedServices(['gym']);
      setIsCard(false);
      setTaps(20);
      setCoupon('');
      fetchDashboard();
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register member');
    } finally {
      setLoading(false);
    }
  };

  // Handlers for Renewal
  const handleRenewal = async (memberId) => {
    setError(null);
    setMessage(null);
    try {
      setLoading(true);
      const response = await api.post(`/members/${memberId}/subscriptions/renew`);
      setMessage(response.data.message || 'Subscription renewed');
      fetchDashboard();
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Renewal failed');
    } finally {
      setLoading(false);
    }
  };

  // Live pricing calculator for registration preview
  const calculateLivePrice = () => {
    let sum = 0;
    selectedServices.forEach(sName => {
      const s = services.find(serv => serv.name === sName);
      if (s) sum += Number(s.price_monthly) || 0;
    });

    let discountPct = 0;
    const cleanCoupon = coupon.trim().toUpperCase();
    if (cleanCoupon === '10OFF') discountPct = 10;
    else if (cleanCoupon === '15OFF') discountPct = 15;
    else if (cleanCoupon === '20OFF') discountPct = 20;

    const discountAmt = Math.round(sum * (discountPct / 100));
    const finalAmt = sum - discountAmt;
    return { sum, discountPct, discountAmt, finalAmt };
  };

  const pricing = calculateLivePrice();

  if (!user) return null;

  const tabs = [
    { id: 'checkin', label: 'Check-in Portal' },
    { id: 'register', label: 'Register New Member' },
    { id: 'renewals', label: 'Pending Renewals' },
    { id: 'activity', label: 'Subscriber Activity' }
  ];

  return (
    <>
      {showPasswordModal && (
        <PasswordChangeModal onClose={() => setShowPasswordModal(false)} />
      )}
      <DashboardLayout tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab}>
        {message && <div className="alert alert-success" style={{ marginBottom: '20px' }}>{message}</div>}
        {error && <div className="alert alert-error" style={{ marginBottom: '20px' }}>{error}</div>}

        {loading && activeTab !== 'checkin' && activeTab !== 'register' ? (
          <div className="card text-center" style={{ padding: '60px 20px' }}>
            <div className="spinner"></div>
            <p style={{ marginTop: '10px' }}>Loading data...</p>
          </div>
        ) : (
          <>
            {activeTab === 'checkin' && (
              <ManagerCheckinFlow
                services={services}
                dashboardData={dashboardData}
                handleCheckinWalkIn={handleCheckinWalkIn}
                handleLookupQr={handleLookupQr}
                handleSearchName={handleSearchName}
                handleSelectSearchResult={handleSelectSearchResult}
                handleCheckinMember={handleCheckinMember}
                qrCode={qrCode}
                setQrCode={setQrCode}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchResults={searchResults}
                memberLookup={memberLookup}
                memberService={memberService}
                setMemberService={setMemberService}
                walkInName={walkInName}
                setWalkInName={setWalkInName}
                walkInServices={walkInServices}
                setWalkInServices={setWalkInServices}
                walkInAmount={walkInAmount}
                setWalkInAmount={setWalkInAmount}
                loading={loading}
              />
            )}

            {activeTab === 'register' && (
              <RegisterNewMember
                services={services}
                newMember={newMember}
                setNewMember={setNewMember}
                selectedServices={selectedServices}
                setSelectedServices={setSelectedServices}
                isCard={isCard}
                setIsCard={setIsCard}
                taps={taps}
                setTaps={setTaps}
                coupon={coupon}
                setCoupon={setCoupon}
                pricing={pricing}
                handleCreateMember={handleCreateMember}
                loading={loading}
                newMemberQr={newMemberQr}
              />
            )}

            {activeTab === 'renewals' && (
              <PendingRenewals
                dashboardData={dashboardData}
                handleRenewal={handleRenewal}
                loading={loading}
              />
            )}

            {activeTab === 'activity' && (
              <SubscriberActivity dashboardData={dashboardData} />
            )}
          </>
        )}
      </DashboardLayout>
    </>
  );
}
