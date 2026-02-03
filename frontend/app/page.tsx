'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import LandingScreen from '@/components/LandingScreen';
import VerificationScreen from '@/components/VerificationScreen';
import ProfileScreen from '@/components/ProfileScreen';
import DashboardScreen from '@/components/DashboardScreen';
import QueueScreen from '@/components/QueueScreen';
import ChatScreen from '@/components/ChatScreen';
import ReportModal from '@/components/ReportModal';
import ToastContainer, { useToast } from '@/components/ToastContainer';
import DeviceIdDisplay from '@/components/DeviceIdDisplay';
import { getDeviceIdHash } from '@/lib/deviceFingerprint';
import { register, submitReport, WebSocketManager } from '@/lib/api';

type Screen = 'landing' | 'verification' | 'profile' | 'dashboard' | 'queue' | 'chat';

interface UserData {
  nickname: string;
  karma_score: number;
  daily_matches_remaining: number;
  gender: string;
  is_verified: boolean;
}

interface PartnerData {
  nickname: string;
  device_id?: string;
}

interface Message {
  content: string;
  type: 'sent' | 'received';
  timestamp: string;
}

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [verifiedGender, setVerifiedGender] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('any');
  const [isLoading, setIsLoading] = useState(false);
  const [partner, setPartner] = useState<PartnerData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [deviceId, setDeviceId] = useState('');

  const wsManagerRef = useRef<WebSocketManager | null>(null);
  const { toasts, showToast, removeToast } = useToast();

  // Initialize app
  useEffect(() => {
    const init = async () => {
      const id = await getDeviceIdHash();
      setDeviceId(id);

      // Store in localStorage for components that need it
      if (typeof window !== 'undefined') {
        localStorage.setItem('controlled_anonymity_device_id', id);
      }

      try {
        const user = await register() as any;
        setUserData(user);

        if (user.is_verified && user.nickname) {
          setCurrentScreen('dashboard');
        } else if (user.is_verified) {
          setVerifiedGender(user.gender);
          setCurrentScreen('profile');
        }
      } catch (e) {
        console.log('New user, starting fresh');
      }
    };

    init();
  }, []);

  // Setup WebSocket handlers
  const setupWebSocketHandlers = useCallback((wsManager: WebSocketManager) => {
    wsManager.on('connected', () => {
      console.log('✅ WS Connected');
    });

    wsManager.on('queued', () => {
      console.log('📋 Added to queue');
    });

    wsManager.on('match_found', (data: any) => {
      console.log('🎉 Match found!', data);
      setPartner(data.partner);
      setMessages([]);
      setCurrentScreen('chat');
      showToast('success', `Connected with ${data.partner.nickname}!`);
    });

    wsManager.on('message', (data: any) => {
      console.log('💬 Message received:', data);
      setMessages(prev => [...prev, {
        content: data.content,
        type: 'received',
        timestamp: new Date(data.timestamp || Date.now()).toLocaleTimeString()
      }]);
    });

    wsManager.on('partner_left', () => {
      console.log('👋 Partner left');
      showToast('warning', 'Your partner left the chat');
      setCurrentScreen('dashboard');
    });

    wsManager.on('chat_ended', () => {
      console.log('🔚 Chat ended');
      setCurrentScreen('dashboard');
    });

    wsManager.on('error', (data: any) => {
      console.error('❌ WS Error:', data);
      showToast('error', data.message);
    });
  }, [showToast]);

  // Handle screen transitions
  const handleGetStarted = () => {
    setCurrentScreen('verification');
  };

  const handleBackToLanding = () => {
    setCurrentScreen('landing');
  };

  const handleVerified = async (gender: string) => {
    setVerifiedGender(gender);
    showToast('success', `Verified as ${gender}! Image deleted.`);

    // Refresh user data
    try {
      const user = await register() as any;
      setUserData(user);
    } catch (e) {
      // Ignore
    }

    setCurrentScreen('profile');
  };

  const handleProfileComplete = async (nickname: string, bio: string) => {
    showToast('success', 'Profile saved!');

    // Refresh user data
    try {
      const user = await register() as any;
      setUserData({
        ...user,
        nickname,
      });
    } catch (e) {
      // Ignore
    }

    setCurrentScreen('dashboard');
  };

  const handleFindMatch = async (filter: string) => {
    console.log('🔍 Finding match with filter:', filter);
    console.log('📱 Device ID:', deviceId.substring(0, 16) + '...');

    setSelectedFilter(filter);
    setIsLoading(true);

    try {
      if (!wsManagerRef.current) {
        console.log('🔌 Creating new WebSocket manager');
        wsManagerRef.current = new WebSocketManager(deviceId);
        setupWebSocketHandlers(wsManagerRef.current);
      }

      console.log('🔗 Connecting to WebSocket...');
      await wsManagerRef.current.connect();
      console.log('✅ WebSocket connected, joining queue...');
      wsManagerRef.current.joinQueue(filter);
      setCurrentScreen('queue');
    } catch (e) {
      console.error('❌ Connection failed:', e);
      showToast('error', 'Connection failed. Is the server running?');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelQueue = () => {
    wsManagerRef.current?.leaveQueue();
    setCurrentScreen('dashboard');
  };

  const handleSendMessage = (content: string) => {
    if (!wsManagerRef.current) return;

    wsManagerRef.current.sendMessage(content);
    setMessages(prev => [...prev, {
      content,
      type: 'sent',
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const handleLeaveChat = () => {
    wsManagerRef.current?.leaveChat();
    setCurrentScreen('dashboard');
  };

  const handleNextMatch = () => {
    wsManagerRef.current?.nextMatch(selectedFilter);
    setCurrentScreen('queue');
  };

  const handleOpenReport = () => {
    setIsReportModalOpen(true);
  };

  const handleCloseReport = () => {
    setIsReportModalOpen(false);
  };

  const handleSubmitReport = async (reason: string, details: string) => {
    try {
      await submitReport(partner?.device_id || 'unknown', `${reason}: ${details}`);
      showToast('success', 'Report submitted. Thank you.');
      setIsReportModalOpen(false);
      handleLeaveChat();
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  const handleError = (message: string) => {
    showToast('error', message);
  };

  return (
    <div id="app">
      {currentScreen === 'landing' && (
        <LandingScreen onGetStarted={handleGetStarted} />
      )}

      {currentScreen === 'verification' && (
        <VerificationScreen
          onBack={handleBackToLanding}
          onVerified={handleVerified}
          onError={handleError}
        />
      )}

      {currentScreen === 'profile' && (
        <ProfileScreen
          verifiedGender={verifiedGender}
          onProfileComplete={handleProfileComplete}
          onError={handleError}
        />
      )}

      {currentScreen === 'dashboard' && userData && (
        <DashboardScreen
          userData={userData}
          onFindMatch={handleFindMatch}
          isLoading={isLoading}
        />
      )}

      {currentScreen === 'queue' && (
        <QueueScreen
          filter={selectedFilter}
          onCancel={handleCancelQueue}
        />
      )}

      {currentScreen === 'chat' && partner && (
        <ChatScreen
          partner={partner}
          messages={messages}
          onSendMessage={handleSendMessage}
          onLeave={handleLeaveChat}
          onNext={handleNextMatch}
          onReport={handleOpenReport}
        />
      )}

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={handleCloseReport}
        onSubmit={handleSubmitReport}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Debug: Show device ID */}
      <DeviceIdDisplay />
    </div>
  );
}
