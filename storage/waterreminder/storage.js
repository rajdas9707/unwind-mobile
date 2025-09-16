import * as Notifications from 'expo-notifications';
import { 
  createReminder, 
  createCheckpoint, 
  deleteCheckpointsByReminderId,
  updateReminder as updateReminderDB,
  deleteReminder as deleteReminderDB
} from './db.js';

// Helper function to parse time string (HH:MM) to minutes
export const timeToMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper function to convert minutes to time string (HH:MM)
export const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Helper function to get current time in HH:MM format
export const getCurrentTime = () => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};

// Calculate checkpoints based on start time, end time, and interval
export const calculateCheckpoints = (startTime, endTime, intervalValue, intervalUnit) => {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  // Convert interval to minutes
  let intervalInMinutes;
  switch (intervalUnit) {
    case 'minutes':
      intervalInMinutes = intervalValue;
      break;
    case 'hours':
      intervalInMinutes = intervalValue * 60;
      break;
    default:
      throw new Error('Invalid interval unit. Use "minutes" or "hours".');
  }
  
  const checkpoints = [];
  let currentTime = startMinutes;
  
  // Handle case where end time is on the next day
  let actualEndMinutes = endMinutes;
  if (endMinutes < startMinutes) {
    actualEndMinutes = endMinutes + (24 * 60); // Add 24 hours
  }
  
  // Generate checkpoints
  while (currentTime <= actualEndMinutes) {
    // Convert back to 24-hour format if it goes past midnight
    const displayTime = currentTime >= (24 * 60) ? currentTime - (24 * 60) : currentTime;
    checkpoints.push({
      time: minutesToTime(displayTime),
      timestamp: currentTime
    });
    currentTime += intervalInMinutes;
  }
  
  return checkpoints;
};

// Validate reminder data
export const validateReminderData = (startTime, endTime, intervalValue, intervalUnit, quantity) => {
  const errors = [];
  
  // Validate time format
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(startTime)) {
    errors.push('Start time must be in HH:MM format');
  }
  if (!timeRegex.test(endTime)) {
    errors.push('End time must be in HH:MM format');
  }
  
  // Validate interval
  if (!intervalValue || intervalValue <= 0) {
    errors.push('Interval must be a positive number');
  }
  if (!['minutes', 'hours'].includes(intervalUnit)) {
    errors.push('Interval unit must be "minutes" or "hours"');
  }
  
  // Validate quantity
  if (!quantity || quantity <= 0) {
    errors.push('Water quantity must be a positive number');
  }
  
  // Check if interval is reasonable
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  let duration = endMinutes - startMinutes;
  if (duration < 0) {
    duration += (24 * 60); // Add 24 hours for next day
  }
  
  const intervalInMinutes = intervalUnit === 'hours' ? intervalValue * 60 : intervalValue;
  if (intervalInMinutes > duration) {
    errors.push('Interval is longer than the reminder duration');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Format reminder display name
export const formatReminderName = (startTime, endTime) => {
  const formatTime = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };
  
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
};

// Format interval display
export const formatInterval = (intervalValue, intervalUnit) => {
  const unit = intervalValue === 1 ? intervalUnit.slice(0, -1) : intervalUnit;
  return `Every ${intervalValue} ${unit}`;
};

// Request notification permissions
export const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      throw new Error('Notification permissions not granted');
    }
    
    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    throw error;
  }
};

// Schedule notifications for checkpoints
export const scheduleCheckpointNotifications = async (checkpoints, quantity) => {
  try {
    const notificationIds = [];
    const now = new Date();
    
    for (const checkpoint of checkpoints) {
      const [hours, minutes] = checkpoint.time.split(':').map(Number);
      const notificationTime = new Date();
      notificationTime.setHours(hours, minutes, 0, 0);
      
      // If the time has passed today, schedule for tomorrow
      if (notificationTime <= now) {
        notificationTime.setDate(notificationTime.getDate() + 1);
      }
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💧 Time to Hydrate!',
          body: `Drink ${quantity}ml of water to stay healthy and refreshed!`,
          data: { type: 'water_reminder' },
          sound: 'default',
        },
        trigger: {
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      });
      
      notificationIds.push({
        time: checkpoint.time,
        notificationId
      });
    }
    
    return notificationIds;
  } catch (error) {
    console.error('Error scheduling notifications:', error);
    throw error;
  }
};

// Create a complete water reminder with checkpoints and notifications
export const createWaterReminder = async (reminderData) => {
  try {
    const { startTime, endTime, intervalValue, intervalUnit, quantity } = reminderData;
    
    // Validate data
    const validation = validateReminderData(startTime, endTime, intervalValue, intervalUnit, quantity);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }
    
    // Request notification permissions
    await requestNotificationPermissions();
    
    // Calculate checkpoints
    const checkpoints = calculateCheckpoints(startTime, endTime, intervalValue, intervalUnit);
    
    // Create reminder in database
    const reminderId = await createReminder(reminderData);
    
    // Schedule notifications and create checkpoints
    const notificationData = await scheduleCheckpointNotifications(checkpoints, quantity);
    
    // Save checkpoints to database
    for (let i = 0; i < checkpoints.length; i++) {
      const checkpoint = checkpoints[i];
      const notification = notificationData[i];
      
      await createCheckpoint({
        reminderId,
        checkpointTime: checkpoint.time,
        notificationId: notification.notificationId
      });
    }
    
    return {
      reminderId,
      checkpointsCount: checkpoints.length
    };
  } catch (error) {
    console.error('Error creating water reminder:', error);
    throw error;
  }
};

// Update an existing water reminder
export const updateWaterReminder = async (reminderId, reminderData) => {
  try {
    const { startTime, endTime, intervalValue, intervalUnit, quantity } = reminderData;
    
    // Validate data
    const validation = validateReminderData(startTime, endTime, intervalValue, intervalUnit, quantity);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }
    
    // Delete existing checkpoints and notifications
    await deleteCheckpointsByReminderId(reminderId);
    
    // Update reminder in database
    await updateReminderDB(reminderId, reminderData);
    
    // Calculate new checkpoints
    const checkpoints = calculateCheckpoints(startTime, endTime, intervalValue, intervalUnit);
    
    // Schedule new notifications and create new checkpoints
    const notificationData = await scheduleCheckpointNotifications(checkpoints, quantity);
    
    // Save new checkpoints to database
    for (let i = 0; i < checkpoints.length; i++) {
      const checkpoint = checkpoints[i];
      const notification = notificationData[i];
      
      await createCheckpoint({
        reminderId,
        checkpointTime: checkpoint.time,
        notificationId: notification.notificationId
      });
    }
    
    return {
      reminderId,
      checkpointsCount: checkpoints.length
    };
  } catch (error) {
    console.error('Error updating water reminder:', error);
    throw error;
  }
};

// Delete a water reminder
export const deleteWaterReminder = async (reminderId) => {
  try {
    await deleteReminderDB(reminderId);
    return true;
  } catch (error) {
    console.error('Error deleting water reminder:', error);
    throw error;
  }
};

// Get checkpoint status summary
export const getCheckpointStatusSummary = (checkpoints) => {
  const total = checkpoints.length;
  const completed = checkpoints.filter(checkpoint => checkpoint.is_completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return {
    total,
    completed,
    remaining: total - completed,
    percentage
  };
};

// Check if checkpoint time has passed
export const hasCheckpointTimePassed = (checkpointTime) => {
  const now = new Date();
  const [hours, minutes] = checkpointTime.split(':').map(Number);
  const checkpointDate = new Date();
  checkpointDate.setHours(hours, minutes, 0, 0);
  
  return now > checkpointDate;
};