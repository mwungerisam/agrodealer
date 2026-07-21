// Kinyarwanda strings used across the app
export const t = {
  appName: "UFBC AGRODEALER",
  tagline: "Ivunganirizo ry'Ububiko n'Ubucuruzi",

  // Auth
  signIn: "Injira",
  signUp: "Iyandikishe",
  signOut: "Sohoka",
  email: "Imeri",
  password: "Ijambo ry'ibanga",
  fullName: "Amazina yombi",
  phone: "Telefoni",
  haveAccount: "Usanzwe ufite konti?",
  noAccount: "Nta konti ufite?",
  welcome: "Murakaza neza",
  signInDesc: "Injira mu bwiyandikishe bwawe",
  signUpDesc: "Iyandikishe kugira ngo utangire",

  // Nav
  dashboard: "Ikibaho",
  branches: "Amashami",
  products: "Ibicuruzwa",
  purchases: "Kurangura",
  sales: "Kugurisha",
  inventory: "Ububiko",
  reports: "Raporo",
  expenses: "Ibyakoreshejwe",
  users: "Abakoresha",

  // Actions
  save: "Bika",
  cancel: "Reka",
  delete: "Siba",
  edit: "Hindura",
  update: "Hindura",
  search: "Shakisha",
  add: "Ongeraho",
  create: "Kora",
  view: "Reba",
  download: "Manura",
  select: "Hitamo",
  confirm: "Emeza",
  yes: "Yego",
  no: "Oya",
  loading: "Birategurwa...",
  noData: "Nta makuru ahari",
  actions: "Ibikorwa",

  // Fields
  name: "Izina",
  address: "Aderesi",
  status: "Imimerere",
  active: "Ikora",
  inactive: "Ntikora",
  category: "Icyiciro",
  buyingPrice: "Igiciro cyo kugura",
  sellingPrice: "Igiciro cyo kugurisha",
  currentStock: "Ububiko bwo muri iki gihe",
  unit: "Igipimo",
  supplier: "Uwatanze",
  branch: "Ishami",
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
  manager: "Umucungamutungo",
  profit: "Inyungu",

  // Categories
  ifumbire: "Ifumbire",
  imbuto: "Imbuto",

  // Dashboard
  todaySales: "Igurishwa ry'uyu munsi",
  todayProfit: "Inyungu y'uyu munsi",
  remainingStock: "Ububiko busigaye",
  lowStock: "Ibicuruzwa bike",
  recentTransactions: "Ibikorwa biheruka",
  totalBranches: "Amashami yose",
  totalProducts: "Ibicuruzwa byose",

  // Reports
  dailyReport: "Raporo y'umunsi",
  monthlyReport: "Raporo y'ukwezi",
  downloadPdf: "Manura PDF",
  totalSales: "Igurishwa ryose",
  totalProfit: "Inyungu yose",
  totalPurchases: "Kurangura kose",
  totalExpenses: "Ibyakoreshejwe byose",
  netProfit: "Inyungu iheruka",
  date: "Itariki",
  from: "Kuva",
  to: "Kugeza",

  // Messages
  saved: "Byabitswe neza",
  deleted: "Byasibwe neza",
  updated: "Byahinduwe neza",
  error: "Habaye ikosa",
  confirmDelete: "Wemeza gusiba?",
  requiredField: "Iki cyanya ni ngombwa",
  invalidNumber: "Umubare ntukwiye",
  noStockEnough: "Ububiko ntibuhagije",
  chooseBranch: "Hitamo ishami",
  chooseProduct: "Hitamo igicuruzwa",
  addFirstBranch: "Banza wongereho ishami",
  addFirstProduct: "Banza wongereho igicuruzwa",
  onlyOwner: "Nyir'ubucuruzi gusa niwe ubyemerewe",

  // Currency
  rwf: "RWF",
};

export function money(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return `${v.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${t.rwf}`;
}

export function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB");
}
