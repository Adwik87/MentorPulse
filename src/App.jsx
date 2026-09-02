import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import Header from './components/Header';
import MentorDashboard from './components/MentorDashboard';
import MenteeDashboard from './components/MenteeDashboard';
import CoordinatorDashboard from './components/CoordinatorDashboard';
import AdminDashboard from './components/AdminDashboard';
import SessionCalendar from './components/SessionCalendar';
import MenteeProfile from './components/MenteeProfile';
import CheckinModal from './components/CheckinModal';
import MomModal from './components/MomModal';
import ScheduleModal from './components/ScheduleModal';

export default function App() {
  const { role, activeTab } = useApp();
  const [selectedMenteeId, setSelectedMenteeId] = useState(null);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [momSession, setMomSession] = useState(null);

  const handleSelectMentee = (menteeId) => {
    setSelectedMenteeId(menteeId);
  };

  const handleBackToDashboard = () => {
    setSelectedMenteeId(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-800">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {selectedMenteeId ? (
          <MenteeProfile menteeId={selectedMenteeId} onBack={handleBackToDashboard} />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <>
                {role === 'mentor' && (
                  <MentorDashboard
                    onSelectMentee={handleSelectMentee}
                    onOpenCheckin={() => setShowCheckinModal(true)}
                    onOpenScheduleModal={() => setShowScheduleModal(true)}
                    onOpenMomModal={(session) => setMomSession(session)}
                  />
                )}
                {role === 'mentee' && (
                  <MenteeDashboard
                    onOpenFeedbackModal={(session) => setMomSession(session)}
                    onOpenCheckin={() => setShowCheckinModal(true)}
                  />
                )}
                {role === 'coordinator' && <CoordinatorDashboard />}
                {role === 'admin' && <AdminDashboard />}
              </>
            )}

            {activeTab === 'calendar' && (
              <SessionCalendar
                onOpenScheduleModal={() => setShowScheduleModal(true)}
                onOpenCheckin={() => setShowCheckinModal(true)}
                onOpenMomModal={(session) => setMomSession(session)}
              />
            )}

            {activeTab === 'goals' && (
              <>
                {role === 'mentor' ? (
                  <MentorDashboard
                    onSelectMentee={handleSelectMentee}
                    onOpenCheckin={() => setShowCheckinModal(true)}
                    onOpenScheduleModal={() => setShowScheduleModal(true)}
                    onOpenMomModal={(session) => setMomSession(session)}
                  />
                ) : (
                  <MenteeDashboard
                    onOpenFeedbackModal={(session) => setMomSession(session)}
                    onOpenCheckin={() => setShowCheckinModal(true)}
                  />
                )}
              </>
            )}

            {activeTab === 'analytics' && <CoordinatorDashboard />}

            {activeTab === 'audit' && <AdminDashboard />}
          </>
        )}
      </main>

      {/* Global Modals */}
      {showCheckinModal && (
        <CheckinModal
          onClose={() => setShowCheckinModal(false)}
          onSuccess={() => setShowCheckinModal(false)}
        />
      )}

      {showScheduleModal && (
        <ScheduleModal
          onClose={() => setShowScheduleModal(false)}
          onSuccess={() => setShowScheduleModal(false)}
        />
      )}

      {momSession && (
        <MomModal
          session={momSession}
          onClose={() => setMomSession(null)}
          onSuccess={() => setMomSession(null)}
        />
      )}
    </div>
  );
}
