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

  // Inventory
  'inv.totalItems': { en: 'Total Items', ml: 'ആകെ ഇനങ്ങൾ' },
  'inv.lowStock': { en: 'Low Stock', ml: 'കുറഞ്ഞ സ്റ്റോക്ക്' },
  'inv.expiringSoon': { en: 'Expiring Soon', ml: 'കാലഹരണം അടുത്ത്' },
  'inv.needsReorder': { en: 'Needs Reorder', ml: 'റീഓർഡർ വേണം' },
  'inv.stockTab': { en: 'Stock', ml: 'സ്റ്റോക്ക്' },
  'inv.expiryTab': { en: 'Expiry Tracker', ml: 'കാലഹരണ ട്രാക്കർ' },
  'inv.searchPlaceholder': { en: 'Search items...', ml: 'ഇനങ്ങൾ തിരയുക...' },
  'inv.allCategories': { en: 'All Categories', ml: 'എല്ലാ വിഭാഗങ്ങളും' },
  'inv.item': { en: 'Item', ml: 'ഇനം' },
  'inv.category': { en: 'Category', ml: 'വിഭാഗം' },
  'inv.stock': { en: 'Stock', ml: 'സ്റ്റോക്ക്' },
  'inv.par': { en: 'Par', ml: 'പാർ' },
  'inv.status': { en: 'Status', ml: 'സ്ഥിതി' },
  'inv.actions': { en: 'Actions', ml: 'പ്രവർത്തനങ്ങൾ' },
  'inv.addStock': { en: 'Add Stock', ml: 'സ്റ്റോക്ക് ചേർക്കുക' },
  'inv.removeStock': { en: 'Remove Stock', ml: 'സ്റ്റോക്ക് കുറയ്ക്കുക' },
  'inv.quantity': { en: 'Quantity', ml: 'അളവ്' },
  'inv.addExpiry': { en: 'Add Expiry', ml: 'കാലഹരണം ചേർക്കുക' },
  'inv.selectItem': { en: 'Select item', ml: 'ഇനം തിരഞ്ഞെടുക്കുക' },
  'inv.batchLabel': { en: 'Batch label (optional)', ml: 'ബാച്ച് ലേബൽ' },
  'inv.save': { en: 'Save', ml: 'സേവ്' },
  'inv.batch': { en: 'Batch', ml: 'ബാച്ച്' },
  'inv.qty': { en: 'Qty', ml: 'എണ്ണം' },
  'inv.expiryDate': { en: 'Expiry Date', ml: 'കാലഹരണ തീയതി' },
  'inv.daysLeft': { en: 'Days Left', ml: 'ദിവസങ്ങൾ' },
  'inv.expired': { en: 'Expired', ml: 'കാലഹരണം' },
  'inv.dispose': { en: 'Dispose', ml: 'നീക്കം ചെയ്യുക' },
  'inv.noExpiry': { en: 'No expiry items tracked', ml: 'കാലഹരണ ഇനങ്ങൾ ഇല്ല' },

  // Purchase
  'purchase.title': { en: 'Purchase Orders', ml: 'പർച്ചേസ് ഓർഡറുകൾ' },
  'purchase.newOrder': { en: 'New Order', ml: 'പുതിയ ഓർഡർ' },
  'purchase.suggestedItems': { en: 'Suggested (low stock)', ml: 'നിർദ്ദേശിച്ചവ (കുറഞ്ഞ സ്റ്റോക്ക്)' },
  'purchase.addItem': { en: 'Add item to order', ml: 'ഓർഡറിൽ ചേർക്കുക' },
  'purchase.cart': { en: 'Cart', ml: 'കാർട്ട്' },
  'purchase.submitOrder': { en: 'Submit Order', ml: 'ഓർഡർ സമർപ്പിക്കുക' },
  'purchase.orderCreated': { en: 'Order submitted', ml: 'ഓർഡർ സമർപ്പിച്ചു' },
  'purchase.orderId': { en: 'Order ID', ml: 'ഓർഡർ ID' },
  'purchase.requestedBy': { en: 'Requested By', ml: 'അഭ്യർത്ഥിച്ചത്' },
  'purchase.date': { en: 'Date', ml: 'തീയതി' },
  'purchase.approve': { en: 'Approve', ml: 'അംഗീകരിക്കുക' },
  'purchase.cancel': { en: 'Cancel', ml: 'റദ്ദാക്കുക' },
  'purchase.markOrdered': { en: 'Mark Ordered', ml: 'ഓർഡർ ചെയ്തു' },
  'purchase.receive': { en: 'Receive', ml: 'സ്വീകരിക്കുക' },
  'purchase.viewProof': { en: 'View Proof', ml: 'തെളിവ് കാണുക' },
  'purchase.noOrders': { en: 'No purchase orders yet', ml: 'ഓർഡറുകൾ ഇല്ല' },
  'purchase.receiveOrder': { en: 'Receive Order', ml: 'ഓർഡർ സ്വീകരിക്കുക' },
  'purchase.proofPhoto': { en: 'Proof Photo', ml: 'തെളിവ് ഫോട്ടോ' },
  'purchase.proofRequired': { en: 'Photo proof is required to receive', ml: 'സ്വീകരിക്കാൻ ഫോട്ടോ തെളിവ് ആവശ്യമാണ്' },
  'purchase.notes': { en: 'Notes', ml: 'കുറിപ്പുകൾ' },
  'purchase.notesPlaceholder': { en: 'Any issues or notes...', ml: 'കുറിപ്പുകൾ...' },
  'purchase.confirmReceive': { en: 'Confirm Received', ml: 'സ്വീകരിച്ചു സ്ഥിരീകരിക്കുക' },
  'purchase.received': { en: 'Order received!', ml: 'ഓർഡർ സ്വീകരിച്ചു!' },
};
