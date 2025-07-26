'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SecurityDashboard from '@/components/SecurityDashboard';
import { 
  Users, 
  Shield, 
  Activity, 
  Database, 
  AlertTriangle,
  Eye,
  Ban,
  Settings,
  BarChart3,
  Server,
  Clock,
  UserCheck,
  UserX,
  Gamepad2,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalGames: number;
  activeGames: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  serverUptime: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface GameRoom {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  isStarted: boolean;
  createdAt: Date;
  hostName: string;
}

interface UserData {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  lastLogin: Date;
  gamesPlayed: number;
  isBanned: boolean;
  createdAt: Date;
}

interface SystemLog {
  id: number;
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  category: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalGames: 0,
    activeGames: 0,
    systemHealth: 'healthy',
    serverUptime: 0,
    memoryUsage: 0,
    cpuUsage: 0
  });
  const [gameRooms, setGameRooms] = useState<GameRoom[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    loadAdminData();
    const interval = setInterval(loadAdminData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      // Load all admin data
      const [statsRes, gamesRes, usersRes, logsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/games'),
        fetch('/api/admin/users'),
        fetch('/api/admin/logs')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (gamesRes.ok) {
        const gamesData = await gamesRes.json();
        setGameRooms(gamesData.rooms || []);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setSystemLogs(logsData.logs || []);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
      });
      
      if (response.ok) {
        await loadAdminData();
      }
    } catch (error) {
      console.error('Error banning user:', error);
    }
  };

  const handleUnbanUser = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/unban`, {
        method: 'POST',
      });
      
      if (response.ok) {
        await loadAdminData();
      }
    } catch (error) {
      console.error('Error unbanning user:', error);
    }
  };

  const handleKillGame = async (roomId: string) => {
    try {
      const response = await fetch(`/api/admin/games/${roomId}/kill`, {
        method: 'POST',
      });
      
      if (response.ok) {
        await loadAdminData();
      }
    } catch (error) {
      console.error('Error killing game:', error);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'info': return 'text-blue-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mb-4"></div>
          <p className="text-white text-xl font-mono">LOADING_ADMIN_PANEL...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-black text-white border-white">
              <Shield className="w-4 h-4 mr-1" />
              ADMIN_CONTROL
            </Badge>
            <h1 className="text-3xl font-bold">[SYSTEM_DASHBOARD]</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${getHealthColor(stats.systemHealth)}`}>
              <Activity className="w-4 h-4" />
              <span className="text-sm font-medium">
                {stats.systemHealth.toUpperCase()}
              </span>
            </div>
            <Button 
              variant="outline" 
              onClick={loadAdminData}
              className="bg-black text-white border-white hover:bg-white hover:text-black"
            >
              REFRESH
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">TOTAL_USERS</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">ACTIVE_USERS</p>
                  <p className="text-2xl font-bold text-green-500">{stats.activeUsers}</p>
                </div>
                <UserCheck className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">ACTIVE_GAMES</p>
                  <p className="text-2xl font-bold text-yellow-500">{stats.activeGames}</p>
                </div>
                <Gamepad2 className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">UPTIME</p>
                  <p className="text-lg font-bold">{formatUptime(stats.serverUptime)}</p>
                </div>
                <Clock className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-gray-900 border-gray-700">
            <TabsTrigger value="overview" className="text-white">OVERVIEW</TabsTrigger>
            <TabsTrigger value="users" className="text-white">USERS</TabsTrigger>
            <TabsTrigger value="games" className="text-white">GAMES</TabsTrigger>
            <TabsTrigger value="logs" className="text-white">LOGS</TabsTrigger>
            <TabsTrigger value="security" className="text-white">SECURITY</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* System Health */}
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    SYSTEM_HEALTH
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Memory Usage</span>
                      <span className="font-mono">{stats.memoryUsage}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${stats.memoryUsage}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">CPU Usage</span>
                      <span className="font-mono">{stats.cpuUsage}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${stats.cpuUsage}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    RECENT_ACTIVITY
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {systemLogs.slice(0, 5).map((log) => (
                      <div key={log.id} className="flex items-center justify-between text-sm">
                        <span className={getLogLevelColor(log.level)}>
                          {log.level.toUpperCase()}
                        </span>
                        <span className="text-gray-400 truncate mx-2">
                          {log.message}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    USER_MANAGEMENT
                  </div>
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm bg-black border-gray-700 text-white"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {user.isActive ? (
                            <UserCheck className="w-5 h-5 text-green-500" />
                          ) : (
                            <UserX className="w-5 h-5 text-gray-500" />
                          )}
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-gray-400">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {user.isBanned && (
                            <Badge variant="destructive" className="text-xs">
                              BANNED
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {user.gamesPlayed} GAMES
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">
                          {formatDate(user.lastLogin)}
                        </span>
                        {user.isBanned ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnbanUser(user.id)}
                            className="bg-green-900 text-green-100 border-green-700 hover:bg-green-800"
                          >
                            UNBAN
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBanUser(user.id)}
                            className="bg-red-900 text-red-100 border-red-700 hover:bg-red-800"
                          >
                            BAN
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="games" className="mt-6">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5" />
                  GAME_MONITORING
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {gameRooms.map((room) => (
                    <div key={room.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${room.isStarted ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                          <div>
                            <p className="font-medium">{room.name}</p>
                            <p className="text-sm text-gray-400">Host: {room.hostName}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs">
                            {room.playerCount}/{room.maxPlayers} PLAYERS
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {room.isStarted ? 'ACTIVE' : 'WAITING'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">
                          {formatDate(room.createdAt)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleKillGame(room.id)}
                          className="bg-red-900 text-red-100 border-red-700 hover:bg-red-800"
                        >
                          KILL
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="mt-6">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  SYSTEM_LOGS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {systemLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-gray-800 rounded text-sm">
                      <div className="flex items-center gap-3">
                        <span className={`font-medium ${getLogLevelColor(log.level)}`}>
                          [{log.level.toUpperCase()}]
                        </span>
                        <span className="text-gray-400">{log.category}</span>
                        <span className="text-white">{log.message}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDate(log.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <SecurityDashboard showAdvanced={true} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}