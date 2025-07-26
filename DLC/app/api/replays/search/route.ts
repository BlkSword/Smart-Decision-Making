import { NextRequest, NextResponse } from 'next/server';
import { replayService } from '@/lib/game/replayService';
import { ReplaySearchParams, ReplayFilter } from '@/lib/game/replayTypes';

export async function POST(request: NextRequest) {
  try {
    const searchParams: ReplaySearchParams = await request.json();
    
    // Validate search parameters
    const validatedParams: ReplaySearchParams = {
      roomName: searchParams.roomName,
      playerName: searchParams.playerName,
      gameMode: searchParams.gameMode,
      minDuration: searchParams.minDuration,
      maxDuration: searchParams.maxDuration,
      dateFrom: searchParams.dateFrom ? new Date(searchParams.dateFrom) : undefined,
      dateTo: searchParams.dateTo ? new Date(searchParams.dateTo) : undefined,
      filter: searchParams.filter || ReplayFilter.ALL,
      sortBy: searchParams.sortBy || 'recent',
      limit: Math.min(searchParams.limit || 20, 100), // Max 100 results
      offset: searchParams.offset || 0
    };

    const replays = await replayService.searchReplays(validatedParams);

    return NextResponse.json({
      success: true,
      replays,
      pagination: {
        offset: validatedParams.offset,
        limit: validatedParams.limit,
        hasMore: replays.length === validatedParams.limit
      }
    });
  } catch (error) {
    console.error('Error searching replays:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search replays' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const params: ReplaySearchParams = {
      roomName: searchParams.get('roomName') || undefined,
      playerName: searchParams.get('playerName') || undefined,
      gameMode: searchParams.get('gameMode') || undefined,
      filter: (searchParams.get('filter') as ReplayFilter) || ReplayFilter.ALL,
      sortBy: (searchParams.get('sortBy') as any) || 'recent',
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100),
      offset: parseInt(searchParams.get('offset') || '0')
    };

    const replays = await replayService.searchReplays(params);

    return NextResponse.json({
      success: true,
      replays,
      pagination: {
        offset: params.offset,
        limit: params.limit,
        hasMore: replays.length === params.limit
      }
    });
  } catch (error) {
    console.error('Error searching replays:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search replays' },
      { status: 500 }
    );
  }
}