/**
 * Types & Interfaces for Infinity Studio Booking System
 */

export interface Service {
  id: string;
  name: string;
  duration: number; // in minutes
  price: number; // in Chilean pesos or generic currency
  category: string;
  description: string;
}

export interface Barber {
  id: string;
  name: string;
  specialty: string;
  experience: number;
  instagram: string;
  avatarUrl: string;
}

export interface Booking {
  id?: number;
  name: string;
  phone: string;
  serviceId: string;
  serviceName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  comments?: string;
  status: 'pending' | 'completed' | 'canceled';
  barberId: string;
  barberName: string;
  createdAt?: string;
}

export interface BlockedHour {
  id?: number;
  barberId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  reason?: string;
}

export interface WaitlistEntry {
  id?: number;
  name: string;
  phone: string;
  serviceId: string;
  serviceName: string;
  date: string;
  barberId: string;
  barberName: string;
  createdAt?: string;
}

export interface CustomerStats {
  phone: string;
  name: string;
  visitsCount: number;
  totalSpent: number;
  lastVisit: string;
  favoriteService: string;
}

export interface AdminStats {
  today: number;
  week: number;
  month: number;
  blockedCount?: number;
  waitlistCount?: number;
  totalEarningsToday?: number;
  occupancyRateToday?: number;
}

export interface ChartDataPoint {
  date: string;
  count: number;
}

export interface ServiceCount {
  name: string;
  count: number;
}

