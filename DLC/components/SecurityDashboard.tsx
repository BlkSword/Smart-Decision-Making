'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Lock, 
  Zap,
  Activity,
  Users,
  Eye,
  RefreshCw
} from 'lucide-react';

interface SecurityHealth {
  status: 'healthy' | 'warning' | 'critical';
  checks: Record<string, boolean>;
  recommendations: string[];
}

interface SecurityStats {
  rateLimitHits: number;
  csrfBlocks: number;
  authFailures: number;
  totalRequests: number;
  lastUpdated: string;
}

interface SecurityStatus {
  health: SecurityHealth;
  stats: SecurityStats;
  rateLimits: {
    total: number;
    active: number;
    entries: Array<{
      key: string;
      count: number;
      resetTime: number;
      ip: string;
      pathname: string;
    }>;
  };
  csrfTokens: {
    total: number;
    active: number;
    expired: number;
  };
  timestamp: string;
}

interface SecurityDashboardProps {
  showAdvanced?: boolean;
}

export default function SecurityDashboard({ showAdvanced = false }: SecurityDashboardProps) {
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadSecurityStatus();
    const interval = setInterval(loadSecurityStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSecurityStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/security/status');
      
      if (!response.ok) {
        throw new Error('Failed to fetch security status');
      }
      
      const data = await response.json();
      setSecurityStatus(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSecurityAction = async (action: string, target?: string) => {
    try {
      const response = await fetch('/api/security/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, target }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to execute security action');
      }
      
      await loadSecurityStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'critical': return <AlertTriangle className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatResetTime = (timestamp: number) => {
    const now = Date.now();
    const diff = timestamp - now;
    
    if (diff <= 0) {
      return 'Expired';
    }
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    return `${minutes}m ${seconds}s`;
  };

  if (loading && !securityStatus) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        <span className="ml-2 text-white">Loading security status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900 border border-red-700 rounded-lg">
        <div className="flex items-center gap-2 text-red-100">
          <AlertTriangle className="w-5 h-5" />
          <span>Error: {error}</span>
        </div>
        <Button 
          onClick={loadSecurityStatus}
          className="mt-2 bg-red-800 hover:bg-red-700"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!securityStatus) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Security Health Overview */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              SECURITY_HEALTH
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1 ${getHealthColor(securityStatus.health.status)}`}>
                {getHealthIcon(securityStatus.health.status)}
                <span className="text-sm font-medium">
                  {securityStatus.health.status.toUpperCase()}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadSecurityStatus}
                disabled={loading}
                className="bg-black text-white border-gray-600 hover:bg-gray-800"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Security Checks */}
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">Security Checks</h4>
              <div className="space-y-1">
                {Object.entries(securityStatus.health.checks).map(([check, passed]) => (
                  <div key={check} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{check.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <Badge variant={passed ? "default" : "destructive"} className="text-xs">
                      {passed ? 'PASS' : 'FAIL'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">Recommendations</h4>
              <div className="space-y-1">
                {securityStatus.health.recommendations.length > 0 ? (
                  securityStatus.health.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">{rec}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>All security checks passed</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">RATE_LIMIT_HITS</p>
                <p className="text-2xl font-bold text-yellow-500">{securityStatus.stats.rateLimitHits}</p>
              </div>
              <Zap className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">CSRF_BLOCKS</p>
                <p className="text-2xl font-bold text-red-500">{securityStatus.stats.csrfBlocks}</p>
              </div>
              <Lock className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">AUTH_FAILURES</p>
                <p className="text-2xl font-bold text-orange-500">{securityStatus.stats.authFailures}</p>
              </div>
              <Users className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">TOTAL_REQUESTS</p>
                <p className="text-2xl font-bold text-blue-500">{securityStatus.stats.totalRequests}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Security Information */}
      {showAdvanced && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rate Limit Status */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                RATE_LIMITS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total:</span>
                  <span className="text-white">{securityStatus.rateLimits.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Active:</span>
                  <span className="text-green-400">{securityStatus.rateLimits.active}</span>
                </div>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {securityStatus.rateLimits.entries.map((entry) => (
                  <div key={entry.key} className="bg-gray-800 rounded p-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">{entry.ip}</span>
                      <Badge variant="outline" className="text-xs">
                        {entry.count} hits
                      </Badge>
                    </div>
                    <div className="text-gray-400 mt-1">{entry.pathname}</div>
                    <div className="text-gray-500 mt-1">
                      Resets: {formatResetTime(entry.resetTime)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* CSRF Token Status */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                CSRF_TOKENS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total:</span>
                  <span className="text-white">{securityStatus.csrfTokens.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Active:</span>
                  <span className="text-green-400">{securityStatus.csrfTokens.active}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Expired:</span>
                  <span className="text-red-400">{securityStatus.csrfTokens.expired}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Button
                  onClick={() => handleSecurityAction('cleanup_expired')}
                  className="w-full bg-red-900 hover:bg-red-800 text-red-100"
                  size="sm"
                >
                  CLEANUP_EXPIRED
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-xs text-gray-500 text-center">
        Last updated: {formatDate(securityStatus.timestamp)}
      </div>
    </div>
  );
}