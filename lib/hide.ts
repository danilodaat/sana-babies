import * as THREE from 'three';

/**
 * Ocultar sin tocar `visible`.
 *
 * @react-three/rapier arma las colisiones automáticas recorriendo solo lo
 * visible (traverseVisible). Si ocultamos algo con `visible = false` antes de
 * que la física lo registre, esa pieza queda sin colisión: así los pisos 2 y 3
 * del hospital quedaron sin suelo y el doctor caía al piso 1.
 *
 * En cambio sacamos los meshes de la capa 0 (la que dibujan la cámara y las
 * sombras): no se ven, pero para la física siguen existiendo.
 */

export const HIDDEN_LAYER = 31;

export function setHidden(root: THREE.Object3D, hidden: boolean) {
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh || (o as THREE.Points).isPoints || (o as THREE.Line).isLine) {
      // Las piezas originales ya fusionadas por StaticBatcher quedan siempre ocultas
      if (o.userData?.batchedSource) return;
      if (hidden) o.layers.set(HIDDEN_LAYER);
      else o.layers.set(0);
    }
  });
}

/** Solo este objeto (sin hijos) */
export function setHiddenSelf(o: THREE.Object3D, hidden: boolean) {
  o.layers.set(hidden ? HIDDEN_LAYER : 0);
}

export const isHiddenLayer = (o: THREE.Object3D) => o.layers.isEnabled(HIDDEN_LAYER) && !o.layers.isEnabled(0);
