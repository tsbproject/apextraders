// ApexTraders Notification Utility - Cleaned & Non-Distracting
export const NotifySuccess = (message: string) => {
  // Console logging remains for development tracking
  console.log(
    `%c ✅ SUCCESS: ${message}`, 
    "color: #2dd4bf; font-weight: bold; background: rgba(45, 212, 191, 0.1); padding: 2px 5px; border-radius: 4px;"
  );
  

};

export const NotifyError = (message: string) => {
  console.log(
    `%c ❌ ERROR: ${message}`, 
    "color: #f43f5e; font-weight: bold; background: rgba(244, 63, 94, 0.1); padding: 2px 5px; border-radius: 4px;"
  );
  
 
};