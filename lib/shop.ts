/**
 * Catálogo de la tienda. Tres tipos:
 *  - cosméticos (bata, gorro, accesorios): cambian cómo se ve el doctor
 *  - mejoras: cambian el juego (velocidad, minijuegos más fáciles, más monedas)
 *  - decoración: aparecen dentro del hospital
 */

export type ItemSlot = 'coat' | 'hat' | 'extra' | 'upgrade' | 'decor';

export interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  slot: ItemSlot;
  price: number;
  minLevel: number;
  description: string;
  /** Color de bata (slot coat). 'rainbow' = arcoíris animado */
  color?: string;
  /** No se compra: se gana (p. ej. completar el álbum) */
  reward?: boolean;
}

export const ITEMS: ShopItem[] = [
  // Batas
  { id: 'coat-white', name: 'Bata clásica', emoji: '🥼', slot: 'coat', price: 0, minLevel: 1, color: '#f7f7fb', description: 'La de siempre, impecable.' },
  { id: 'coat-pink', name: 'Bata rosa', emoji: '🌸', slot: 'coat', price: 120, minLevel: 1, color: '#ffb3cf', description: 'Dulce como un algodón de azúcar.' },
  { id: 'coat-sky', name: 'Bata celeste', emoji: '💙', slot: 'coat', price: 150, minLevel: 1, color: '#9ed8ff', description: 'Del color del cielo de Ciudad Sana.' },
  { id: 'coat-mint', name: 'Bata de quirófano', emoji: '💚', slot: 'coat', price: 200, minLevel: 2, color: '#8fe3c0', description: 'Como los cirujanos de verdad.' },
  { id: 'coat-rainbow', name: 'Bata arcoíris', emoji: '🌈', slot: 'coat', price: 450, minLevel: 3, color: 'rainbow', description: '¡Cambia de color mientras caminas!' },
  { id: 'coat-gold', name: 'Bata dorada', emoji: '🏆', slot: 'coat', price: 0, minLevel: 1, color: '#ffd54f', reward: true, description: 'Premio por completar el álbum de pacientes.' },

  // Gorros
  { id: 'hat-surgery', name: 'Gorro quirúrgico', emoji: '🧢', slot: 'hat', price: 100, minLevel: 1, description: 'Con estampado de corazones.' },
  { id: 'hat-crown', name: 'Corona de doctor estrella', emoji: '👑', slot: 'hat', price: 350, minLevel: 3, description: 'Para el mejor doctor de la ciudad.' },

  // Accesorios (se pueden llevar varios)
  { id: 'extra-glasses', name: 'Lentes redondos', emoji: '👓', slot: 'extra', price: 90, minLevel: 1, description: 'Para ver cada detalle.' },
  { id: 'extra-mirror', name: 'Espejo frontal', emoji: '🔆', slot: 'extra', price: 140, minLevel: 2, description: 'El clásico espejito de doctor en la frente.' },
  { id: 'extra-cape', name: 'Capa de superhéroe', emoji: '🦸', slot: 'extra', price: 600, minLevel: 4, description: 'Porque los doctores son superhéroes.' },

  // Mejoras
  { id: 'upgrade-shoes', name: 'Zapatillas veloces', emoji: '👟', slot: 'upgrade', price: 250, minLevel: 2, description: 'Corres un 25% más rápido. ¡Ideal para emergencias!' },
  { id: 'upgrade-kit', name: 'Kit de precisión', emoji: '🧰', slot: 'upgrade', price: 300, minLevel: 2, description: 'Termómetro, jarabe y estetoscopio más fáciles de usar.' },
  { id: 'upgrade-bag', name: 'Maletín deluxe', emoji: '💼', slot: 'upgrade', price: 400, minLevel: 3, description: 'Ganas un 20% más de monedas por paciente.' },

  // Decoración del hospital
  { id: 'decor-plants', name: 'Plantas y flores', emoji: '🪴', slot: 'decor', price: 150, minLevel: 1, description: 'Macetas alegres en el hospital.' },
  { id: 'decor-posters', name: 'Murales de animales', emoji: '🦒', slot: 'decor', price: 180, minLevel: 1, description: 'Una jirafa, un elefante y un león en la pared.' },
  { id: 'decor-toys', name: 'Rincón de juguetes', emoji: '🧸', slot: 'decor', price: 220, minLevel: 2, description: 'Bloques, pelota y un osito para la sala de espera.' },
  { id: 'decor-aquarium', name: 'Pecera', emoji: '🐠', slot: 'decor', price: 350, minLevel: 3, description: 'Pececitos de colores que calman a los pacientes.' },
];

export const ITEM_BY_ID: Record<string, ShopItem> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export const SLOT_LABEL: Record<ItemSlot, string> = {
  coat: 'Batas',
  hat: 'Gorros',
  extra: 'Accesorios',
  upgrade: 'Mejoras',
  decor: 'Hospital',
};

export const DEFAULT_OWNED = ['coat-white'];
