const enrollmentService = require('../services/tourScheduling/enrollmentTrackingService');

class FollowupProcessor {
  constructor() {
    this.isRunning = false;
  }
  
  /**
   * Start the processor (runs every 5 minutes)
   */
  start() {
    if (this.isRunning) {
      console.log('Followup processor already running');
      return;
    }
    
    this.isRunning = true;
    console.log('Starting followup processor...');
    
    // Run immediately
    this.process();
    
    // Then run every 5 minutes
    this.interval = setInterval(() => {
      this.process();
    }, 300000); // 5 minutes
  }
  
  /**
   * Stop the processor
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.isRunning = false;
      console.log('Followup processor stopped');
    }
  }
  
  /**
   * Process scheduled follow-ups
   */
  async process() {
    try {
      console.log('Processing scheduled follow-ups...');
      await enrollmentService.processScheduledFollowups();
      console.log('Follow-ups processed successfully');
    } catch (error) {
      console.error('Error processing follow-ups:', error);
    }
  }
}

module.exports = new FollowupProcessor();
