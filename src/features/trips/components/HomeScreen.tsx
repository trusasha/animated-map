import { Placeholder } from '../../../lib/Placeholder';
import type { HomeScreenProps } from '../types';

export function HomeScreen({ onOpenTrip }: HomeScreenProps) {
  return <Placeholder name="home-screen"><button onClick={() => onOpenTrip('new')}>open</button></Placeholder>;
}
