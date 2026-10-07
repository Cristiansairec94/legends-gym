import { Branch } from '../types';

export const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'branch-matriz',
    name: 'Sede Central - Insurgentes Sur',
    code: 'LEG-01',
    address: 'Av. Insurgentes Sur 1425, Benito Juárez, CDMX',
    phone: '+52 55 1234 5678',
    managerName: 'Roberto Méndez (Head Coach)',
    turnstileCount: 2,
    activeTurnstiles: 2,
    maxCapacity: 150,
    currentOccupancy: 68,
    activeMembersCount: 420,
    todaySalesTotal: 18450,
    status: 'active',
    openTime: '05:30',
    closeTime: '23:00',
    isMainBranch: true
  },
  {
    id: 'branch-polanco',
    name: 'Sede Polanco - Luxury Club',
    code: 'LEG-02',
    address: 'Campos Elíseos 204, Polanco V Sección, Miguel Hidalgo, CDMX',
    phone: '+52 55 9876 5432',
    managerName: 'Mariana Silva',
    turnstileCount: 2,
    activeTurnstiles: 2,
    maxCapacity: 110,
    currentOccupancy: 45,
    activeMembersCount: 290,
    todaySalesTotal: 24300,
    status: 'active',
    openTime: '06:00',
    closeTime: '22:30',
    isMainBranch: false
  },
  {
    id: 'branch-roma',
    name: 'Sede Roma Norte - High Performance',
    code: 'LEG-03',
    address: 'Calle Orizaba 78, Col. Roma Norte, Cuauhtémoc, CDMX',
    phone: '+52 55 5544 3322',
    managerName: 'Diego Valenzuela',
    turnstileCount: 2,
    activeTurnstiles: 1,
    maxCapacity: 130,
    currentOccupancy: 53,
    activeMembersCount: 345,
    todaySalesTotal: 14750,
    status: 'active',
    openTime: '06:00',
    closeTime: '23:00',
    isMainBranch: false
  }
];
