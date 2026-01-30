// Database Manager - Handles all data persistence
class Database {
  constructor() {
    this.dbName = 'dropshipping_db';
    this.initDB();
  }

  initDB() {
    if (typeof window !== 'undefined') {
      const existingDB = localStorage.getItem(this.dbName);
      if (!existingDB) {
        const initialDB = {
          users: [],
          orders: [],
          products: [],
          suppliers: [],
          transactions: [],
          analytics: [],
          settings: {},
          lastBackup: new Date().toISOString(),
        };
        localStorage.setItem(this.dbName, JSON.stringify(initialDB));
      }
    }
  }

  getDB() {
    if (typeof window === 'undefined') return null;
    const db = localStorage.getItem(this.dbName);
    return db ? JSON.parse(db) : null;
  }

  saveDB(data) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.dbName, JSON.stringify(data));
      this.createBackup();
    }
  }

  createBackup() {
    if (typeof window !== 'undefined') {
      const db = this.getDB();
      const backup = `${this.dbName}_backup_${Date.now()}`;
      localStorage.setItem(backup, JSON.stringify(db));
      
      // Keep only last 5 backups
      const keys = Object.keys(localStorage);
      const backups = keys
        .filter(k => k.startsWith(`${this.dbName}_backup_`))
        .sort()
        .reverse();
      
      for (let i = 5; i < backups.length; i++) {
        localStorage.removeItem(backups[i]);
      }
    }
  }

  // User operations
  addUser(user) {
    const db = this.getDB();
    user.id = Math.random().toString(36).substr(2, 9);
    user.createdAt = new Date().toISOString();
    db.users.push(user);
    this.saveDB(db);
    return user;
  }

  getUserByEmail(email) {
    const db = this.getDB();
    return db.users.find(u => u.email === email);
  }

  updateUser(userId, updates) {
    const db = this.getDB();
    const userIndex = db.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      db.users[userIndex] = { ...db.users[userIndex], ...updates };
      this.saveDB(db);
      return db.users[userIndex];
    }
    return null;
  }

  // Order operations
  addOrder(order, userId) {
    const db = this.getDB();
    order.id = Math.random().toString(36).substr(2, 9);
    order.userId = userId;
    order.createdAt = new Date().toISOString();
    order.profit = order.amount - order.cost;
    db.orders.push(order);
    this.saveDB(db);
    return order;
  }

  getOrders(userId) {
    const db = this.getDB();
    return db.orders.filter(o => o.userId === userId);
  }

  updateOrder(orderId, updates) {
    const db = this.getDB();
    const orderIndex = db.orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      db.orders[orderIndex] = { ...db.orders[orderIndex], ...updates };
      this.saveDB(db);
      return db.orders[orderIndex];
    }
    return null;
  }

  deleteOrder(orderId) {
    const db = this.getDB();
    db.orders = db.orders.filter(o => o.id !== orderId);
    this.saveDB(db);
  }

  // Product operations
  addProduct(product, userId) {
    const db = this.getDB();
    product.id = Math.random().toString(36).substr(2, 9);
    product.userId = userId;
    product.createdAt = new Date().toISOString();
    product.margin = ((product.price - product.cost) / product.price * 100).toFixed(1);
    db.products.push(product);
    this.saveDB(db);
    return product;
  }

  getProducts(userId) {
    const db = this.getDB();
    return db.products.filter(p => p.userId === userId);
  }

  updateProduct(productId, updates) {
    const db = this.getDB();
    const productIndex = db.products.findIndex(p => p.id === productId);
    if (productIndex !== -1) {
      db.products[productIndex] = { ...db.products[productIndex], ...updates };
      if (updates.price && updates.cost) {
        db.products[productIndex].margin = (
          (updates.price - updates.cost) / updates.price * 100
        ).toFixed(1);
      }
      this.saveDB(db);
      return db.products[productIndex];
    }
    return null;
  }

  deleteProduct(productId) {
    const db = this.getDB();
    db.products = db.products.filter(p => p.id !== productId);
    this.saveDB(db);
  }

  // Supplier operations
  addSupplier(supplier, userId) {
    const db = this.getDB();
    supplier.id = Math.random().toString(36).substr(2, 9);
    supplier.userId = userId;
    supplier.createdAt = new Date().toISOString();
    supplier.lastSync = new Date().toISOString();
    db.suppliers.push(supplier);
    this.saveDB(db);
    return supplier;
  }

  getSuppliers(userId) {
    const db = this.getDB();
    return db.suppliers.filter(s => s.userId === userId);
  }

  updateSupplier(supplierId, updates) {
    const db = this.getDB();
    const supplierIndex = db.suppliers.findIndex(s => s.id === supplierId);
    if (supplierIndex !== -1) {
      db.suppliers[supplierIndex] = { ...db.suppliers[supplierIndex], ...updates };
      this.saveDB(db);
      return db.suppliers[supplierIndex];
    }
    return null;
  }

  deleteSupplier(supplierId) {
    const db = this.getDB();
    db.suppliers = db.suppliers.filter(s => s.id !== supplierId);
    this.saveDB(db);
  }

  // Analytics operations
  getAnalytics(userId) {
    const db = this.getDB();
    const userOrders = db.orders.filter(o => o.userId === userId);
    const userProducts = db.products.filter(p => p.userId === userId);

    return {
      totalOrders: userOrders.length,
      totalRevenue: userOrders.reduce((sum, o) => sum + o.amount, 0),
      totalCost: userOrders.reduce((sum, o) => sum + o.cost, 0),
      totalProfit: userOrders.reduce((sum, o) => sum + o.profit, 0),
      totalProducts: userProducts.length,
      avgOrderValue: userOrders.length > 0 
        ? (userOrders.reduce((sum, o) => sum + o.amount, 0) / userOrders.length).toFixed(2)
        : 0,
      profitMargin: userOrders.length > 0
        ? ((userOrders.reduce((sum, o) => sum + o.profit, 0) / 
           userOrders.reduce((sum, o) => sum + o.amount, 0)) * 100).toFixed(1)
        : 0,
    };
  }

  // Settings operations
  saveSettings(userId, settings) {
    const db = this.getDB();
    db.settings[userId] = settings;
    this.saveDB(db);
    return settings;
  }

  getSettings(userId) {
    const db = this.getDB();
    return db.settings[userId] || {};
  }

  // Export data
  exportData(userId) {
    const db = this.getDB();
    return {
      user: db.users.find(u => u.id === userId),
      orders: db.orders.filter(o => o.userId === userId),
      products: db.products.filter(p => p.userId === userId),
      suppliers: db.suppliers.filter(s => s.userId === userId),
      settings: db.settings[userId],
      exportedAt: new Date().toISOString(),
    };
  }

  // Import data
  importData(userId, data) {
    const db = this.getDB();
    
    if (data.orders) {
      data.orders.forEach(order => {
        order.userId = userId;
        db.orders.push(order);
      });
    }
    
    if (data.products) {
      data.products.forEach(product => {
        product.userId = userId;
        db.products.push(product);
      });
    }
    
    if (data.suppliers) {
      data.suppliers.forEach(supplier => {
        supplier.userId = userId;
        db.suppliers.push(supplier);
      });
    }
    
    this.saveDB(db);
  }
}

export const db = new Database();

