'use client';

import { EffectComposer, Bloom, Vignette, ToneMapping, HueSaturation } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useGameStore } from '@/store/gameStore';

/**
 * Post-proceso (viene del experimento sana-babies-graphics-test, ajustado al
 * estilo cartoon): bloom solo en lo que brilla de verdad (faroles, sol,
 * partículas), viñeta suave y tone mapping neutral para no lavar los pasteles.
 * En calidad "bajo" se apaga entero: el Canvas hace el tone mapping.
 */
export default function PostFX() {
  const quality = useGameStore((s) => s.quality);
  if (quality !== 'alto') return null;
  return (
    <EffectComposer multisampling={4}>
      <Bloom intensity={0.7} luminanceThreshold={0.9} luminanceSmoothing={0.2} mipmapBlur />
      <HueSaturation saturation={0.12} />
      <Vignette darkness={0.45} offset={0.35} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
  );
}
