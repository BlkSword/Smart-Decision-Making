'use client';

import { useParams, useRouter } from 'next/navigation';
import SpectatorView from '@/components/SpectatorView';

export default function SpectatePage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const handleLeave = () => {
    router.push('/multiplayer');
  };

  return (
    <SpectatorView 
      roomId={roomId} 
      onLeave={handleLeave}
    />
  );
}