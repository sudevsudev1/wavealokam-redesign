export type Language = 'en' | 'ml';

export const t = (key: string, lang: Language): string => {
  return translations[key]?.[lang] || translations[key]?.['en'] || key;
};

const translations: Record<string, Record<Language, string>> = {
  // Auth
  'auth.title': { en: 'Wavealokam Ops', ml: 'വേവ്അലോകം ഓപ്സ്' },
  'auth.userId': { en: 'User ID', ml: 'യൂസർ ഐഡി' },
  'auth.password': { en: 'Password', ml: 'പാസ്‌വേഡ്' },
  'auth.login': { en: 'Sign In', ml: 'സൈൻ ഇൻ' },
  'auth.loginError': { en: 'Invalid User ID or Password', ml: 'തെറ്റായ യൂസർ ഐഡി അല്ലെങ്കിൽ പാസ്‌വേഡ്' },
  'auth.loggingIn': { en: 'Signing in...', ml: 'സൈൻ ഇൻ ചെയ്യുന്നു...' },

  // Nav
  'nav.home': { en: 'Home', ml: 'ഹോം' },
  'nav.tasks': { en: 'Tasks', ml: 'ടാസ്ക്കുകൾ' },
  'nav.inventory': { en: 'Inventory', ml: 'ഇൻവെന്ററി' },
  'nav.purchase': { en: 'Purchase', ml: 'പർച്ചേസ്' },
  'nav.guestLog': { en: 'Guest Log', ml: 'ഗസ്റ്റ് ലോഗ്' },
  'nav.shiftPunch': { en: 'Shift Punch', ml: 'ഷിഫ്റ്റ് പഞ്ച്' },
  'nav.dailyReport': { en: 'Daily Report', ml: 'ഡെയ്‌ലി റിപ്പോർട്ട്' },
  'nav.adminConsole': { en: 'Admin Console', ml: 'അഡ്‌മിൻ കൺസോൾ' },
  'nav.signOut': { en: 'Sign Out', ml: 'സൈൻ ഔട്ട്' },

  // Home
  'home.welcome': { en: 'Welcome', ml: 'സ്വാഗതം' },
  'home.myTasks': { en: 'My Tasks', ml: 'എന്റെ ടാസ്ക്കുകൾ' },
  'home.vector': { en: 'Vector', ml: 'വെക്റ്റർ' },
  'home.purchase': { en: 'Quick Purchase', ml: 'ക്വിക്ക് പർച്ചേസ്' },
  'home.noTasks': { en: 'No tasks assigned yet', ml: 'ഇതുവരെ ടാസ്ക്കുകൾ ഇല്ല' },
  'home.liveOps': { en: 'Live Operations', ml: 'ലൈവ് ഓപ്പറേഷൻസ്' },
  'home.atRisk': { en: 'At Risk', ml: 'റിസ്ക്കിൽ' },
  'home.overdueTasks': { en: 'Overdue Tasks', ml: 'ഓവർഡ്യൂ ടാസ്ക്കുകൾ' },
  'home.dueForOrder': { en: 'Due for Order', ml: 'ഓർഡർ ചെയ്യേണ്ടവ' },
  'home.delayedOrders': { en: 'Delayed Orders', ml: 'വൈകിയ ഓർഡറുകൾ' },
  'home.missingSyncs': { en: 'Pending Syncs', ml: 'സിങ്ക് ചെയ്യാനുള്ളവ' },
  'home.comingSoon': { en: 'Coming soon', ml: 'ഉടൻ വരുന്നു' },

  // Status
  'status.online': { en: 'Online', ml: 'ഓൺലൈൻ' },
  'status.offline': { en: 'Offline', ml: 'ഓഫ്‌ലൈൻ' },
  'status.syncing': { en: 'Syncing...', ml: 'സിങ്ക് ചെയ്യുന്നു...' },
  'status.savedAt': { en: 'Saved at', ml: 'സേവ് ചെയ്തത്' },

  // Language
  'lang.en': { en: 'EN', ml: 'EN' },
  'lang.ml': { en: 'ML', ml: 'ML' },
};
