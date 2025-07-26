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

    const replay = await replayService.generateReplay(replayId);

    if (!replay) {
      return NextResponse.json(
        { success: false, error: 'Replay not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      replay
    });
  } catch (error) {
    console.error('Error loading replay:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load replay' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // TODO: Implement replay deletion
    // This would need to check permissions and delete the replay data
    
    return NextResponse.json({
      success: true,
      message: 'Replay deletion not implemented yet'
    });
  } catch (error) {
    console.error('Error deleting replay:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete replay' },
      { status: 500 }
    );
  }
}