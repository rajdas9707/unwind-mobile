import { initDatabase, getAllReminders } from './db.js';

export const testDatabase = async () => {
  try {
    console.log('Testing database initialization...');
    
    // Test database initialization
    await initDatabase();
    console.log('✅ Database initialized successfully');
    
    // Test basic query
    const reminders = await getAllReminders();
    console.log('✅ Query executed successfully, found', reminders.length, 'reminders');
    
    return { success: true, message: 'Database test passed' };
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return { success: false, error: error.message };
  }
};