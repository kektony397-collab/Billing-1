
// Fix: Use default import for Dexie to ensure proper inheritance of methods like 'version'.
import Dexie, { Table } from 'dexie';
import { Product, Party, Invoice, CompanyProfile } from './types';

export class AppDatabase extends Dexie {
  products!: Table<Product>;
  parties!: Table<Party>;
  invoices!: Table<Invoice>;
  settings!: Table<CompanyProfile>;

  constructor() {
    super('GopiDistributorsDB');
    // The version() method is inherited from Dexie and used to define the database schema.
    this.version(1).stores({
      products: '++id, name, hsn, batch',
      parties: '++id, name, gstin',
      invoices: '++id, invoiceNo, date, partyId',
      settings: '++id'
    });
  }
}

export const db = new AppDatabase();

export const seedDatabase = async () => {
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add({
      companyName: 'GOPI DISTRIBUTOR',
      addressLine1: '74/20/4, Navyug Colony',
      addressLine2: 'Bhulabhai Park Crossroad, Ahmedabad-22 Ahmedabad',
      gstin: '24AADPO7411Q1ZE',
      dlNo1: 'GJ-ADC-AA/1946, GJ-ADC-AA/4967',
      dlNo2: 'GJ-ADC-AA/1953, GJ-ADC-AA/4856',
      phone: '07925383834, 8460143984, 9426005928',
      email: 'info@gopidistributor.com',
      terms: 'Bill No. is must while returning EXP. Products\nE.&.O.E.',
      theme: 'blue',
      invoiceTemplate: 'authentic'
    });
  }
};
