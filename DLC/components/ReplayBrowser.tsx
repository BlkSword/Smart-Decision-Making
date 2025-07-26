'use client';

import { useState, useEffect } from 'react';
import { ReplayMetadata, ReplayFilter, ReplaySearchParams } from '@/lib/game/replayTypes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Play, 
  Clock, 
  Users, 
  Trophy, 
  Filter,
  Calendar,
  BarChart3,
  Eye,
  Download,
  Trash2
} from 'lucide-react';

interface ReplayBrowserProps {
  onPlayReplay: (replayId: string) => void;
  onClose: () => void;
  showAnalytics?: boolean;
}

export default function ReplayBrowser({ onPlayReplay, onClose, showAnalytics = false }: ReplayBrowserProps) {
  const [replays, setReplays] = useState<ReplayMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<ReplaySearchParams>({
    filter: ReplayFilter.ALL,
    sortBy: 'recent',
    limit: 20,
    offset: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<ReplayFilter>(ReplayFilter.ALL);
  const [showFilters, setShowFilters] = useState(false);

  // Load replays
  useEffect(() => {
    loadReplays();
  }, [searchParams]);

  const loadReplays = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/replays/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchParams),
      });

      if (response.ok) {
        const data = await response.json();
        setReplays(data.replays || []);
      }
    } catch (error) {
      console.error('Error loading replays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setSearchParams(prev => ({
      ...prev,
      roomName: searchQuery,
      offset: 0
    }));
  };

  const handleFilterChange = (filter: ReplayFilter) => {
    setSelectedFilter(filter);
    setSearchParams(prev => ({
      ...prev,
      filter,
      offset: 0
    }));
  };

  const handleSortChange = (sortBy: 'recent' | 'popular' | 'duration' | 'player_count') => {
    setSearchParams(prev => ({
      ...prev,
      sortBy,
      offset: 0
    }));
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  const getFilterLabel = (filter: ReplayFilter) => {
    switch (filter) {
      case ReplayFilter.ALL:
        return 'All Replays';
      case ReplayFilter.MY_GAMES:
        return 'My Games';
      case ReplayFilter.WINS:
        return 'Victories';
      case ReplayFilter.RECENT:
        return 'Recent';
      case ReplayFilter.POPULAR:
        return 'Popular';
      case ReplayFilter.COMPETITIVE:
        return 'Competitive';
      default:
        return 'All Replays';
    }
  };

  const loadMore = () => {
    setSearchParams(prev => ({
      ...prev,
      offset: prev.offset + prev.limit
    }));
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col font-mono">
      {/* Header */}
      <div className="bg-gray-900 border-b border-white/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-black text-white border-white">
              <Eye className="w-4 h-4 mr-1" />
              REPLAY_BROWSER
            </Badge>
            <h1 className="text-xl font-bold text-white">[GAME_REPLAYS]</h1>
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-white hover:bg-white hover:text-black"
          >
            [CLOSE]
          </Button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="bg-gray-900 border-b border-white/20 p-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search replays..."
              className="bg-black text-white border-white/20 focus:border-white"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button
              onClick={handleSearch}
              variant="outline"
              className="bg-black text-white border-white hover:bg-white hover:text-black"
            >
              [SEARCH]
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="bg-black text-white border-white hover:bg-white hover:text-black"
          >
            <Filter className="w-4 h-4 mr-1" />
            [FILTERS]
          </Button>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 mb-4">
          {Object.values(ReplayFilter).map(filter => (
            <Button
              key={filter}
              variant={selectedFilter === filter ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange(filter)}
              className="bg-black text-white border-white hover:bg-white hover:text-black"
            >
              {getFilterLabel(filter)}
            </Button>
          ))}
        </div>

        {/* Sort options */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Sort by:</span>
          {[
            { value: 'recent', label: 'Recent' },
            { value: 'duration', label: 'Duration' },
            { value: 'player_count', label: 'Players' },
            { value: 'popular', label: 'Popular' }
          ].map(option => (
            <Button
              key={option.value}
              variant={searchParams.sortBy === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleSortChange(option.value as any)}
              className="bg-black text-white border-white hover:bg-white hover:text-black"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Replay list */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">LOADING_REPLAYS...</p>
          </div>
        ) : replays.length === 0 ? (
          <div className="text-center py-8">
            <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No replays found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {replays.map((replay) => (
              <Card key={replay.id} className="bg-gray-900 border-white/20 hover:border-white/40 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white font-mono text-sm">
                      [{replay.roomName}]
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {replay.gameMode}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDate(replay.startTime)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-300">{formatDuration(replay.duration)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-300">{replay.playerCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-yellow-400" />
                        <span className="text-yellow-400">{replay.winner}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-300">{replay.totalTurns} turns</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => onPlayReplay(replay.id)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        size="sm"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        [PLAY]
                      </Button>
                      {showAnalytics && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-black text-white border-white hover:bg-white hover:text-black"
                        >
                          <BarChart3 className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-black text-white border-white hover:bg-white hover:text-black"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Additional info */}
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Actions: {replay.totalActions}</div>
                      <div>Views: {replay.viewCount}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Load more button */}
        {!loading && replays.length > 0 && replays.length >= searchParams.limit && (
          <div className="text-center mt-6">
            <Button
              onClick={loadMore}
              variant="outline"
              className="bg-black text-white border-white hover:bg-white hover:text-black"
            >
              [LOAD_MORE]
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}