// Centralized Kinyarwanda translation dictionary for UFBC AGRODEALER.
// All user-facing strings route through this object so terminology stays
// consistent and no text is hardcoded in components.
export type AppLanguage = "rw" | "en";

const rw = {
  appName: "UFBC AGRODEALER",
  tagline: "Sisitemu yo Gucunga Ububiko n'Ubucuruzi",

  // ---- Auth ----
  signIn: "Injira",
  signUp: "Iyandikishe",
  ownerLogin: "Injira nk'umuyobozi",
  workerLogin: "Injira nk'umukozi",
  registerAccount: "Fungura konti",
  ownerLoginDesc: "Injira kugira ngo ucunge abakozi, amashami n'ububiko.",
  workerLoginDesc: "Injira kugira ngo ukore ibikorwa by'ishami ryawe.",
  registerAccountDesc: "Fungura konti nshya; umuyobozi azayigenera uruhare.",
  wrongPortal: "Iyi konti ntabwo yemerewe kwinjira muri iki gice.",
  signOut: "Sohoka",
  email: "Imeri",
  password: "Ijambo ry'ibanga",
  fullName: "Amazina yombi",
  phone: "Telefoni",
  haveAccount: "Usanzwe ufite konti?",
  noAccount: "Nta konti ufite?",
  welcome: "Murakaza neza",
  signInDesc: "Injira cyangwa wiyandikishe",
  signUpDesc: "Iyandikishe kugira ngo utangire",
  forgotPassword: "Wibagiwe ijambo ry'ibanga?",
  sendResetLink: "Ohereza link",
  backToAuth: "Subira inyuma",
  resetPassword: "Hindura Ijambo ry'ibanga",
  newPassword: "Ijambo ry'ibanga rishya",
  confirmPassword: "Emeza ijambo ry'ibanga",
  passwordTooShort: "Ijambo ry'ibanga rigomba kuba nibura inyuguti 6",
  passwordsDontMatch: "Amagambo y'ibanga ntabwo ahura",
  passwordChanged: "Ijambo ry'ibanga ryahinduwe neza",
  resetLinkSent: "Twakoherereje email yo guhindura ijambo ry'ibanga",
  invalidCredentials: "Imeri cyangwa ijambo ry'ibanga ntabwo bihuye. Ongera ugerageze.",
  userAlreadyRegistered: "Iyi imeri isanzwe ifite konti. Kanda kuri 'Injira' kugira ngo winjire.",
  weakPassword: "Ijambo ry'ibanga ryoroshye cyane. Koresha ijambo rikomeye (urugero: Ibanga#2026).",
  emailNotConfirmed: "Banza wemeze imeri yawe unyuze kuri link yohererejwe muri email yawe.",
  rateLimitExceeded: "Wagerageje inshuro nyinshi mu kanya gato. Banza utegereze gato.",
  signUpSuccessEmailSent: "Konti yafunguwe neza! Niba bikenewe kwemeza imeri, reba ubutumwa muri email yawe hanyuma winjire.",
  passwordHint: "Nibura inyuguti 6 (koresha inyuguti, imibare n'ibimenyetso)",

  // ---- Navigation ----
  dashboard: "Incamake",
  branches: "Amashami",
  products: "Ibicuruzwa",
  purchases: "Amasoko",
  sales: "Kugurisha",
  inventory: "Ububiko",
  reports: "Raporo",
  expenses: "Ibisohoka",
  users: "Abakozi",
  customers: "Abakiriya",
  targets: "Intego zo kugurisha",
  audit: "Igenzura ry'ibikorwa",
  transfers: "Iyimurwa ry'ububiko",

  // ---- Actions ----
  save: "Bika",
  cancel: "Reka",
  delete: "Siba",
  edit: "Hindura",
  update: "Hindura",
  search: "Shakisha",
  add: "Ongeraho",
  addFirst: "Ongeraho icya mbere",
  new: "Gishya",
  create: "Kora",
  view: "Reba",
  download: "Kuramo",
  select: "Hitamo",
  confirm: "Emeza",
  yes: "Yego",
  no: "Oya",
  loading: "Birategurwa...",
  noData: "Nta makuru ahari",
  actions: "Ibikorwa",
  export: "Sohokura",
  exportCsv: "Sohokura CSV",
  exportPdf: "Sohokura PDF",
  refresh: "Ongera utangire",
  clearFilter: "Siba iyungurura",
  applyFilter: "Koresha iyungurura",
  all: "Byose",

  // ---- Fields ----
  name: "Izina",
  code: "Kode",
  sku: "SKU",
  address: "Aderesi",
  location: "Ishami",
  status: "Imiterere",
  active: "Ikora",
  inactive: "Ntikora",
  category: "Icyiciro",
  buyingPrice: "Igiciro cyo kugura",
  sellingPrice: "Igiciro cyo kugurisha",
  currentStock: "Ububiko buhari",
  unit: "Igipimo",
  unitPrice: "Igiciro kuri kimwe",
  total: "Igiteranyo",
  totalAmount: "Igiteranyo cy'agaciro",
  supplier: "Uwatanze",
  branch: "Ishami",
  branchCode: "Kode y'ishami",
  product: "Igicuruzwa",
  quantity: "Ingano",
  transportCost: "Ikiguzi cyo gutwara",
  purchaseDate: "Itariki yo kurangura",
  saleDate: "Itariki yo kugurisha",
  expenseDate: "Itariki",
  description: "Ibisobanuro",
  amount: "Amafaranga",
  role: "Uruhare",
  owner: "Nyir'ubucuruzi",
  manager: "Umukozi",
  worker: "Umukozi",
  profit: "Inyungu",
  avgCost: "Igishingiro cy'igiciro",
  minStock: "Ububiko bwa kera",
  minCost: "Igiciro kigize",
  targetAmount: "Ingingo y'ubucuruzi",
  period: "Akagera",
  daily: "Buri munsi",
  monthly: "Buri kwezi",
  customer: "Umukiriya",
  customerName: "Izina ry'umukiriya",
  customerPhone: "Telefoni y'umukiriya",

  // ---- Categories ----
  ifumbire: "Ifumbire",
  imbuto: "Imbuto",
  categoryAll: "Icyiciro byose",

  // ---- Stock status ----
  inStock: "Hari",
  lowStock: "Birahari",
  outOfStock: "Byanka",
  stockStatus: "Imiterere y'ububiko",

  // ---- Dashboard ----
  todaySales: "Igurishwa ry'uyu munsi",
  todayProfit: "Inyungu y'uyu munsi",
  todayExpenses: "Ibyakoreshejwe by'uyu munsi",
  todayNet: "Inyungu iheruka y'uyu munsi",
  remainingStock: "Ububiko bwo muri iki gihe",
  lowStockLabel: "Ibicuruzwa bike",
  recentTransactions: "Ibikorwa biheruka",
  totalBranches: "Amashami yose",
  totalProducts: "Ibicuruzwa byose",
  totalWorkers: "Abakozi bose",
  totalInventoryValue: "Agaciro k'ububiko bwose",
  monthlyRevenue: "Imari y'ukwezi",
  monthlyProfit: "Inyungu y'ukwezi",
  currentBranch: "Ishami ryo muri iki gihe",
  salesTarget: "Intego y'ubucuruzi",
  salesAchieved: "Yamaze gukurura",
  salesRemaining: "Yanditse",
  targetProgress: "Imbere mu rwego rw'ingingo",
  businessOverview: "Ibonerahamwe by'ubucuruzi",
  branchPerformance: "Imikorere y'ishami",
  revenue: "Imari",
  expense: "Igishoro",
  noActiveBranches: "Nta ishami rikora",
  noProducts: "Nta bicuruzwa",
  noStock: "Nta bubiko buhari",
  setupRequired: "Gahunda ikaba ariyo",

  // ---- Reports ----
  dailyReport: "Raporo y'umunsi",
  monthlyReport: "Raporo y'ukwezi",
  inventoryReport: "Raporo y'ububiko",
  salesReport: "Raporo y'igurisha",
  downloadPdf: "Manura PDF",
  totalSales: "Igurishwa ryose",
  totalProfit: "Inyungu yose",
  totalPurchases: "Amasoko yose",
  totalExpenses: "Ibyakoreshejwe byose",
  netProfit: "Inyungu iheruka",
  grossProfit: "Inyungu isukuyemo",
  costOfGoods: "Igiciro cyo gukora ibintu",
  date: "Itariki",
  from: "Kuva",
  to: "Kugeza",
  productsSold: "Ibicuruzwa bigurizwe",
  quantitySold: "Ingano y'ibicuruzwa",
  bestSelling: "Ibicuruzwa bitaranze",
  filter: "Fila",
  apply: "Shyiraho",

  // ---- Messages ----
  saved: "Byabitswe neza",
  deleted: "Byasibwe neza",
  updated: "Byahinduwe neza",
  error: "Habaye ikosa",
  errorGeneric: "Habaye ikosa. Ongera ugerageza cyangwa ubaze umuyobozi.",
  confirmDelete: "Wemeza gusiba iki?",
  requiredField: "Iki cyanya ni ngombwa",
  invalidNumber: "Umubare ntukwiye",
  invalidEmail: "Imeri ntikwiye",
  noStockEnough: "Ububiko ntibuhagije",
  noStockForProduct: "Iki gicuruzwa nta bubiko gifite",
  chooseBranch: "Hitamo ishami",
  chooseProduct: "Hitamo igicuruzwa",
  chooseCustomer: "Hitamo umukiriya",
  addFirstBranch: "Banza wongereho ishami",
  addFirstProduct: "Banza wongereho igicuruzwa",
  addFirstCustomer: "Banza wongereho umukiriya",
  onlyOwner: "Gusa umuyobozi wemerewe",
  unauthorized: "Ntibyemewe",
  operationFailed: "Ikosa mu bikorwa: {error}",
  customerRequired: "Umukiriya ni ngombwa kugira ngo wanditse igurisha",
  transferComplete: "Iyimurwa ry'ububiko ryakozwe neza",
  stockAdjusted: "Ububiko bwahinduwe",
  stockAdjustment: "Hindura ububiko",
  targetSet: "Intego yohereywe",
  noBranchesAvailable: "Nta shami rihari",
  noProductsAvailable: "Nta gicuruzwa gihari",

  // ---- Status badges ----
  statusSuccess: "Byagenzenwe neza",
  statusError: "Ibosa",
  statusPending: "Bikaba bigenda",
  statusDraft: "Mu nini",

  // ---- Currency ----
  rwf: "RWF",
  currency: "Amafaranga",
  language: "Ururimi",
  kinyarwanda: "Ikinyarwanda",
  english: "English",
  account: "Konti yanjye",
  accountSettings: "Igenamiterere rya konti",
  changePassword: "Hindura ijambo ry'ibanga",
  passwordUpdated: "Ijambo ry'ibanga ryahinduwe neza.",
  removeWorker: "Kuraho umukozi",
  removeWorkerTitle: "Kuraho umukozi muri sisitemu?",
  removeWorkerDesc: "Konti y'uyu mukozi izafungwa burundu. Amakuru y'ibikorwa yakoze azaguma muri sisitemu.",
  workerRemoved: "Umukozi yavanywe muri sisitemu.",
  cannotRemoveOwner: "Abayobozi ntibavanwa muri iki gice.",
  addWorker: "Ongeraho umukozi",
  inviteWorker: "Ohereza ubutumire ku mukozi",
  workerInvited: "Ubutumire bwo gufungura konti bwoherejwe neza.",
  workerInviteDesc: "Umukozi azahabwa email yo gushyiraho ijambo ry'ibanga, hanyuma ajye yinjira gusa.",
};

const en: Partial<typeof rw> = {
  tagline: "Inventory and Business Management System",
  signIn: "Sign in", signUp: "Sign up", signOut: "Sign out", email: "Email", password: "Password",
  fullName: "Full name", phone: "Phone", forgotPassword: "Forgot password?", sendResetLink: "Send reset link",
  backToAuth: "Back to sign in", resetPassword: "Reset password", newPassword: "New password", confirmPassword: "Confirm password",
  dashboard: "Overview", branches: "Branches", products: "Products", purchases: "Purchases", sales: "Sales",
  inventory: "Inventory", reports: "Reports", expenses: "Expenses", users: "Users", customers: "Customers",
  targets: "Sales targets", audit: "Activity audit", transfers: "Stock transfers", save: "Save", cancel: "Cancel",
  delete: "Delete", edit: "Edit", update: "Update", search: "Search", add: "Add", addFirst: "Add first",
  new: "New", create: "Create", view: "View", download: "Download", select: "Select", confirm: "Confirm",
  yes: "Yes", no: "No", loading: "Loading...", noData: "No data available", actions: "Actions",
  export: "Export", exportCsv: "Export CSV", exportPdf: "Export PDF", refresh: "Refresh", clearFilter: "Clear filters", applyFilter: "Apply filters", all: "All",
  name: "Name", code: "Code", address: "Address", location: "Branch", status: "Status", active: "Active", inactive: "Inactive", category: "Category",
  buyingPrice: "Purchase price", sellingPrice: "Selling price", currentStock: "Current stock", unit: "Unit", unitPrice: "Unit price", total: "Total", totalAmount: "Total value",
  supplier: "Supplier", branch: "Branch", branchCode: "Branch code", product: "Product", quantity: "Quantity", transportCost: "Transport cost", purchaseDate: "Purchase date", saleDate: "Sale date", expenseDate: "Date", description: "Description", amount: "Amount", role: "Role", owner: "Owner", manager: "Worker", worker: "Worker", profit: "Profit",
  daily: "Daily", monthly: "Monthly", customer: "Customer", customerName: "Customer name", customerPhone: "Customer phone", categoryAll: "All categories", inStock: "In stock", lowStock: "Low stock", outOfStock: "Out of stock", stockStatus: "Stock status",
  todaySales: "Today's sales", todayProfit: "Today's profit", todayExpenses: "Today's expenses", todayNet: "Today's net profit", recentTransactions: "Recent transactions", totalBranches: "Total branches", totalProducts: "Total products", totalWorkers: "Total workers", totalInventoryValue: "Total inventory value", monthlyRevenue: "Monthly revenue", monthlyProfit: "Monthly profit", currentBranch: "Current branch", salesTarget: "Sales target", salesAchieved: "Sales achieved", salesRemaining: "Remaining", businessOverview: "Business overview", branchPerformance: "Branch performance", revenue: "Revenue", expense: "Expense",
  saved: "Saved successfully", deleted: "Deleted successfully", updated: "Updated successfully", error: "An error occurred", errorGeneric: "An error occurred. Please try again or contact an administrator.", requiredField: "This field is required", invalidEmail: "Invalid email address", noStockEnough: "Insufficient stock", chooseBranch: "Select a branch", chooseProduct: "Select a product", chooseCustomer: "Select a customer", onlyOwner: "Owner access only", unauthorized: "Not authorized",
  language: "Language", kinyarwanda: "Kinyarwanda", english: "English", account: "My account", accountSettings: "Account settings", changePassword: "Change password", passwordUpdated: "Password updated successfully.", removeWorker: "Remove worker", removeWorkerTitle: "Remove worker from the system?", removeWorkerDesc: "This worker's account will be permanently closed. Their business activity records will remain.", workerRemoved: "Worker removed from the system.", cannotRemoveOwner: "Owners cannot be removed here.",
  addWorker: "Add worker", inviteWorker: "Invite worker", workerInvited: "Account invitation sent successfully.", workerInviteDesc: "The worker will receive an email to set a password, then only needs to sign in.",
};

export function getLanguage(): AppLanguage {
  if (typeof window === "undefined") return "rw";
  return window.localStorage.getItem("ufbc-language") === "en" ? "en" : "rw";
}

export function setLanguage(language: AppLanguage) {
  window.localStorage.setItem("ufbc-language", language);
}

export const t = new Proxy(rw, {
  get(target, property: keyof typeof rw) {
    return getLanguage() === "en" ? en[property] ?? target[property] : target[property];
  },
});

// Number & currency formatting helpers
export function money(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return `${v.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${t.rwf}`;
}

export function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB");
}

export function fmtDateTime(d: string | Date | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function numberFmt(n: number | string | null | undefined) {
  return Number(n ?? 0).toLocaleString("en-US");
}

export function formatErrorMessage(err: unknown): string {
  if (!err) return t.errorGeneric;
  const msg =
    typeof err === "object" && err !== null && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err);
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : "";

  const lower = `${msg} ${code}`.toLowerCase();

  // RLS / permissions
  if (
    lower.includes("row-level security") ||
    lower.includes("row level security") ||
    lower.includes("insufficient_privilege") ||
    lower.includes("permission denied") ||
    code === "42501"
  ) {
    return "Ntabwo wemerewe gukora iki gikorwa. Cyemerewe gusa nyir'ubucuruzi.";
  }

  // Duplicate / Unique constraint
  if (
    lower.includes("unique constraint") ||
    lower.includes("duplicate key") ||
    code === "23505"
  ) {
    return "Iki kintu cyangwa iyi kode isanzwe ibaho mu bubiko.";
  }

  // Foreign key / Reference constraint
  if (lower.includes("foreign key") || code === "23503") {
    return "Ntibishoboka: Iki kintu gifite amakuru akigenderaho mu yandi madosiye.";
  }

  // Stock not enough
  if (lower.includes("ububiko ntibuhagije") || lower.includes("stock")) {
    return t.noStockEnough;
  }

  // Customer required
  if (lower.includes("umukiriya ni ngombwa")) {
    return t.customerRequired;
  }

  // Auth specific
  if (
    lower.includes("weak_password") ||
    lower.includes("weak password") ||
    lower.includes("easy to guess") ||
    lower.includes("pwned")
  ) {
    return t.weakPassword;
  }
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid_credentials") ||
    lower.includes("invalid username or password")
  ) {
    return t.invalidCredentials;
  }
  if (
    lower.includes("already registered") ||
    lower.includes("user_already_exists") ||
    lower.includes("already exists")
  ) {
    return t.userAlreadyRegistered;
  }
  if (
    lower.includes("email not confirmed") ||
    lower.includes("email_not_confirmed")
  ) {
    return t.emailNotConfirmed;
  }
  if (
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("over_email_send_rate_limit")
  ) {
    return t.rateLimitExceeded;
  }
  if (
    lower.includes("invalid email") ||
    lower.includes("email_address_invalid")
  ) {
    return t.invalidEmail;
  }

  return msg || t.errorGeneric;
}

export const formatAuthError = formatErrorMessage;


