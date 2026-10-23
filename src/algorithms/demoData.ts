import type { SupplyItem } from './types';

/**
 * Reference dataset: relief procurement proposals for one allocation cycle.
 *
 * Field mapping used by the portal (the solver sees plain knapsack weights/values):
 *   unitWeight  → unit cost in ₹ lakh            (knapsack weight  w_i)
 *   unitBenefit → projected social-impact score  (knapsack value   v_i)
 *   quantity    → units requested                (expanded into that many 0/1 items)
 *   destination → implementing zone
 *   category    → sector
 *
 * Numeric values are unchanged from the original disaster-relief dataset, so every
 * optimisation result is identical — only the labels describe procurement lots.
 */
export const INITIAL_SUPPLIES: SupplyItem[] = [
  {
    id: 'sup-1',
    name: 'Rice Ration Lot',
    unitWeight: 25,
    unitBenefit: 120,
    quantity: 15,
    destination: 'Jaipur Relief Camp',
    category: 'Food & Water',
  },
  {
    id: 'sup-2',
    name: 'Drinking Water Crate Lot',
    unitWeight: 15,
    unitBenefit: 110,
    quantity: 20,
    destination: 'Jaipur Relief Camp',
    category: 'Food & Water',
  },
  {
    id: 'sup-3',
    name: 'Medical Trauma Kit Batch',
    unitWeight: 10,
    unitBenefit: 160,
    quantity: 12,
    destination: 'Hospital Emergency Zone',
    category: 'Medical',
  },
  {
    id: 'sup-4',
    name: 'Woolen Blanket Batch',
    unitWeight: 8,
    unitBenefit: 45,
    quantity: 25,
    destination: 'Rural High-Altitude Camp',
    category: 'Shelter',
  },
  {
    id: 'sup-5',
    name: 'Family Shelter Tent Cluster',
    unitWeight: 35,
    unitBenefit: 180,
    quantity: 8,
    destination: 'Flood-Affected Sector 4',
    category: 'Shelter',
  },
  {
    id: 'sup-6',
    name: 'Ready-to-Eat Meal Lot',
    unitWeight: 5,
    unitBenefit: 50,
    quantity: 30,
    destination: 'Village Relief Centre',
    category: 'Food & Water',
  },
  {
    id: 'sup-7',
    name: 'First Aid Pack Batch',
    unitWeight: 4,
    unitBenefit: 65,
    quantity: 20,
    destination: 'Mobile Medical Camp B',
    category: 'Medical',
  },
  {
    id: 'sup-8',
    name: 'Hygiene & Sanitation Kit Batch',
    unitWeight: 7,
    unitBenefit: 40,
    quantity: 18,
    destination: 'Rural High-Altitude Camp',
    category: 'Sanitation',
  },
  {
    id: 'sup-9',
    name: 'Infant Nutrition Batch',
    unitWeight: 6,
    unitBenefit: 75,
    quantity: 15,
    destination: 'Hospital Emergency Zone',
    category: 'Food & Water',
  },
  {
    id: 'sup-10',
    name: 'Antibiotics & IV Fluid Batch',
    unitWeight: 12,
    unitBenefit: 195,
    quantity: 10,
    destination: 'Hospital Emergency Zone',
    category: 'Medical',
  },
  {
    id: 'sup-11',
    name: 'Solar Emergency Lamp Batch',
    unitWeight: 3,
    unitBenefit: 35,
    quantity: 25,
    destination: 'Village Relief Centre',
    category: 'Energy',
  },
  {
    id: 'sup-12',
    name: 'Water Purification Tablet Lot',
    unitWeight: 2,
    unitBenefit: 40,
    quantity: 40,
    destination: 'Flood-Affected Sector 4',
    category: 'Food & Water',
  },
];

/** Default fiscal budget for the cycle, in ₹ lakh (the knapsack capacity W). */
export const DEFAULT_VEHICLE_CAPACITY = 1000;
