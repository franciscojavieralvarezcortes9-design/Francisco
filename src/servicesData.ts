import { Service } from './types';

export const BARBER_SERVICES: Service[] = [
  {
    id: 'corte-clasico',
    name: 'Corte Clásico Imperial',
    duration: 35,
    price: 10000,
    category: 'Cabello',
    description: 'Corte tradicional de tijera o máquina estilizado según tus facciones. Incluye perfilado de contornos, lavado capilar y peinado con pomada premium.'
  },
  {
    id: 'corte-fade',
    name: 'Fade (Degradado de Autor)',
    duration: 40,
    price: 12000,
    category: 'Cabello',
    description: 'Degradado perfecto (Skin, Low, Mid, High Fade). Un trabajo milimétrico que respeta la forma de tu cráneo, sellado con ritual refrescante.'
  },
  {
    id: 'combo-infinity',
    name: 'Corte + Barba (Combo Rojas.Barber)',
    duration: 60,
    price: 18000,
    category: 'Combos',
    description: 'La experiencia definitiva: Corte de cabello (clásico o fade) más perfilado completo de barba con afeitado al vapor, toalla caliente y aceites orgánicos.'
  },
  {
    id: 'perfilado-barba',
    name: 'Perfilado de Barba & Ritual Hot Towel',
    duration: 25,
    price: 8000,
    category: 'Barba',
    description: 'Diseño de barba con navaja libre, rasurado al vapor y toalla caliente para abrir poros. Masaje relajante y loción hidratante.'
  },
  {
    id: 'corte-diseno',
    name: 'Diseño de Autor / Hair Tattoo',
    duration: 45,
    price: 15000,
    category: 'Estilo',
    description: 'Diseños geométricos y líneas artísticas personalizadas integradas a tu corte. Para quienes buscan diferenciarse con estilo único.'
  },
  {
    id: 'tratamiento-facial',
    name: 'Tratamiento Facial & Mascarilla Premium',
    duration: 30,
    price: 10000,
    category: 'Estética',
    description: 'Limpieza profunda con exfoliante natural microgranular, mascarilla negra Peel-off de carbón activo y masajes con hidratante facial.'
  }
];
