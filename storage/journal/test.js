import { checkJournalDatabaseHealth, insertJournalEntry, getRecentJournalEntries } from './db';

export const testJournalDatabase = async () => {
  console.log('🧪 Starting journal database test...');
  
  try {
    // Test 1: Health check
    console.log('📋 Step 1: Health check...');
    const health = await checkJournalDatabaseHealth();
    console.log('Health check result:', health);
    
    if (!health.healthy) {
      console.error('❌ Database is not healthy, stopping test');
      return { success: false, error: 'Database not healthy' };
    }
    
    // Test 2: Insert a test entry
    console.log('📝 Step 2: Inserting test entry...');
    const now = new Date().toISOString();
    const testEntry = await insertJournalEntry({
      title: 'Test Entry',
      content: 'This is a test journal entry created during testing',
      created_at: now,
      updated_at: now
    });
    console.log('Test entry created:', testEntry);
    
    // Test 3: Fetch recent entries
    console.log('📖 Step 3: Fetching recent entries...');
    const entries = await getRecentJournalEntries(5);
    console.log('Recent entries:', entries);
    
    console.log('✅ Journal database test completed successfully!');
    return { 
      success: true, 
      health, 
      testEntry, 
      entriesCount: entries.length,
      message: 'All tests passed'
    };
    
  } catch (error) {
    console.error('❌ Journal database test failed:', error);
    return { 
      success: false, 
      error: error.message,
      message: 'Database test failed'
    };
  }
};