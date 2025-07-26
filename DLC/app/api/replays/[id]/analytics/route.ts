import { NextRequest, NextResponse } from 'next/server';
import { replayService } from '@/lib/game/replayService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const replayId = params.id;
    
    if (!replayId) {
      return NextResponse.json(
        { success: false, error: 'Replay ID is required' },
        { status: 400 }
      );
    }

    const analytics = await replayService.generateAnalytics(replayId);

    if (!analytics) {
      return NextResponse.json(
        { success: false, error: 'Analytics not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Error loading replay analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load replay analytics' },
      { status: 500 }
    );
  }
}