// Helper function to process test user for notification
async function processTestUser(pool, testData, testUser) {
  try {
    // Check if there's an alert for this user/daycare combination
    let alertId;
    const [existingAlerts] = await pool.query(`
      SELECT id FROM alerts
      WHERE user_id = ? AND operation_number = ? AND alert_type = 'violation'
      LIMIT 1
    `, [testUser.id, testData.violation.OPERATION_ID]);
    
    if (existingAlerts.length > 0) {
      alertId = existingAlerts[0].id;
      console.log(`✅ Found existing alert (ID: ${alertId}) for this user and daycare`);
    } else {
      // Create a temporary test alert
      const [alertResult] = await pool.query(`
        INSERT INTO alerts (
          user_id,
          operation_number,
          alert_type,
          frequency,
          active
        ) VALUES (?, ?, 'violation', 'immediately', 1)
      `, [testUser.id, testData.violation.OPERATION_ID]);
      
      alertId = alertResult.insertId;
      console.log(`✅ Created temporary test alert with ID ${alertId}`);
    }
    
    // Create notification entry
    const [result] = await pool.query(`
      INSERT INTO violation_notifications (
        violation_change_id,
        user_id,
        alert_id,
        delivery_status
      ) VALUES (?, ?, ?, 'pending')
    `, [
      testData.changeId,
      testUser.id,
      alertId
    ]);
    
    console.log(`✅ Created test notification with ID ${result.insertId}`);
    
    return {
      notificationId: result.insertId,
      user: testUser,
      alertId
    };
  } catch (err) {
    console.error(`❌ Error processing test user: ${err.message}`);
    return null;
  }
}

module.exports = processTestUser;
