import { FveDashboard } from '@/components/fve-dashboard';
import { electricitySeed, heatPumpSeed, waterSeed } from '@/lib/seed-data';

export default function Home() {
  return <FveDashboard initialData={{
    electricity: electricitySeed.map((row, index) => ({ id: index + 1, ...row })),
    water: waterSeed.map((row, index) => ({ id: index + 1, ...row })),
    heatPump: heatPumpSeed.map((row, index) => ({ id: index + 1, ...row })),
  }} />;
}
