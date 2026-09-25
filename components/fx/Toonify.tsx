'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/*
 * Convierte todo el mundo a estilo cartoon (cel-shading) sin tocar cada
 * componente: recorre la escena y cambia cada MeshStandardMaterial por un
 * MeshToonMaterial con rampa de 4 tonos. Los materiales compartidos se
 * mantienen compartidos (caché por uuid).
 *
 * Además añade contorno negro ("inverted hull") a todo lo que cuelgue de un
 * grupo con userData.outline = grosor. Así los personajes resaltan.
 *
 * Materiales con userData.night se registran para que DayNight los encienda
 * de noche (faroles, ventanas).
 */

export interface NightMaterial {
  material: THREE.MeshToonMaterial;
  kind: 'lamp' | 'window';
  baseIntensity: number;
  baseEmissive: THREE.Color;
}

export const nightMaterials: NightMaterial[] = [];

function makeGradient() {
  const tones = new Uint8Array([90, 165, 225, 255]);
  const tex = new THREE.DataTexture(tones, tones.length, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function makeOutlineMaterial(thickness: number) {
  const m = new THREE.MeshBasicMaterial({ color: '#3b2a3f', side: THREE.BackSide });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       transformed += normalize(normal) * ${thickness.toFixed(4)};`,
    );
  };
  m.customProgramCacheKey = () => `outline-${thickness}`;
  return m;
}

const noRaycast = () => {};

let sharedGradient: THREE.DataTexture | null = null;
/** Rampa de tonos compartida, para materiales toon creados a mano (p. ej. la bata que cambia de color) */
export function getToonGradient() {
  if (!sharedGradient) sharedGradient = makeGradient();
  return sharedGradient;
}

export default function Toonify() {
  const scene = useThree((s) => s.scene);
  const gradient = useMemo(getToonGradient, []);
  const cache = useRef(new Map<string, THREE.MeshToonMaterial>());
  const outlineCache = useRef(new Map<number, THREE.MeshBasicMaterial>());
  const frame = useRef(0);

  const toToon = (src: THREE.MeshStandardMaterial) => {
    const hit = cache.current.get(src.uuid);
    if (hit) return hit;
    const m = new THREE.MeshToonMaterial({
      color: src.color,
      emissive: src.emissive,
      emissiveIntensity: src.emissiveIntensity,
      gradientMap: gradient,
      transparent: src.transparent,
      opacity: src.opacity,
      side: src.side,
      map: src.map,
      depthWrite: src.depthWrite,
    });
    m.toneMapped = src.toneMapped;
    m.userData = { ...src.userData };
    const kind = src.userData?.night as NightMaterial['kind'] | undefined;
    if (kind) {
      nightMaterials.push({
        material: m,
        kind,
        baseIntensity: src.emissiveIntensity,
        baseEmissive: src.emissive.clone(),
      });
    }
    cache.current.set(src.uuid, m);
    return m;
  };

  const outlineFor = (thickness: number) => {
    let m = outlineCache.current.get(thickness);
    if (!m) {
      m = makeOutlineMaterial(thickness);
      outlineCache.current.set(thickness, m);
    }
    return m;
  };

  const findOutline = (obj: THREE.Object3D): number | null => {
    let o: THREE.Object3D | null = obj;
    while (o) {
      if (typeof o.userData?.outline === 'number') return o.userData.outline;
      if (o.userData?.noOutline) return null;
      o = o.parent;
    }
    return null;
  };

  useFrame(() => {
    // Primer frame y luego cada ~0.5 s para objetos montados después (marcadores, etc.)
    if (frame.current++ % 30 !== 0) return;
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || mesh.userData.toonDone || mesh.userData.noToon) return;
      mesh.userData.toonDone = true;
      if ((mesh as THREE.InstancedMesh).isInstancedMesh) return;

      const mat = mesh.material as THREE.Material;
      if (Array.isArray(mesh.material)) return;
      if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
        mesh.material = toToon(mat as THREE.MeshStandardMaterial);
      }

      const thickness = findOutline(mesh);
      if (thickness !== null && !(mesh.material as THREE.Material).transparent) {
        const hull = new THREE.Mesh(mesh.geometry, outlineFor(thickness));
        hull.userData.toonDone = true;
        hull.castShadow = false;
        hull.receiveShadow = false;
        hull.raycast = noRaycast;
        mesh.add(hull);
      }
    });
  });

  return null;
}
