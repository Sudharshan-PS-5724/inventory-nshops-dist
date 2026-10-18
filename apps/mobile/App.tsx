import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { useState } from "react";
import { LiveApp } from './src/live/LiveApp';
import { hasLiveConfiguration } from './src/auth/supabase';
import {
  NunitoSans_400Regular,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
} from "@expo-google-fonts/nunito-sans";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  activities,
  adminMenu,
  products,
  reports,
  Role,
  sales,
  shopMenu,
  shops,
} from "./src/mock-data";
import {
  AppColors,
  ColorMode,
  darkColors,
  font,
  lightColors,
  radius,
  spacing,
  typeface,
} from "./src/theme";

type Screen =
  | "home"
  | "inventory"
  | "activity"
  | "more"
  | "opening-stock"
  | "purchases"
  | "suppliers"
  | "transfers"
  | "wastage"
  | "recovery-sales"
  | "expenses"
  | "sales"
  | "sale-detail"
  | "notifications"
  | "reports"
  | "products"
  | "product-detail"
  | "price-history"
  | "shops"
  | "users"
  | "devices"
  | "adjustments"
  | "audit-log"
  | "account";
type Product = (typeof products)[number];
const root = ["home", "inventory", "activity", "more"] as const;
const titles: Record<Screen, string> = {
  home: "Today",
  inventory: "Inventory",
  activity: "Activity",
  more: "More",
  "opening-stock": "Opening stock",
  purchases: "Purchases",
  suppliers: "Suppliers",
  transfers: "Transfers",
  wastage: "Wastage",
  "recovery-sales": "Recovery sales",
  expenses: "Expenses",
  sales: "Machine sales",
  "sale-detail": "Sale details",
  notifications: "Low-stock alerts",
  reports: "Reports",
  products: "Products & pricing",
  "product-detail": "Product details",
  "price-history": "Price history",
  shops: "Shops & locations",
  users: "Users & access",
  devices: "Weighing machines",
  adjustments: "Stock adjustments",
  "audit-log": "Audit history",
  account: "My account",
};
const asScreen = (value: string) => value as Screen;

function Pill({
  children,
  tone = "neutral",
}: {
  children: string;
  tone?: "neutral" | "good" | "warn" | "blue";
}) {
  return (
    <Text
      style={[
        styles.pill,
        styles[`pill${tone[0].toUpperCase()}${tone.slice(1)}` as "pillNeutral"],
      ]}
    >
      {children}
    </Text>
  );
}
function Row({
  icon,
  title,
  subtitle,
  right,
  onPress,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const body = (
    <View style={styles.row}>
      {icon && (
        <View style={styles.rowIcon}>
          <Text style={styles.rowIconText}>{icon}</Text>
        </View>
      )}
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      {right ?? (onPress && <Text style={styles.chevron}>›</Text>)}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{body}</Pressable> : body;
}
function Heading({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.heading}>
      <Text style={styles.headingText}>{title}</Text>
      {action && (
        <Pressable onPress={onPress}>
          <Text style={styles.textAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}
function PrimaryButton({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress?: () => void;
  icon?: string;
}) {
  return (
    <Pressable style={styles.primary} onPress={onPress}>
      <Text style={styles.primaryText}>
        {icon ? `${icon}  ` : ""}
        {label}
      </Text>
    </Pressable>
  );
}
function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricNote}>{note}</Text>
    </View>
  );
}
function ProductRow({
  item,
  onPress,
  showPrice = false,
}: {
  item: Product;
  onPress?: () => void;
  showPrice?: boolean;
}) {
  return (
    <Row
      icon={item.name[0]}
      title={item.name}
      subtitle={`PLU ${item.plu} · ${item.category}`}
      onPress={onPress}
      right={
        <View style={styles.productRight}>
          {showPrice && (
            <Text style={styles.mutedSmall}>₹ {item.price}/kg</Text>
          )}
          <Text style={styles.stock}>{item.stock.toFixed(1)} kg</Text>
          <Pill tone={item.status === "Low" ? "warn" : "good"}>
            {item.status === "Low" ? "Low stock" : "Healthy"}
          </Pill>
        </View>
      }
    />
  );
}
function FormCard({
  title,
  copy,
  fields,
  button,
  onSave,
}: {
  title: string;
  copy: string;
  fields: readonly (readonly [string, string])[];
  button: string;
  onSave: () => void;
}) {
  return (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>{title}</Text>
      <Text style={styles.formCopy}>{copy}</Text>
      {fields.map(([label, value]) => (
        <Pressable key={label} style={styles.formLine}>
          <Text style={styles.formLabel}>{label}</Text>
          <Text style={styles.formValue}>{value}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
      <PrimaryButton label={button} onPress={onSave} />
    </View>
  );
}

export default function App() {
  const [fallback, setFallback] = useState(false);
  if (hasLiveConfiguration && !fallback) return <LiveApp onPreview={() => setFallback(true)} />;
  return <View style={{ flex: 1 }}><Pressable accessibilityRole={fallback ? 'button' : 'text'} disabled={!fallback} onPress={() => setFallback(false)} style={{ padding: 18, backgroundColor: '#CCFF33' }}><Text style={{ color: '#004B23' }}>{fallback ? 'Demo data only. Tap to reconnect to the live workspace.' : 'Demo data only. Configure Supabase and the API to use live inventory.'}</Text></Pressable><PreviewApp /></View>;
}

function PreviewApp() {
  const [fontsLoaded] = useFonts({
    NunitoSans_400Regular,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
    NunitoSans_800ExtraBold,
  });
  const [screen, setScreen] = useState<Screen>("home");
  const [role, setRole] = useState<Role>("Administrator");
  const [colorMode, setColorMode] = useState<ColorMode>("light");
  const [shop, setShop] = useState("All locations");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [product, setProduct] = useState<Product>(products[0]);
  const [saleId, setSaleId] = useState<string>(sales[0].id);
  const [toast, setToast] = useState<string | null>(null);
  const [opening, setOpening] = useState<Record<string, string>>(
    Object.fromEntries(products.map((p) => [p.id, p.stock.toString()])),
  );
  const isAdmin = role === "Administrator";
  const activeShop = isAdmin ? shop : "Shop One";
  activeColors = colorMode === "dark" ? darkColors : lightColors;
  styles = createStyles(activeColors);
  if (!fontsLoaded) return null;
  const go = (next: Screen) => {
    setScreen(next);
    setToast(null);
  };
  const save = (label: string) =>
    setToast(`${label} saved in this preview. No live inventory was changed.`);
  const content = () => {
    switch (screen) {
      case "home":
        return <Home go={go} setProduct={setProduct} />;
      case "inventory":
        return <Inventory go={go} setProduct={setProduct} shop={activeShop} />;
      case "activity":
        return <Activity go={go} />;
      case "more":
        return <More isAdmin={isAdmin} go={go} />;
      case "opening-stock":
        return (
          <Opening
            values={opening}
            setValues={setOpening}
            save={() => save("Opening stock")}
          />
        );
      case "purchases":
        return <Purchases go={go} save={() => save("Purchase")} />;
      case "suppliers":
        return <Suppliers go={go} />;
      case "transfers":
        return <Transfers save={() => save("Transfer")} />;
      case "wastage":
        return <Wastage save={() => save("Wastage")} />;
      case "recovery-sales":
        return <Recovery save={() => save("Recovery sale")} />;
      case "expenses":
        return <Expenses save={() => save("Expense")} />;
      case "sales":
        return <Sales go={go} setSaleId={setSaleId} />;
      case "sale-detail":
        return <SaleDetail saleId={saleId} />;
      case "notifications":
        return <Alerts />;
      case "reports":
        return <Reports go={go} />;
      case "products":
        return <Products go={go} setProduct={setProduct} />;
      case "product-detail":
        return (
          <ProductDetail
            product={product}
            go={go}
            save={() => save("Product changes")}
          />
        );
      case "price-history":
        return <PriceHistory />;
      case "shops":
        return <Shops />;
      case "users":
        return <Users />;
      case "devices":
        return <Devices />;
      case "adjustments":
        return <Adjustments save={() => save("Stock adjustment")} />;
      case "audit-log":
        return <Audit />;
      case "account":
        return (
          <Account
            role={role}
            setRole={setRole}
            colorMode={colorMode}
            setColorMode={setColorMode}
            go={go}
          />
        );
    }
  };
  const isRoot = root.includes(screen as (typeof root)[number]);
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <StatusBar style={colorMode === "dark" ? "light" : "dark"} />
        <View style={[styles.page, screen === "home" && styles.marketPage]}>
          {screen === "home" ? (
            <View style={styles.marketHeader}>
              <Pressable
                style={styles.marketLocation}
                onPress={() => setPickerOpen(true)}
              >
                <Text style={styles.locationGlyph}>⌖</Text>
                <View style={styles.marketLocationCopy}>
                  <View style={styles.marketTitleRow}>
                    <Text style={styles.marketTitle}>{activeShop}</Text>
                    <Text style={styles.marketChevron}>⌄</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.marketSubtitle}>
                    Fresh fruit and vegetable stock
                  </Text>
                </View>
              </Pressable>
              <Pressable
                style={styles.offersButton}
                onPress={() => go("notifications")}
              >
                <Text style={styles.offersGlyph}>!</Text>
                <Text style={styles.offersText}>Stock alerts</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.header}>
              {isRoot ? (
                <Pressable style={styles.logo} onPress={() => go("home")}>
                  <Text style={styles.logoText}>K</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.back} onPress={() => go("more")}>
                  <Text style={styles.backText}>‹</Text>
                </Pressable>
              )}
              <Pressable
                style={styles.headerCopy}
                onPress={() => setPickerOpen(true)}
              >
                <Text style={styles.headerTitle}>{titles[screen]}</Text>
                <Text numberOfLines={1} style={styles.headerSub}>
                  {activeShop}  ⌄
                </Text>
              </Pressable>
              <Pressable
                style={styles.avatar}
                onPress={() => setProfileOpen(true)}
              >
                <Text style={styles.avatarText}>PS</Text>
              </Pressable>
            </View>
          )}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scroll,
              screen === "home" && styles.marketScroll,
            ]}
          >
            {toast && (
              <Pressable style={styles.toast} onPress={() => setToast(null)}>
                <Text style={styles.toastText}>{toast}</Text>
                <Text style={styles.toastX}>×</Text>
              </Pressable>
            )}
            {content()}
          </ScrollView>
          {isRoot && (
            <View style={styles.nav}>
              {root.map((item) => (
                <Pressable
                  key={item}
                  style={styles.navItem}
                  onPress={() => go(item)}
                >
                  <Text
                    style={[
                      styles.navIcon,
                      screen === item && styles.navActive,
                    ]}
                  >
                    {item === "home"
                      ? "⌂"
                      : item === "inventory"
                        ? "▦"
                        : item === "activity"
                          ? "◷"
                          : "☰"}
                  </Text>
                  <Text
                    style={[
                      styles.navText,
                      screen === item && styles.navTextActive,
                    ]}
                  >
                    {item === "home"
                      ? "Today"
                      : item[0].toUpperCase() + item.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
        <Modal
          visible={pickerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setPickerOpen(false)}
        >
          <View style={styles.scrim}>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>View location</Text>
              <Text style={styles.sheetCopy}>
                {isAdmin
                  ? "Choose the inventory scope for this preview."
                  : "Your assigned shop is set by access policy."}
              </Text>
              {shops.map((item) => (
                <Pressable
                  key={item}
                  disabled={!isAdmin}
                  style={styles.location}
                  onPress={() => {
                    setShop(item);
                    setPickerOpen(false);
                  }}
                >
                  <Text style={styles.locationText}>{item}</Text>
                  {item === activeShop && <Text style={styles.check}>✓</Text>}
                </Pressable>
              ))}
              <Pressable onPress={() => setPickerOpen(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        <Modal
          visible={profileOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setProfileOpen(false)}
        >
          <View style={styles.scrim}>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>PS</Text>
              <Text style={styles.sheetCopy}>
                {role} · {activeShop}
              </Text>
              <Pressable
                style={styles.location}
                onPress={() => {
                  setProfileOpen(false);
                  go("account");
                }}
              >
                <Text style={styles.locationText}>Account & preview role</Text>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
              <Pressable
                style={styles.location}
                onPress={() => {
                  setProfileOpen(false);
                  go("notifications");
                }}
              >
                <Text style={styles.locationText}>Low-stock alerts</Text>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
              <Pressable onPress={() => setProfileOpen(false)}>
                <Text style={styles.cancel}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Home({
  go,
  setProduct,
}: {
  go: (s: Screen) => void;
  setProduct: (product: Product) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<
    "All" | "Fruit" | "Vegetable" | "Leafy"
  >("All");
  const categories = [
    ["🍎", "Fruits", "Fruit", activeColors.warning],
    ["🍅", "Vegetables", "Vegetable", activeColors.yellow],
    ["🥬", "Leafy greens", "Leafy", activeColors.green],
    ["🥕", "All", "All", activeColors.blue],
  ] as const;
  const displayNames: Record<string, string> = {
    p1: "Banana",
    p2: "Tomato",
    p3: "Green chilli",
    p4: "Coriander",
    p5: "Cabbage",
    p6: "Apple",
  };
  const produceImages: Record<string, string> = {
    p1: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=240&h=260&fit=crop",
    p2: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=240&h=260&fit=crop",
    p3: "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=240&h=260&fit=crop",
    p4: "https://images.unsplash.com/photo-1628773822503-930a7eaecf80?w=240&h=260&fit=crop",
    p5: "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=240&h=260&fit=crop",
    p6: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=240&h=260&fit=crop",
  };
  const visibleProducts = products.filter((item) => {
    const matchesQuery = displayNames[item.id]
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    const matchesCategory =
      activeCategory === "All" ||
      (activeCategory === "Vegetable"
        ? item.category !== "Fruit"
        : item.category === activeCategory);
    return matchesQuery && matchesCategory;
  });

  return (
    <>
      <View style={styles.homeSearch}>
        <Text style={styles.homeSearchIcon}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search fruits and vegetables"
          placeholderTextColor={activeColors.inkMuted}
          style={styles.homeSearchInput}
          returnKeyType="search"
        />
        <Text style={styles.homeSearchFilter}>☷</Text>
      </View>
      <View style={styles.marketPromos}>
        <Pressable
          style={[styles.marketPromo, styles.vegetablePromo]}
          onPress={() => go("inventory")}
        >
          <Text style={styles.promoTitle}>Fresh vegetables</Text>
          <Text style={styles.promoCopy}>Available at your location</Text>
          <View style={styles.promoArrow}>
            <Text style={styles.promoArrowText}>›</Text>
          </View>
          <Image
            source={{ uri: produceImages.p2 }}
            style={styles.promoImage}
            accessibilityLabel="Fresh tomatoes"
            resizeMode="cover"
          />
        </Pressable>
        <Pressable
          style={[styles.marketPromo, styles.fruitPromo]}
          onPress={() => go("inventory")}
        >
          <Text style={styles.promoTitle}>Seasonal fruits</Text>
          <Text style={styles.promoCopy}>Fresh stock every day</Text>
          <View style={styles.promoArrow}>
            <Text style={styles.promoArrowText}>›</Text>
          </View>
          <Image
            source={{ uri: produceImages.p6 }}
            style={styles.promoImage}
            accessibilityLabel="Fresh apples"
            resizeMode="cover"
          />
        </Pressable>
      </View>

      <View style={styles.categoryRow}>
        {categories.map(([icon, label, filter, color]) => (
          <Pressable
            key={label}
            style={styles.categoryItem}
            onPress={() => setActiveCategory(filter)}
          >
            <View
              style={[
                styles.categoryArt,
                { backgroundColor: color },
                activeCategory === filter && styles.categoryArtActive,
              ]}
            >
              <Text style={styles.categoryEmoji}>{icon}</Text>
            </View>
            <Text style={styles.categoryLabel}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.produceHeading}>
        <View>
          <Text style={styles.produceHeadingText}>
            {activeCategory === "All" ? "Popular produce" : `${activeCategory} picks`}
          </Text>
          <Text style={styles.produceHeadingSub}>Fresh stock at your location</Text>
        </View>
        <Pressable
          style={styles.seeAllButton}
          onPress={() => go("inventory")}
        >
          <Text style={styles.seeAllText}>SEE ALL</Text>
        </Pressable>
      </View>
      <View style={styles.productsGrid}>
        {visibleProducts.map((item) => (
          <Pressable
            key={item.id}
            style={styles.homeProductCard}
            onPress={() => {
              setProduct(item);
              go("product-detail");
            }}
          >
            <View style={styles.homeProductImageWrap}>
              <Image
                source={{ uri: produceImages[item.id] }}
                style={styles.homeProductImage}
                accessibilityLabel={`${displayNames[item.id]} product image`}
                resizeMode="cover"
              />
              {item.status === "Low" && (
                <Text style={styles.homeLowBadge}>Low stock</Text>
              )}
            </View>
            <Text numberOfLines={1} style={styles.homeProductName}>
              {displayNames[item.id]}
            </Text>
            <Text style={styles.homeProductSubtitle}>
              {item.stock.toFixed(1)} kg available
            </Text>
            <View style={styles.homeProductFooter}>
              <Text style={styles.homeProductPrice}>
                ₹ {item.price}
                <Text style={styles.homeProductUnit}> / kg</Text>
              </Text>
              <View style={styles.homeProductAdd}>
                <Text style={styles.homeProductAddText}>›</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
      {visibleProducts.length === 0 && (
        <Text style={styles.noProducts}>No matching produce found.</Text>
      )}
    </>
  );
}
function Inventory({
  go,
  setProduct,
  shop,
}: {
  go: (s: Screen) => void;
  setProduct: (p: Product) => void;
  shop: string;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Fruit" | "Vegetable" | "Low stock">("All");
  const items = products.filter((item) => {
    const searchText = search.trim().toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(searchText) ||
      item.plu.toLowerCase().includes(searchText);
    const matchesFilter =
      filter === "All" ||
      (filter === "Low stock"
        ? item.status === "Low"
        : filter === "Vegetable"
          ? item.category !== "Fruit"
          : item.category === filter);
    return matchesSearch && matchesFilter;
  });
  const lowStockCount = products.filter((item) => item.status === "Low").length;
  return (
    <>
      <View style={styles.inventorySummary}>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryKicker}>CURRENT LOCATION</Text>
          <Text style={styles.summaryTitle}>{shop}</Text>
          <Text style={styles.summaryCaption}>Fresh produce stock overview</Text>
        </View>
        <View style={styles.summaryCount}>
          <Text style={styles.summaryCountValue}>{items.length}</Text>
          <Text style={styles.summaryCountLabel}>items</Text>
        </View>
      </View>
      <View style={styles.search}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search produce or PLU"
          placeholderTextColor={activeColors.inkMuted}
          style={styles.searchInput}
        />
      </View>
      <View style={styles.filterBar}>
        {(["All", "Fruit", "Vegetable", "Low stock"] as const).map((option) => (
          <Pressable
            key={option}
            onPress={() => setFilter(option)}
            style={[styles.filterChip, filter === option && styles.filterChipActive]}
          >
            <Text
              style={[styles.filterChipText, filter === option && styles.filterChipTextActive]}
            >
              {option === "All" ? `All ${items.length}` : option === "Low stock" ? `Low ${lowStockCount}` : option}
            </Text>
          </Pressable>
        ))}
      </View>
      <Heading title="Available produce" action={`${items.length} items`} />
      <View style={styles.list}>
        {items.map((item) => (
          <ProductRow
            key={item.id}
            item={item}
            onPress={() => {
              setProduct(item);
              go("product-detail");
            }}
          />
        ))}
      </View>
    </>
  );
}
function Activity({ go }: { go: (s: Screen) => void }) {
  const [filter, setFilter] = useState<"All" | "Stock" | "Sales">("All");
  const visibleActivities = activities.filter((item) =>
    filter === "All"
      ? true
      : filter === "Sales"
        ? item.title.toLowerCase().includes("sale")
        : !item.title.toLowerCase().includes("sale"),
  );
  return (
    <>
      <View style={styles.activitySummary}>
        <View style={styles.activitySummaryIcon}>
          <Text style={styles.activitySummaryGlyph}>◷</Text>
        </View>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryKicker}>TODAY · 10 OCTOBER</Text>
          <Text style={styles.activitySummaryTitle}>Daily activity</Text>
          <Text style={styles.summaryCaption}>{activities.length} stock and machine events recorded</Text>
        </View>
      </View>
      <View style={styles.filterBar}>
        {(["All", "Stock", "Sales"] as const).map((option) => (
          <Pressable
            key={option}
            onPress={() => setFilter(option)}
            style={[styles.filterChip, filter === option && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filter === option && styles.filterChipTextActive]}>
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.dateLabel}>SATURDAY, 10 OCTOBER</Text>
      <View style={styles.list}>
        {visibleActivities.map((item) => (
          <Row
            key={item.title}
            icon={item.icon}
            title={item.title}
            subtitle={`${item.body} · ${item.time}`}
            right={
              <View style={styles.right}>
                <Text style={styles.amount}>{item.amount}</Text>
                <Pill
                  tone={
                    item.tone === "warning"
                      ? "warn"
                      : item.tone === "blue"
                        ? "blue"
                        : "good"
                  }
                >
                  {item.tone === "warning" ? "Recorded" : "Done"}
                </Pill>
              </View>
            }
            onPress={
              item.title.toLowerCase().includes("sale")
                ? () => go("sales")
                : undefined
            }
          />
        ))}
      </View>
    </>
  );
}
function More({ isAdmin, go }: { isAdmin: boolean; go: (s: Screen) => void }) {
  const menu = isAdmin ? adminMenu : shopMenu;
  return (
    <>
      <View style={styles.moreHero}>
        <View style={styles.moreHeroCopy}>
          <Text style={styles.moreKicker}>
            {isAdmin ? "ADMIN WORKSPACE" : "SHOP WORKSPACE"}
          </Text>
          <Text style={styles.moreTitle}>
            {isAdmin ? "Manage the business" : "Run your shop"}
          </Text>
          <View style={styles.moreStats}>
            <View>
              <Text style={styles.moreStatValue}>{isAdmin ? "04" : "01"}</Text>
              <Text style={styles.moreStatLabel}>{isAdmin ? "LOCATIONS" : "LOCATION"}</Text>
            </View>
            <View style={styles.moreStatDivider} />
            <View>
              <Text style={styles.moreStatValue}>
                {products.length.toString().padStart(2, "0")}
              </Text>
              <Text style={styles.moreStatLabel}>PRODUCED ITEMS</Text>
            </View>
          </View>
        </View>
        <View style={styles.moreIconWrap}>
          <Text style={styles.moreIcon}>{isAdmin ? "✦" : "⌂"}</Text>
        </View>
      </View>
      <Heading title={isAdmin ? "Management" : "Shop tools"} />
      <View style={styles.list}>
        {menu.map(([name, copy, target, icon]) => (
          <Row
            key={name}
            icon={icon}
            title={name}
            subtitle={copy}
            onPress={() => go(asScreen(target))}
          />
        ))}
      </View>
      <Heading title="Insights" />
      <View style={styles.list}>
        <Row
          icon="▤"
          title="Reports"
          subtitle="PDF-ready operational summaries"
          onPress={() => go("reports")}
        />
        <Row
          icon="!"
          title="Low-stock alerts"
          subtitle="2 products need attention"
          onPress={() => go("notifications")}
        />
        <Row
          icon="◉"
          title="My account"
          subtitle="Role, shop access and session"
          onPress={() => go("account")}
        />
      </View>
    </>
  );
}
function Opening({
  values,
  setValues,
  save,
}: {
  values: Record<string, string>;
  setValues: (v: Record<string, string>) => void;
  save: () => void;
}) {
  return (
    <>
      <Info
        title="Fresh physical count"
        copy="Counts are entered afresh each day. Production submission locks this record; corrections need administrator approval."
      />
      <View style={styles.dateCard}>
        <Text style={styles.kicker}>BUSINESS DATE</Text>
        <Text style={styles.dateValue}>Saturday, 10 October 2026</Text>
      </View>
      <Heading title="Products" action="6 items" />
      {products.map((item) => (
        <View key={item.id} style={styles.stockEntry}>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowSubtitle}>
              Previous count: {item.stock.toFixed(1)} kg
            </Text>
          </View>
          <View style={styles.stockInput}>
            <TextInput
              value={values[item.id]}
              onChangeText={(value) =>
                setValues({ ...values, [item.id]: value })
              }
              keyboardType="decimal-pad"
              style={styles.stockText}
            />
            <Text style={styles.unit}>kg</Text>
          </View>
        </View>
      ))}
      <PrimaryButton label="Submit opening stock" icon="✓" onPress={save} />
      <Text style={styles.footnote}>
        Preview only - this screen does not change inventory.
      </Text>
    </>
  );
}
function Purchases({
  go,
  save,
}: {
  go: (s: Screen) => void;
  save: () => void;
}) {
  return (
    <>
      <Text style={styles.lead}>
        Receive fresh stock into central inventory.
      </Text>
      <FormCard
        title="New purchase"
        copy="Supplier, items, rates and receiving location"
        fields={[
          ["SUPPLIER", "Fresh Farms Co."],
          ["RECEIVING LOCATION", "Central inventory"],
          ["PURCHASE DATE", "10 Oct 2026"],
        ]}
        button="Save purchase"
        onSave={save}
      />
      <Heading
        title="Recent purchases"
        action="Suppliers"
        onPress={() => go("suppliers")}
      />
      <View style={styles.list}>
        <Row
          icon="↓"
          title="Fresh Farms Co."
          subtitle="3 items · Today, 10:18 AM"
          right={<Text style={styles.amount}>₹ 4,860</Text>}
        />
        <Row
          icon="↓"
          title="Green Valley Traders"
          subtitle="2 items · Yesterday"
          right={<Text style={styles.amount}>₹ 2,130</Text>}
        />
      </View>
    </>
  );
}
function Suppliers({ go }: { go: (s: Screen) => void }) {
  return (
    <>
      <PrimaryButton label="Add supplier" icon="+" />
      <Heading title="Active suppliers" />
      <View style={styles.list}>
        <Row
          icon="FF"
          title="Fresh Farms Co."
          subtitle="12 purchases · ₹ 46,210 this month"
          onPress={() => go("purchases")}
        />
        <Row
          icon="GV"
          title="Green Valley Traders"
          subtitle="8 purchases · ₹ 31,850 this month"
          onPress={() => go("purchases")}
        />
        <Row
          icon="OS"
          title="Orchard Supply"
          subtitle="5 purchases · ₹ 17,430 this month"
        />
      </View>
      <Text style={styles.footnote}>
        Supplier payment settlement is intentionally outside V1.
      </Text>
    </>
  );
}
function Transfers({ save }: { save: () => void }) {
  return (
    <>
      <Text style={styles.lead}>
        Move stock between locations without duplicating inventory.
      </Text>
      <FormCard
        title="New transfer"
        copy="Source and destination update together."
        fields={[
          ["FROM", "Central inventory"],
          ["TO", "Shop One"],
          ["PRODUCT", "Tomato Hybrid · 8.0 kg"],
        ]}
        button="Confirm transfer"
        onSave={save}
      />
      <Heading title="Today’s transfers" />
      <View style={styles.list}>
        <Row
          icon="↗"
          title="Central inventory → Shop One"
          subtitle="Tomato Hybrid · 8.0 kg · 09:42 AM"
          right={<Pill tone="good">Completed</Pill>}
        />
        <Row
          icon="↗"
          title="Shop Two → Central inventory"
          subtitle="Apple Royal Gala · 2.5 kg · 08:20 AM"
          right={<Pill tone="good">Completed</Pill>}
        />
      </View>
    </>
  );
}
function Wastage({ save }: { save: () => void }) {
  return (
    <>
      <FormCard
        title="Record wastage"
        copy="Wastage is distinct from normal and recovery sales."
        fields={[
          ["LOCATION", "Shop Two"],
          ["PRODUCT", "Coriander"],
          ["QUANTITY", "0.5 kg"],
          ["REASON", "Quality deterioration"],
        ]}
        button="Record wastage"
        onSave={save}
      />
      <Heading title="Recent wastage" />
      <View style={styles.list}>
        <Row
          icon="⊘"
          title="Coriander"
          subtitle="0.5 kg · Shop Two · Quality deterioration"
          right={<Text style={styles.amount}>Today</Text>}
        />
        <Row
          icon="⊘"
          title="Tomato Hybrid"
          subtitle="0.8 kg · Shop One · Damaged"
          right={<Text style={styles.amount}>Yesterday</Text>}
        />
      </View>
    </>
  );
}
function Recovery({ save }: { save: () => void }) {
  return (
    <>
      <Info
        title="Reduced-price recovery sale"
        copy="Recovery rate is calculated from the configured percentage and normal selling price."
      />
      <FormCard
        title="New recovery sale"
        copy="The sale classification and rate snapshot are preserved."
        fields={[
          ["PRODUCT", "Banana Robusta"],
          ["NORMAL PRICE", "₹ 60 / kg"],
          ["RECOVERY RATE", "30% · ₹ 18 / kg"],
          ["QUANTITY", "2.0 kg"],
        ]}
        button="Record recovery sale"
        onSave={save}
      />
      <Heading title="Recent recovery sales" />
      <View style={styles.list}>
        <Row
          icon="%"
          title="Banana Robusta"
          subtitle="2.0 kg · ₹18/kg · Shop One"
          right={<Text style={styles.amount}>₹ 36</Text>}
        />
      </View>
    </>
  );
}
function Expenses({ save }: { save: () => void }) {
  return (
    <>
      <FormCard
        title="Record expense"
        copy="Choose a shop expense or business-wide cost."
        fields={[
          ["SCOPE", "Business-wide"],
          ["CATEGORY", "Transport"],
          ["AMOUNT", "₹ 850"],
          ["NOTES", "Morning wholesale delivery"],
        ]}
        button="Save expense"
        onSave={save}
      />
      <Heading title="This week" />
      <View style={styles.metricRow}>
        <Metric label="Total" value="₹ 6,430" note="14 recorded expenses" />
        <Metric label="Transport" value="₹ 2,310" note="largest category" />
      </View>
      <Heading title="Recent expenses" />
      <View style={styles.list}>
        <Row
          icon="₹"
          title="Transport"
          subtitle="Business-wide · Today"
          right={<Text style={styles.amount}>₹ 850</Text>}
        />
        <Row
          icon="₹"
          title="Electricity"
          subtitle="Shop Two · Yesterday"
          right={<Text style={styles.amount}>₹ 1,240</Text>}
        />
      </View>
    </>
  );
}
function Sales({
  go,
  setSaleId,
}: {
  go: (s: Screen) => void;
  setSaleId: (id: string) => void;
}) {
  return (
    <>
      <View style={styles.saleSummary}>
        <View>
          <Text style={styles.cardKicker}>TODAY · ACCEPTED FROM MACHINES</Text>
          <Text style={styles.salesValue}>₹ 12,460</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.bigNumber}>38</Text>
          <Text style={styles.salesSub}>receipts</Text>
        </View>
      </View>
      <View style={styles.chips}>
        <Pill tone="good">All sales</Pill>
        <Pill>Shop One</Pill>
        <Pill>Review needed</Pill>
      </View>
      <Text style={styles.dateLabel}>TODAY’S RECEIPTS</Text>
      <View style={styles.list}>
        {sales.map((sale) => (
          <Row
            key={sale.id}
            icon="⌁"
            title={`#${sale.id}`}
            subtitle={`${sale.shop} · ${sale.items} · ${sale.time}`}
            right={
              <View style={styles.right}>
                <Text style={styles.amount}>{sale.amount}</Text>
                <Pill tone={sale.status === "Review" ? "warn" : "good"}>
                  {sale.status}
                </Pill>
              </View>
            }
            onPress={() => {
              setSaleId(sale.id);
              go("sale-detail");
            }}
          />
        ))}
      </View>
      <Text style={styles.footnote}>
        Dummy receipts show the final expected view. Production will preserve
        raw device data before acceptance.
      </Text>
    </>
  );
}
function SaleDetail({ saleId }: { saleId: string }) {
  const sale = sales.find((item) => item.id === saleId) ?? sales[0];
  return (
    <>
      <View style={styles.receipt}>
        <Text style={styles.cardKicker}>MACHINE RECEIPT</Text>
        <Text style={styles.receiptNo}>#{sale.id}</Text>
        <Text style={styles.receiptMeta}>
          {sale.shop} · 10 Oct 2026 · {sale.time}
        </Text>
        <View style={styles.rule} />
        <Receipt
          name="Banana Robusta"
          detail="2.700 kg × ₹60"
          amount="₹ 162.00"
        />
        <Receipt
          name="Tomato Hybrid"
          detail="2.108 kg × ₹48"
          amount="₹ 101.20"
        />
        <View style={styles.rule} />
        <View style={styles.total}>
          <Text style={styles.totalText}>Total</Text>
          <Text style={styles.totalValue}>{sale.amount}</Text>
        </View>
        <Pill tone={sale.status === "Review" ? "warn" : "good"}>
          {sale.status === "Review"
            ? "Needs validation"
            : "Machine sync accepted"}
        </Pill>
      </View>
      <Heading title="Machine context" />
      <View style={styles.list}>
        <Row
          icon="⌁"
          title="Dahua TM-A · Shop One"
          subtitle="Device DH-TMA-01 · Statement record 4821"
        />
        <Row
          icon="✓"
          title="Inventory effect"
          subtitle="Deducted from Shop One after validation"
        />
      </View>
    </>
  );
}
function Receipt({
  name,
  detail,
  amount,
}: {
  name: string;
  detail: string;
  amount: string;
}) {
  return (
    <View style={styles.receiptRow}>
      <View>
        <Text style={styles.rowTitle}>{name}</Text>
        <Text style={styles.rowSubtitle}>{detail}</Text>
      </View>
      <Text style={styles.amount}>{amount}</Text>
    </View>
  );
}
function Alerts() {
  return (
    <>
      <Info
        title="2 low-stock products"
        copy="The V1 threshold is fixed at 5 kg per product per shop. This preview uses “at or below 5 kg”."
      />
      <View style={styles.list}>
        <Row
          icon="!"
          title="Tomato Hybrid"
          subtitle="Shop One · 4.2 kg available"
          right={<Pill tone="warn">4.2 kg</Pill>}
        />
        <Row
          icon="!"
          title="Coriander"
          subtitle="Shop Two · 3.6 kg available"
          right={<Pill tone="warn">3.6 kg</Pill>}
        />
      </View>
      <Heading title="Notification delivery" />
      <View style={styles.list}>
        <Row
          icon="◉"
          title="In-app alerts"
          subtitle="Shown to relevant shop users and administrator"
          right={<Pill tone="good">Enabled</Pill>}
        />
        <Row
          icon="⌁"
          title="Admin phone alert"
          subtitle="One configured recipient when threshold is reached"
          right={<Pill>Planned</Pill>}
        />
      </View>
    </>
  );
}
function Reports({ go }: { go: (s: Screen) => void }) {
  return (
    <>
      <Text style={styles.lead}>
        Operational reports are prepared by the backend and exported as PDFs.
      </Text>
      <View style={styles.reportPeriod}>
        <Text style={styles.kicker}>REPORT PERIOD</Text>
        <Text style={styles.periodText}>01 Oct - 10 Oct 2026</Text>
        <Text style={styles.textAction}>Change</Text>
      </View>
      <View style={styles.list}>
        {reports.map(([name, copy, target]) => (
          <Row
            key={name}
            icon="▤"
            title={name}
            subtitle={copy}
            onPress={() => go(asScreen(target))}
          />
        ))}
      </View>
    </>
  );
}
function Products({
  go,
  setProduct,
}: {
  go: (s: Screen) => void;
  setProduct: (p: Product) => void;
}) {
  return (
    <>
      <PrimaryButton label="Add product" icon="+" />
      <View style={styles.chips}>
        <Pill tone="good">Active · 31</Pill>
        <Pill>Fruit</Pill>
        <Pill>Vegetable</Pill>
        <Pressable onPress={() => go("price-history")}>
          <Text style={styles.textAction}>Price history</Text>
        </Pressable>
      </View>
      <View style={styles.list}>
        {products.map((item) => (
          <ProductRow
            key={item.id}
            item={item}
            showPrice
            onPress={() => {
              setProduct(item);
              go("product-detail");
            }}
          />
        ))}
      </View>
    </>
  );
}
function ProductDetail({
  product,
  go,
  save,
}: {
  product: Product;
  go: (s: Screen) => void;
  save: () => void;
}) {
  const [price, setPrice] = useState(product.price.toString());
  return (
    <>
      <View style={styles.productHero}>
        <Text style={styles.productLetter}>{product.name[0]}</Text>
        <View>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productSub}>
            PLU {product.plu} · {product.category} · Active
          </Text>
        </View>
      </View>
      <Heading title="Selling rules" />
      <View style={styles.formCard}>
        <Input
          label="NORMAL SELLING PRICE"
          value={price}
          setValue={setPrice}
          suffix="₹ / kg"
        />
        <Input
          label="RECOVERY PERCENTAGE"
          value={`${product.recovery}`}
          suffix="%"
        />
        <Text style={styles.greenNote}>
          Recovery selling price: ₹{" "}
          {((Number(price || 0) * product.recovery) / 100).toFixed(2)} / kg
        </Text>
        <PrimaryButton label="Save price changes" onPress={save} />
      </View>
      <Heading title="Stock and history" />
      <View style={styles.list}>
        <Row
          icon="▦"
          title={`${product.stock.toFixed(1)} kg available`}
          subtitle="Current inventory across selected location"
        />
        <Row
          icon="◷"
          title="Price history"
          subtitle="6 recorded selling-price changes"
          onPress={() => go("price-history")}
        />
      </View>
    </>
  );
}
function Input({
  label,
  value,
  setValue,
  suffix,
}: {
  label: string;
  value: string;
  setValue?: (value: string) => void;
  suffix: string;
}) {
  return (
    <View style={styles.inputBlock}>
      <Text style={styles.kicker}>{label}</Text>
      <View style={styles.inputControl}>
        <TextInput value={value} onChangeText={setValue} style={styles.input} />
        <Text style={styles.unit}>{suffix}</Text>
      </View>
    </View>
  );
}
function PriceHistory() {
  return (
    <>
      <Text style={styles.lead}>
        Historical prices remain associated with past sales.
      </Text>
      <View style={styles.list}>
        <Row
          icon="₹"
          title="Banana Robusta"
          subtitle="₹58 → ₹60 · 08 Oct · PS"
          right={<Pill tone="good">+₹2</Pill>}
        />
        <Row
          icon="₹"
          title="Tomato Hybrid"
          subtitle="₹50 → ₹48 · 06 Oct · PS"
          right={<Pill tone="warn">−₹2</Pill>}
        />
        <Row
          icon="₹"
          title="Apple Royal Gala"
          subtitle="₹210 → ₹220 · 01 Oct · PS"
          right={<Pill tone="good">+₹10</Pill>}
        />
      </View>
    </>
  );
}
function Shops() {
  return (
    <>
      <PrimaryButton label="Add shop" icon="+" />
      <Heading title="Inventory locations" />
      <View style={styles.list}>
        <Row
          icon="⌂"
          title="Central inventory"
          subtitle="Receiving location · 31 products"
          right={<Pill tone="good">Active</Pill>}
        />
        <Row
          icon="1"
          title="Shop One"
          subtitle="Sales device · 24 products"
          right={<Pill tone="good">Active</Pill>}
        />
        <Row
          icon="2"
          title="Shop Two"
          subtitle="Sales device · 22 products"
          right={<Pill tone="good">Active</Pill>}
        />
        <Row
          icon="3"
          title="Shop Three"
          subtitle="No device assigned · 19 products"
          right={<Pill>Active</Pill>}
        />
      </View>
      <Text style={styles.footnote}>
        Locations are data-driven; production is not limited to three shops.
      </Text>
    </>
  );
}
function Users() {
  return (
    <>
      <PrimaryButton label="Invite shop user" icon="+" />
      <Heading title="People with access" />
      <View style={styles.list}>
        <Row
          icon="SA"
          title="PS"
          subtitle="Administrator · all locations"
          right={<Pill tone="good">Admin</Pill>}
        />
        <Row
          icon="RK"
          title="Ravi Kumar"
          subtitle="Shop user · Shop One"
          right={<Pill>Shop One</Pill>}
        />
        <Row
          icon="AM"
          title="Asha Menon"
          subtitle="Shop user · Shop Two"
          right={<Pill>Shop Two</Pill>}
        />
      </View>
      <Text style={styles.footnote}>
        The server, not this UI, enforces role and location access.
      </Text>
    </>
  );
}
function Devices() {
  return (
    <>
      <Info
        title="Machine ingestion is protected"
        copy="Raw statements are retained, mapped by PLU and validated before they create an inventory sale."
      />
      <Heading title="Registered devices" />
      <View style={styles.list}>
        <Row
          icon="⌁"
          title="Dahua TM-A"
          subtitle="Shop One · 192.168.1.65:4001 · Last sync 08:56"
          right={<Pill tone="good">Online</Pill>}
        />
        <Row
          icon="⌁"
          title="Dahua TM-A"
          subtitle="Shop Two · 192.168.1.66:4001 · Last sync 08:51"
          right={<Pill tone="good">Online</Pill>}
        />
        <Row
          icon="⌁"
          title="Unassigned device"
          subtitle="Awaiting PLU mapping and shop assignment"
          right={<Pill tone="warn">Review</Pill>}
        />
      </View>
      <Heading title="PLU mapping" />
      <View style={styles.list}>
        <Row
          icon="#"
          title="101 → Banana Robusta"
          subtitle="Price and product validated"
        />
        <Row
          icon="#"
          title="114 → Tomato Hybrid"
          subtitle="Price and product validated"
        />
        <Row
          icon="#"
          title="141 → Coriander"
          subtitle="Price difference policy: review"
        />
      </View>
    </>
  );
}
function Adjustments({ save }: { save: () => void }) {
  return (
    <>
      <Info
        title="Administrator-only correction"
        copy="Adjustments never overwrite stock history. A reason and administrator are preserved in the audit log."
      />
      <FormCard
        title="New adjustment"
        copy="Use only after reconciling a physical count."
        fields={[
          ["LOCATION", "Shop One"],
          ["PRODUCT", "Tomato Hybrid"],
          ["QUANTITY CHANGE", "−0.6 kg"],
          ["REASON", "Verified count discrepancy"],
        ]}
        button="Record adjustment"
        onSave={save}
      />
      <Heading title="Recent adjustments" />
      <View style={styles.list}>
        <Row
          icon="±"
          title="Tomato Hybrid · −0.6 kg"
          subtitle="Shop One · Verified count discrepancy · PS"
          right={<Text style={styles.amount}>Today</Text>}
        />
      </View>
    </>
  );
}
function Audit() {
  return (
    <>
      <Text style={styles.lead}>
        Traceable events from authorised users and protected services.
      </Text>
      <View style={styles.list}>
        <Row
          icon="◷"
          title="Price changed"
          subtitle="Banana Robusta ₹58 → ₹60 · PS · 08 Oct"
        />
        <Row
          icon="◷"
          title="Opening stock submitted"
          subtitle="Shop One · 6 product lines · Ravi Kumar · 08 Oct"
        />
        <Row
          icon="◷"
          title="Machine transaction quarantined"
          subtitle="TM-004819 · Price validation review · System · Today"
        />
        <Row
          icon="◷"
          title="Stock adjustment recorded"
          subtitle="Tomato Hybrid −0.6 kg · PS · Today"
        />
      </View>
    </>
  );
}
function Account({
  role,
  setRole,
  colorMode,
  setColorMode,
  go,
}: {
  role: Role;
  setRole: (role: Role) => void;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  go: (s: Screen) => void;
}) {
  return (
    <>
      <View style={styles.accountHero}>
        <View style={styles.bigAvatar}>
          <Text style={styles.avatarText}>PS</Text>
        </View>
        <Text style={styles.accountName}>PS</Text>
        <Text style={styles.accountRole}>
          {role} · {role === "Administrator" ? "All locations" : "Shop One"}
        </Text>
      </View>
      <Heading title="Preview role" />
      <View style={styles.roleSwitch}>
        {(["Administrator", "Shop user"] as Role[]).map((item) => (
          <Pressable
            key={item}
            style={[styles.roleOption, role === item && styles.roleActive]}
            onPress={() => setRole(item)}
          >
            <Text
              style={[styles.roleText, role === item && styles.roleTextActive]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.footnote}>
        This switch is for UI review only. A real role is resolved by the
        server.
      </Text>
      <Heading title="Appearance" />
      <View style={styles.roleSwitch}>
        {(["light", "dark"] as ColorMode[]).map((mode) => (
          <Pressable
            key={mode}
            style={[styles.roleOption, colorMode === mode && styles.roleActive]}
            onPress={() => setColorMode(mode)}
          >
            <Text
              style={[
                styles.roleText,
                colorMode === mode && styles.roleTextActive,
              ]}
            >
              {mode === "light" ? "Light mode" : "Dark mode"}
            </Text>
          </Pressable>
        ))}
      </View>
      <Heading title="Account" />
      <View style={styles.list}>
        <Row
          icon="⌂"
          title="Assigned location"
          subtitle={role === "Administrator" ? "All locations" : "Shop One"}
        />
        <Row
          icon="◉"
          title="Notification preference"
          subtitle="In-app alerts enabled"
          onPress={() => go("notifications")}
        />
        <Row
          icon="?"
          title="Help & support"
          subtitle="Integration and operational support"
        />
      </View>
    </>
  );
}
function Info({ title, copy }: { title: string; copy: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoCopy}>{copy}</Text>
    </View>
  );
}

let activeColors = lightColors;
let styles = createStyles(activeColors);

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.canvas },
    page: { flex: 1 },
    header: {
      minHeight: 68,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    marketPage: { backgroundColor: colors.canvas },
    marketHeader: {
      minHeight: 62,
      paddingHorizontal: 14,
      paddingVertical: 7,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.line,
      flexDirection: "row",
      alignItems: "center",
    },
    marketLocation: { flex: 1, flexDirection: "row", alignItems: "center" },
    locationGlyph: {
      color: colors.green,
      fontFamily: typeface.bold,
      fontSize: 17,
      fontWeight: "700",
      marginRight: 5,
    },
    marketLocationCopy: { flex: 1, minWidth: 0 },
    marketTitleRow: { flexDirection: "row", alignItems: "center", gap: 3 },
    marketChevron: {
      color: colors.inkMuted,
      fontFamily: typeface.bold,
      fontSize: 13,
    },
    marketTitle: {
      color: colors.ink,
      fontFamily: typeface.extraBold,
      fontSize: 15,
    },
    marketSubtitle: {
      color: colors.inkMuted,
      fontFamily: typeface.regular,
      fontSize: 10,
      marginTop: 2,
    },
    offersButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingLeft: 8,
      gap: 4,
    },
    offersGlyph: {
      width: 14,
      height: 14,
      borderRadius: 7,
      color: colors.surface,
      backgroundColor: colors.warning,
      fontFamily: typeface.extraBold,
      fontSize: 10,
      fontWeight: "800",
      lineHeight: 14,
      textAlign: "center",
    },
    offersText: {
      color: colors.ink,
      fontFamily: typeface.semibold,
      fontSize: 12,
    },
    logo: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.lime,
      alignItems: "center",
      justifyContent: "center",
    },
    logoText: {
      fontFamily: typeface.extraBold,
      fontWeight: "900",
      fontSize: 20,
      color: colors.ink,
    },
    back: { width: 36, alignItems: "center" },
    backText: { color: colors.ink, fontSize: 39, lineHeight: 39 },
    headerCopy: { flex: 1 },
    headerTitle: {
      fontFamily: typeface.extraBold,
      color: colors.ink,
      fontWeight: "900",
      fontSize: 16,
    },
    headerSub: {
      fontFamily: font,
      color: colors.inkMuted,
      fontSize: 11,
      marginTop: 1,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.ink,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      color: colors.lime,
      fontFamily: typeface.extraBold,
      fontSize: 12,
      fontWeight: "900",
    },
    scroll: { padding: spacing.md, paddingBottom: 100 },
    marketScroll: {
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 88,
      backgroundColor: colors.canvas,
    },
    homeSearch: {
      height: 48,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      marginBottom: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 12,
    },
    homeSearchIcon: {
      color: colors.green,
      fontFamily: typeface.bold,
      fontSize: 22,
      width: 25,
      lineHeight: 25,
    },
    homeSearchInput: {
      flex: 1,
      color: colors.ink,
      fontFamily: typeface.regular,
      fontSize: 13,
      paddingVertical: 0,
    },
    homeSearchFilter: {
      color: colors.green,
      fontFamily: typeface.bold,
      fontSize: 17,
      paddingHorizontal: 4,
    },
    marketPromos: { flexDirection: "row", gap: 10 },
    marketPromo: {
      flex: 1,
      height: 108,
      borderRadius: 14,
      padding: 12,
      overflow: "hidden",
    },
    vegetablePromo: { backgroundColor: colors.green },
    fruitPromo: { backgroundColor: colors.limeDeep },
    promoTitle: {
      color: colors.surface,
      fontFamily: typeface.extraBold,
      fontSize: 17,
      maxWidth: "70%",
    },
    promoCopy: {
      color: colors.surface,
      fontFamily: typeface.regular,
      fontSize: 11,
      lineHeight: 14,
      marginTop: 4,
      maxWidth: "68%",
    },
    promoSmall: {
      color: colors.surface,
      fontFamily: typeface.regular,
      fontSize: 9,
      marginTop: 1,
    },
    promoArrow: {
      width: 16,
      height: 16,
      position: "absolute",
      bottom: 5,
      left: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    promoArrowText: {
      color: colors.surface,
      fontFamily: typeface.extraBold,
      fontSize: 16,
      fontWeight: "800",
      lineHeight: 16,
    },
    promoImage: {
      width: 78,
      height: 62,
      position: "absolute",
      right: 0,
      bottom: 0,
      borderTopLeftRadius: 18,
    },
    categoryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 14,
    },
    categoryItem: { width: "24%", alignItems: "center" },
    categoryArt: {
      width: 48,
      height: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    categoryArtActive: {
      borderWidth: 2,
      borderColor: colors.ink,
    },
    categoryEmoji: { fontSize: 23 },
    categoryLabel: {
      color: colors.ink,
      fontFamily: typeface.bold,
      fontSize: 11,
      lineHeight: 14,
      textAlign: "center",
      marginTop: 4,
      minHeight: 20,
    },
    produceHeading: {
      marginTop: 22,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    produceHeadingText: {
      color: colors.ink,
      fontFamily: typeface.extraBold,
      fontSize: 21,
    },
    produceHeadingSub: {
      color: colors.inkMuted,
      fontFamily: typeface.regular,
      fontSize: 11,
      marginTop: 2,
    },
    seeAllButton: { flexDirection: "row", alignItems: "center", gap: 4 },
    seeAllText: {
      color: colors.green,
      fontFamily: typeface.extraBold,
      fontSize: 10,
      fontWeight: "700",
    },
    seeAllArrow: {
      width: 13,
      height: 13,
      borderRadius: 7,
      backgroundColor: colors.warning,
      alignItems: "center",
      justifyContent: "center",
    },
    seeAllArrowText: {
      color: colors.surface,
      fontFamily: typeface.extraBold,
      fontSize: 12,
      fontWeight: "900",
      lineHeight: 13,
    },
    produceStrip: { gap: 7, paddingBottom: 3 },
    produceTile: {
      width: 82,
      height: 111,
      borderRadius: 5,
      overflow: "hidden",
      backgroundColor: colors.surface,
    },
    produceImage: { width: 82, height: 69, borderRadius: 5 },
    produceName: {
      color: colors.ink,
      fontFamily: typeface.bold,
      fontSize: 10,
      marginTop: 4,
    },
    producePrice: {
      color: colors.inkMuted,
      fontFamily: typeface.regular,
      fontSize: 9,
      marginTop: 2,
    },
    productsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 12,
      marginBottom: 20,
    },
    homeProductCard: {
      width: "48.7%",
      padding: 9,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 14,
      overflow: "hidden",
      shadowColor: colors.ink,
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    homeProductImageWrap: {
      width: "100%",
      height: 116,
      borderRadius: 10,
      overflow: "hidden",
      backgroundColor: colors.surfaceMuted,
    },
    homeProductImage: { width: "100%", height: "100%" },
    homeLowBadge: {
      position: "absolute",
      left: 5,
      top: 5,
      color: colors.surface,
      backgroundColor: colors.warning,
      borderRadius: 4,
      overflow: "hidden",
      paddingHorizontal: 5,
      paddingVertical: 3,
      fontFamily: typeface.bold,
      fontSize: 8,
      fontWeight: "700",
    },
    homeProductName: {
      color: colors.ink,
      fontFamily: typeface.bold,
      fontSize: 14,
      marginTop: 7,
    },
    homeProductSubtitle: {
      color: colors.inkMuted,
      fontFamily: typeface.regular,
      fontSize: 11,
      marginTop: 2,
    },
    homeProductFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 6,
    },
    homeProductPrice: {
      color: colors.ink,
      fontFamily: typeface.extraBold,
      fontSize: 13,
      fontWeight: "800",
    },
    homeProductUnit: {
      color: colors.inkMuted,
      fontSize: 10,
      fontFamily: typeface.regular,
    },
    homeProductAdd: {
      width: 29,
      height: 27,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.green,
      backgroundColor: colors.greenSoft,
    },
    homeProductAddText: {
      color: colors.green,
      fontFamily: typeface.extraBold,
      fontSize: 17,
      lineHeight: 18,
      fontWeight: "800",
    },
    noProducts: {
      color: colors.inkMuted,
      textAlign: "center",
      fontFamily: typeface.semibold,
      fontSize: 12,
      paddingVertical: 28,
    },
    inventorySummary: {
      minHeight: 94,
      marginBottom: spacing.md,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.greenSoft,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    summaryCopy: { flex: 1, minWidth: 0 },
    summaryKicker: {
      color: colors.green,
      fontFamily: typeface.extraBold,
      fontSize: 9,
      letterSpacing: 0.8,
    },
    summaryTitle: {
      color: colors.ink,
      fontFamily: typeface.extraBold,
      fontSize: 18,
      marginTop: 3,
    },
    summaryCaption: {
      color: colors.inkMuted,
      fontFamily: font,
      fontSize: 10,
      marginTop: 2,
    },
    summaryCount: {
      width: 54,
      height: 54,
      marginLeft: spacing.sm,
      borderRadius: 15,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    summaryCountValue: {
      color: colors.ink,
      fontFamily: typeface.extraBold,
      fontSize: 20,
      lineHeight: 22,
    },
    summaryCountLabel: {
      color: colors.inkMuted,
      fontFamily: typeface.semibold,
      fontSize: 9,
    },
    filterBar: {
      flexDirection: "row",
      gap: spacing.xs,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    filterChip: {
      minHeight: 34,
      paddingHorizontal: 11,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    filterChipActive: {
      borderColor: colors.green,
      backgroundColor: colors.greenSoft,
    },
    filterChipText: {
      color: colors.inkMuted,
      fontFamily: typeface.semibold,
      fontSize: 10,
    },
    filterChipTextActive: {
      color: colors.green,
      fontFamily: typeface.extraBold,
    },
    activitySummary: {
      minHeight: 96,
      marginBottom: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.blueSoft,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    activitySummaryIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    activitySummaryGlyph: {
      color: colors.blue,
      fontFamily: typeface.bold,
      fontSize: 23,
    },
    activitySummaryTitle: {
      color: colors.ink,
      fontFamily: typeface.extraBold,
      fontSize: 17,
      marginTop: 2,
    },
    welcome: {
      marginTop: spacing.sm,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    kicker: {
      color: colors.inkMuted,
      fontFamily: font,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1,
    },
    hero: {
      color: colors.ink,
      fontFamily: font,
      fontWeight: "900",
      fontSize: 28,
      letterSpacing: -0.8,
      marginTop: 4,
    },
    heading: {
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headingText: {
      color: colors.ink,
      fontFamily: typeface.extraBold,
      fontSize: 19,
      fontWeight: "900",
      letterSpacing: -0.4,
    },
    textAction: {
      color: colors.green,
      fontFamily: typeface.bold,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },
    salesCard: {
      backgroundColor: colors.lime,
      borderRadius: radius.lg,
      padding: spacing.lg,
      minHeight: 136,
      marginTop: spacing.lg,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    cardKicker: {
      color: colors.limeDeep,
      fontFamily: typeface.extraBold,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1,
    },
    salesValue: {
      color: colors.ink,
      fontFamily: typeface.extraBold,
      fontSize: 32,
      fontWeight: "900",
      letterSpacing: -1,
      marginTop: 5,
    },
    salesSub: {
      color: colors.limeDeep,
      fontFamily: font,
      fontSize: 11,
      marginTop: 4,
    },
    salesChange: { alignSelf: "flex-end", alignItems: "flex-end" },
    salesChangeValue: {
      color: colors.ink,
      fontFamily: typeface.extraBold,
      fontSize: 17,
      fontWeight: "900",
    },
    quickPanel: {
      marginTop: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.line,
      shadowColor: colors.ink,
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5,
    },
    quickPanelHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    quickPanelTitle: {
      color: colors.ink,
      fontFamily: typeface.extraBold,
      fontSize: 18,
      fontWeight: "900",
    },
    quickPanelLink: {
      color: colors.green,
      fontFamily: typeface.bold,
      fontSize: 11,
      fontWeight: "900",
    },
    quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    quick: {
      width: "31.8%",
      minHeight: 94,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      padding: spacing.sm,
      justifyContent: "space-between",
      shadowColor: colors.ink,
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    quickIcon: {
      overflow: "hidden",
      width: 32,
      height: 32,
      borderRadius: 11,
      backgroundColor: colors.greenSoft,
      textAlign: "center",
      paddingTop: 5,
      color: colors.ink,
      fontFamily: font,
      fontSize: 16,
      fontWeight: "900",
    },
    quickText: {
      color: colors.ink,
      fontFamily: typeface.bold,
      fontSize: 11,
      fontWeight: "900",
      lineHeight: 15,
    },
    alert: {
      padding: spacing.md,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.warningSoft,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      shadowColor: colors.ink,
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    alertCount: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.warning,
      justifyContent: "center",
      alignItems: "center",
    },
    alertCountText: {
      color: colors.surface,
      fontWeight: "900",
      fontFamily: typeface.extraBold,
    },
    alertTitle: {
      color: colors.ink,
      fontSize: 14,
      fontFamily: typeface.extraBold,
      fontWeight: "900",
    },
    alertCopy: {
      color: colors.inkMuted,
      fontSize: 11,
      marginTop: 3,
      lineHeight: 16,
      fontFamily: font,
    },
    metricRow: { flexDirection: "row", gap: spacing.sm },
    metric: {
      flex: 1,
      padding: spacing.md,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      shadowColor: colors.ink,
      shadowOpacity: 0.04,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    metricLabel: {
      color: colors.inkMuted,
      fontFamily: typeface.bold,
      fontSize: 10,
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    metricValue: {
      color: colors.ink,
      fontFamily: typeface.extraBold,
      fontWeight: "900",
      fontSize: 24,
      marginTop: 7,
    },
    metricNote: {
      color: colors.inkMuted,
      fontFamily: font,
      fontSize: 10,
      marginTop: 3,
    },
    list: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 18,
      overflow: "hidden",
      shadowColor: colors.ink,
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    row: {
      minHeight: 70,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.line,
      backgroundColor: colors.surface,
    },
    rowIcon: {
      width: 33,
      height: 33,
      borderRadius: 12,
      backgroundColor: colors.greenSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    rowIconText: {
      color: colors.green,
      fontFamily: typeface.extraBold,
      fontWeight: "900",
      fontSize: 11,
    },
    rowCopy: { flex: 1, minWidth: 0 },
    rowTitle: {
      color: colors.ink,
      fontFamily: typeface.bold,
      fontSize: 14,
      fontWeight: "900",
    },
    rowSubtitle: {
      color: colors.inkMuted,
      fontFamily: font,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 2,
    },
    chevron: { color: colors.inkMuted, fontSize: 25, lineHeight: 25 },
    productRight: { alignItems: "flex-end", gap: 3 },
    stock: {
      color: colors.ink,
      fontFamily: typeface.extraBold,
      fontSize: 12,
      fontWeight: "900",
    },
    mutedSmall: { color: colors.inkMuted, fontFamily: font, fontSize: 10 },
    pill: {
      overflow: "hidden",
      borderRadius: radius.pill,
      paddingHorizontal: 7,
      paddingVertical: 3,
      fontFamily: typeface.bold,
      fontSize: 9,
      fontWeight: "900",
    },
    pillNeutral: {
      backgroundColor: colors.surfaceMuted,
      color: colors.inkMuted,
    },
    pillGood: { backgroundColor: colors.greenSoft, color: colors.green },
    pillWarn: { backgroundColor: colors.warningSoft, color: colors.warning },
    pillBlue: { backgroundColor: colors.blueSoft, color: colors.blue },
    nav: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      minHeight: 70,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderColor: colors.line,
      flexDirection: "row",
      justifyContent: "space-around",
      paddingTop: 8,
    },
    navItem: { minWidth: 58, alignItems: "center" },
    navIcon: {
      color: colors.inkMuted,
      fontFamily: font,
      fontSize: 19,
      height: 25,
    },
    navActive: { color: colors.green, fontWeight: "900" },
    navText: { color: colors.inkMuted, fontFamily: typeface.semibold, fontSize: 10 },
    navTextActive: { color: colors.green, fontFamily: typeface.bold },
    lead: {
      color: colors.inkMuted,
      fontFamily: font,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: spacing.md,
    },
    search: { 
      minHeight: 47,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.sm,
    },
    searchIcon: { color: colors.inkMuted, fontSize: 21 },
    searchInput: { flex: 1, color: colors.ink, fontFamily: font, fontSize: 14 },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
      alignItems: "center",
      marginVertical: spacing.md,
    },
    dateLabel: {
      color: colors.inkMuted,
      fontFamily: typeface.bold,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1,
      marginBottom: spacing.sm,
    },
    right: { alignItems: "flex-end", gap: 4 },
    amount: {
      color: colors.ink,
      fontFamily: typeface.extraBold,
      fontSize: 13,
      fontWeight: "900",
    },
    moreHero: {
      padding: spacing.lg,
      minHeight: 166,
      borderRadius: radius.lg,
      backgroundColor: colors.ink,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    moreHeroCopy: { flex: 1 },
    moreKicker: {
      color: colors.lime,
      fontFamily: typeface.bold,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1,
    },
    moreTitle: {
      color: colors.surface,
      fontFamily: typeface.extraBold,
      fontSize: 24,
      fontWeight: "900",
      marginTop: 6,
    },
    moreStats: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginTop: spacing.md,
    },
    moreStatValue: {
      color: colors.surface,
      fontFamily: typeface.extraBold,
      fontSize: 16,
    },
    moreStatLabel: {
      color: colors.lime,
      fontFamily: typeface.bold,
      fontSize: 8,
      marginTop: 1,
    },
    moreStatDivider: {
      width: 1,
      height: 27,
      backgroundColor: colors.green,
    },
    moreIconWrap: {
      width: 42,
      height: 42,
      marginLeft: spacing.sm,
      borderRadius: 14,
      backgroundColor: colors.green,
      alignItems: "center",
      justifyContent: "center",
    },
    moreIcon: { color: colors.lime, fontSize: 26 },
    info: {
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.blueSoft,
      marginBottom: spacing.md,
    },
    infoTitle: {
      color: colors.ink,
      fontFamily: typeface.bold,
      fontSize: 14,
      fontWeight: "900",
    },
    infoCopy: {
      color: colors.blue,
      fontFamily: font,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
    },
    dateCard: {
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
    },
    dateValue: {
      color: colors.ink,
      fontFamily: typeface.bold,
      fontSize: 15,
      fontWeight: "900",
      marginTop: 5,
    },
    stockEntry: {
      minHeight: 68,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.line,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    stockInput: {
      width: 105,
      minHeight: 40,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      paddingHorizontal: 8,
      flexDirection: "row",
      alignItems: "center",
    },
    stockText: {
      flex: 1,
      textAlign: "right",
      color: colors.ink,
      fontFamily: typeface.bold,
      fontWeight: "900",
    },
    unit: {
      color: colors.inkMuted,
      fontFamily: font,
      fontSize: 11,
      marginLeft: 5,
    },
    primary: {
      marginTop: spacing.lg,
      minHeight: 50,
      borderRadius: radius.sm,
      backgroundColor: colors.ink,
      justifyContent: "center",
      alignItems: "center",
    },
    primaryText: {
      color: colors.lime,
      fontFamily: typeface.extraBold,
      fontSize: 14,
      fontWeight: "900",
    },
    footnote: {
      color: colors.inkMuted,
      fontFamily: font,
      fontSize: 11,
      lineHeight: 17,
      marginTop: spacing.md,
    },
    formCard: {
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
    },
    formTitle: {
      color: colors.ink,
      fontFamily: typeface.extraBold,
      fontSize: 19,
      fontWeight: "900",
    },
    formCopy: {
      color: colors.inkMuted,
      fontFamily: font,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 3,
      marginBottom: spacing.sm,
    },
    formLine: {
      minHeight: 47,
      flexDirection: "row",
      alignItems: "center",
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: colors.line,
    },
    formLabel: {
      width: "40%",
      color: colors.inkMuted,
      fontFamily: typeface.bold,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 0.6,
    },
    formValue: {
      flex: 1,
      color: colors.ink,
      fontFamily: typeface.semibold,
      fontSize: 12,
      fontWeight: "800",
    },
    saleSummary: {
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: colors.yellow,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    bigNumber: {
      color: colors.ink,
      fontFamily: typeface.extraBold,
      fontSize: 24,
      fontWeight: "900",
    },
    receipt: {
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
    },
    receiptNo: {
      color: colors.ink,
      fontFamily: typeface.extraBold,
      fontSize: 29,
      fontWeight: "900",
      marginTop: 6,
    },
    receiptMeta: {
      color: colors.inkMuted,
      fontFamily: font,
      fontSize: 12,
      marginTop: 4,
    },
    rule: {
      height: 1,
      backgroundColor: colors.line,
      marginVertical: spacing.md,
    },
    receiptRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    total: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: spacing.md,
    },
    totalText: {
      color: colors.ink,
      fontFamily: typeface.bold,
      fontSize: 16,
      fontWeight: "900",
    },
    totalValue: {
      color: colors.ink,
      fontFamily: typeface.extraBold,
      fontSize: 21,
      fontWeight: "900",
    },
    reportPeriod: {
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    periodText: {
      color: colors.ink,
      fontFamily: typeface.bold,
      fontSize: 12,
      fontWeight: "900",
      flex: 1,
    },
    productHero: {
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: colors.lime,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    productLetter: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: colors.yellowSoft,
      paddingTop: 12,
      textAlign: "center",
      color: colors.ink,
      fontFamily: font,
      fontSize: 19,
      fontWeight: "900",
    },
    productName: {
      color: colors.ink,
      fontFamily: typeface.extraBold,
      fontSize: 21,
      fontWeight: "900",
    },
    productSub: {
      color: colors.limeDeep,
      fontFamily: font,
      fontSize: 11,
      marginTop: 4,
    },
    inputBlock: { marginBottom: spacing.md },
    inputControl: {
      minHeight: 42,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      marginTop: 5,
    },
    input: {
      flex: 1,
      color: colors.ink,
      fontFamily: font,
      fontSize: 15,
      fontWeight: "900",
    },
    greenNote: {
      color: colors.green,
      fontFamily: font,
      fontSize: 12,
      fontWeight: "800",
    },
    accountHero: {
      alignItems: "center",
      paddingVertical: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
    },
    bigAvatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.ink,
      alignItems: "center",
      justifyContent: "center",
    },
    accountName: {
      color: colors.ink,
      fontFamily: typeface.extraBold,
      fontSize: 22,
      fontWeight: "900",
      marginTop: spacing.sm,
    },
    accountRole: {
      color: colors.inkMuted,
      fontFamily: font,
      fontSize: 12,
      marginTop: 3,
    },
    roleSwitch: { flexDirection: "row", gap: 8 },
    roleOption: {
      flex: 1,
      borderRadius: radius.sm,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: colors.surfaceMuted,
    },
    roleActive: { backgroundColor: colors.lime },
    roleText: {
      color: colors.inkMuted,
      fontFamily: typeface.bold,
      fontSize: 12,
      fontWeight: "900",
    },
    roleTextActive: { color: colors.ink },
    toast: {
      backgroundColor: colors.green,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 11,
      marginBottom: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    toastText: {
      color: colors.surface,
      fontFamily: typeface.bold,
      fontSize: 12,
      fontWeight: "800",
      flex: 1,
    },
    toastX: { color: colors.surface, fontSize: 20 },
    scrim: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: `${colors.ink}66`,
    },
    sheet: {
      padding: spacing.lg,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      backgroundColor: colors.surface,
    },
    handle: {
      width: 38,
      height: 4,
      borderRadius: 4,
      backgroundColor: colors.line,
      alignSelf: "center",
      marginBottom: spacing.md,
    },
    sheetTitle: {
      color: colors.ink,
      fontFamily: typeface.extraBold,
      fontSize: 21,
      fontWeight: "900",
    },
    sheetCopy: {
      color: colors.inkMuted,
      fontFamily: font,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
    },
    location: {
      minHeight: 48,
      marginTop: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.line,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    locationText: {
      color: colors.ink,
      fontFamily: typeface.bold,
      fontSize: 14,
      fontWeight: "800",
    },
    check: { color: colors.green, fontSize: 18, fontWeight: "900" },
    cancel: {
      color: colors.inkMuted,
      fontFamily: typeface.semibold,
      fontSize: 14,
      fontWeight: "900",
      textAlign: "center",
      paddingTop: spacing.lg,
    },
  });
}
