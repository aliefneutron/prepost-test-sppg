
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserScore, TestType } from '../types';
import { IconHome } from '../components/icons';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [scores, setScores] = useState<UserScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TestType>(TestType.PRE_TEST);

  useEffect(() => {
    const q = query(collection(db, 'scores'), orderBy('score', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const scoresData: UserScore[] = [];
      querySnapshot.forEach((doc) => {
        scoresData.push({ id: doc.id, ...doc.data() } as UserScore);
      });
      setScores(scoresData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredAndSortedScores = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

    return scores
      .filter(score => {
        const isToday = score.timestamp >= startOfToday && score.timestamp < endOfToday;
        if (!isToday || score.testType !== activeTab) return false;
        if (activeTab === TestType.POST_TEST && score.score < 80) return false;
        return true;
      })
      .sort((a, b) => b.score - a.score || a.timestamp - b.timestamp);
  }, [scores, activeTab]);

  const getTrophyColor = (index: number) => {
    if (index === 0) return 'text-yellow-400';
    if (index === 1) return 'text-gray-400';
    if (index === 2) return 'text-yellow-600';
    return 'text-gray-300';
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-gray-800">
            Leaderboard <span className="text-blue-600 text-lg align-middle bg-blue-50 px-3 py-1 rounded-full ml-2 border border-blue-200">Hari Ini</span>
          </h1>
           <button onClick={() => navigate('/')} className="flex items-center gap-2 bg-white text-gray-700 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
            <IconHome className="w-5 h-5" />
            Home
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex border-b border-gray-200 mb-4">
            <button
              onClick={() => setActiveTab(TestType.PRE_TEST)}
              className={`py-3 px-6 font-semibold text-lg transition-colors ${
                activeTab === TestType.PRE_TEST
                  ? 'border-b-4 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-blue-500'
              }`}
            >
              Pre-Test
            </button>
            <button
              onClick={() => setActiveTab(TestType.POST_TEST)}
              className={`py-3 px-6 font-semibold text-lg transition-colors ${
                activeTab === TestType.POST_TEST
                  ? 'border-b-4 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-blue-500'
              }`}
            >
              Post-Test
            </button>
          </div>

          <div className="overflow-x-auto">
            {filteredAndSortedScores.length > 0 ? (
              <table className="w-full text-left">
                <thead className="border-b-2 border-gray-200">
                  <tr>
                    <th className="p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Rank</th>
                    <th className="p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedScores.map((score, index) => (
                    <tr key={score.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                      <td className="p-4 font-bold text-gray-700">
                        <div className="flex items-center gap-3">
                          <span className={`text-2xl ${getTrophyColor(index)}`}>
                            {index < 3 ? '🏆' : `${index + 1}`}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 font-medium text-gray-800">{score.name}</td>
                      <td className="p-4 font-bold text-blue-600">{score.score}</td>
                      <td className="p-4 text-gray-500 text-sm">{new Date(score.timestamp).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-16">
                <p className="text-xl text-gray-500">No scores yet for this test.</p>
                <p className="text-gray-400 mt-2">Be the first to take the {activeTab.replace('-', ' ')}!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
