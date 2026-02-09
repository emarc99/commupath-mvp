import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';

// Types
export interface User {
    id: string;
    username: string;
    points: number;
    completedQuests: number;
    impactLevel: string;
}

export interface Quest {
    quest_id: string;
    title: string;
    description: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    impact_metric: string;
    location: {
        lat: number;
        lng: number;
        name?: string;  // NEW: Location name from Google Maps
        address?: string;  // NEW: Full address from Google Maps
    };
    status: 'Active' | 'In Progress' | 'Completed';
    category: 'Environment' | 'Social' | 'Education' | 'Health';
    estimated_time?: string;
    community_benefit?: string;
}

export interface LeaderboardEntry {
    rank: number;
    username: string;
    points: number;
    completedQuests: number;
    impactLevel: string;
}

interface AppState {
    user: User;
    quests: Quest[];
    leaderboard: LeaderboardEntry[];
    setUser: (user: User) => void;
    addQuest: (quest: Quest) => void;
    updateQuestStatus: (questId: string, status: Quest['status']) => void;
    addPoints: (points: number) => void;
    updateLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

// Mock quests
// const mockQuests: Quest[] = [
//     {
//         quest_id: '1',
//         title: 'Clean Up Bodija Park',
//         description: 'Organize a community cleanup of Bodija Park. Collect litter, trim overgrown bushes, and restore the playground area.',
//         difficulty: 'Medium',
//         impact_metric: 'Clean 500 sq meters of public space',
//         location: { lat: 7.4336, lng: 3.9057 },
//         status: 'Active',
//         category: 'Environment',
//         estimated_time: '3 hours',
//         community_benefit: 'Improved recreational space for 200+ families',
//     },
//     {
//         quest_id: '2',
//         title: 'Tutor Students at Agbowo',
//         description: 'Provide free math tutoring to secondary school students in Agbowo community.',
//         difficulty: 'Easy',
//         impact_metric: 'Tutor 10 students',
//         location: { lat: 7.4453, lng: 3.9167 },
//         status: 'In Progress',
//         category: 'Education',
//         estimated_time: '2 hours/week',
//         community_benefit: 'Improved academic performance for local youth',
//     },
// ];

const mockLeaderboard: LeaderboardEntry[] = [
    { rank: 1, username: 'EcoWarrior2024', points: 1250, completedQuests: 25, impactLevel: 'Legend' },
    { rank: 2, username: 'SocialBridge', points: 980, completedQuests: 19, impactLevel: 'Hero' },
    { rank: 3, username: 'EduMentor', points: 875, completedQuests: 17, impactLevel: 'Hero' },
    { rank: 4, username: 'GreenThumb', points: 280, completedQuests: 5, impactLevel: 'Novice' },
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const authContext = useAuth();
    const [user, setUser] = useState<User>({
        id: '1',
        username: 'CommunityHero',
        points: 350,
        completedQuests: 7,
        impactLevel: 'Rising Star',
    });
    // const [quests, setQuests] = useState<Quest[]>(mockQuests);
    const [quests, setQuests] = useState<Quest[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(mockLeaderboard);

    // Sync with auth user when they log in
    useEffect(() => {
        if (authContext.user) {
            setUser(prev => ({
                ...prev,
                id: authContext.user!.id,
                username: authContext.user!.username,
            }));
        }
    }, [authContext.user]);

    const addQuest = (quest: Quest) => {
        setQuests([...quests, quest]);
    };

    const updateQuestStatus = (questId: string, status: Quest['status']) => {
        setQuests(quests.map(q => q.quest_id === questId ? { ...q, status } : q));
    };

    const addPoints = (points: number) => {
        setUser({
            ...user,
            points: user.points + points,
            completedQuests: user.completedQuests + 1,
        });
    };

    const updateLeaderboard = (newLeaderboard: LeaderboardEntry[]) => {
        setLeaderboard(newLeaderboard);
    };

    return (
        <AppContext.Provider
            value={{
                user,
                quests,
                leaderboard,
                setUser,
                addQuest,
                updateQuestStatus,
                addPoints,
                updateLeaderboard,
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};
